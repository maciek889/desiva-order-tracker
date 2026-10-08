import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, errorResponse, apiHandler, ApiError } from "@/lib/utils";
import { emitEvent } from "@/lib/events";

export const POST = apiHandler(async (req) => {
  const user = await requireAuth(["Worker"]);
  const { orderId } = await req.json();
  if (!orderId || typeof orderId !== "string") return errorResponse("orderId jest wymagane");

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { stage: true } });
    if (!order || order.status !== "active") throw new ApiError("Zamówienie nie znalezione", 404);
    // Workers may only complete production stages, never office stages
    if (order.stage.type !== "factory") throw new ApiError("Ten etap nie jest etapem produkcji", 403);

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

    // Positions can have gaps (e.g. after a stage is deleted), so take the next higher one
    const nextStage = await tx.stage.findFirst({
      where: { position: { gt: order.stage.position } },
      orderBy: { position: "asc" },
    });

    // Only advance if nobody else moved or completed the order in the meantime
    const unchanged = { id: orderId, stageId: order.stageId, status: "active" as const };

    if (nextStage) {
      const { count } = await tx.order.updateMany({ where: unchanged, data: { stageId: nextStage.id } });
      if (count === 0) throw new ApiError("Zamówienie zostało już przeniesione", 409);
      return { moved: true, nextStage: nextStage.name };
    } else {
      const allEntries = await tx.timeEntry.findMany({
        where: { orderId }, include: { stage: true },
      });
      const officeTime = allEntries.filter(e => e.stage.type === "office").reduce((s, e) => s + e.duration, 0);
      const factoryTime = allEntries.filter(e => e.stage.type === "factory").reduce((s, e) => s + e.duration, 0);
      const totalCost = allEntries.reduce((s, e) => s + e.cost, 0);

      const { count } = await tx.order.updateMany({
        where: unchanged,
        data: { status: "completed", completedAt: new Date(), totalOfficeTime: officeTime, totalFactoryTime: factoryTime, totalCost },
      });
      if (count === 0) throw new ApiError("Zamówienie zostało już przeniesione", 409);
      return { moved: false, completed: true };
    }
  });

  emitEvent("timers:changed");
  emitEvent("orders:changed");
  return jsonResponse(result);
});
