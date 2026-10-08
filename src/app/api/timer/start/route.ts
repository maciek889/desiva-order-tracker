import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, errorResponse, apiHandler } from "@/lib/utils";
import { emitEvent } from "@/lib/events";

export const POST = apiHandler(async (req) => {
  const user = await requireAuth(["Worker"]);
  const { orderId } = await req.json();
  if (!orderId || typeof orderId !== "string") return errorResponse("orderId jest wymagane");

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { stage: true } });
  if (!order || order.status !== "active") return errorResponse("Zamówienie nie znalezione", 404);
  if (order.stage.type !== "factory") return errorResponse("Ten etap nie jest etapem produkcji", 403);

  const entry = await prisma.$transaction(async (tx) => {
    const existing = await tx.timeEntry.findFirst({
      where: { userId: user.id, orderId, isActive: true },
    });
    if (existing) return null;

    return tx.timeEntry.create({
      data: { orderId, stageId: order.stageId, userId: user.id, startedAt: new Date(), isActive: true },
    });
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });

  if (!entry) return errorResponse("Timer już aktywny dla tego zamówienia");
  emitEvent("timers:changed");
  return jsonResponse(entry, 201);
});
