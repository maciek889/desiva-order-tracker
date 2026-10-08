import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, errorResponse, apiHandler, ApiError } from "@/lib/utils";
import { emitEvent } from "@/lib/events";

export const POST = apiHandler(async (req) => {
  const user = await requireAuth(["Worker"]);
  const { orderId } = await req.json();
  if (!orderId || typeof orderId !== "string") return errorResponse("orderId jest wymagane");

  const result = await prisma.$transaction(async (tx) => {
    const activeEntry = await tx.timeEntry.findFirst({
      where: { userId: user.id, orderId, isActive: true },
    });
    if (activeEntry) {
      const dbUser = await tx.user.findUnique({ where: { id: user.id } });
      if (!dbUser) throw new ApiError("Użytkownik nie znaleziony", 404);
      const now = new Date();
      const durationMinutes = (now.getTime() - activeEntry.startedAt.getTime()) / 60000;
      const cost = (durationMinutes / 60) * dbUser.hourlyRate;
      await tx.timeEntry.update({
        where: { id: activeEntry.id },
        data: { endedAt: now, duration: durationMinutes, cost, isActive: false },
      });
    }

    const order = await tx.order.findUnique({ where: { id: orderId }, include: { stage: true } });
    if (!order) throw new ApiError("Zamówienie nie znalezione", 404);

    const nextStage = await tx.stage.findFirst({
      where: { position: order.stage.position + 1 },
    });

    if (nextStage) {
      await tx.order.update({ where: { id: orderId }, data: { stageId: nextStage.id } });
      return { moved: true, nextStage: nextStage.name };
    } else {
      const allEntries = await tx.timeEntry.findMany({
        where: { orderId }, include: { stage: true },
      });
      const officeTime = allEntries.filter(e => e.stage.type === "office").reduce((s, e) => s + e.duration, 0);
      const factoryTime = allEntries.filter(e => e.stage.type === "factory").reduce((s, e) => s + e.duration, 0);
      const totalCost = allEntries.reduce((s, e) => s + e.cost, 0);

      await tx.order.update({
        where: { id: orderId },
        data: { status: "completed", completedAt: new Date(), totalOfficeTime: officeTime, totalFactoryTime: factoryTime, totalCost },
      });
      return { moved: false, completed: true };
    }
  });

  emitEvent("timers:changed");
  emitEvent("orders:changed");
  return jsonResponse(result);
});
