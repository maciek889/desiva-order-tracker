import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, errorResponse, apiHandler } from "@/lib/utils";
import { emitEvent } from "@/lib/events";

export const POST = apiHandler(async (req) => {
  const user = await requireAuth(["Worker"]);
  const { orderId } = await req.json();
  if (!orderId || typeof orderId !== "string") return errorResponse("orderId jest wymagane");

  const entry = await prisma.timeEntry.findFirst({
    where: { userId: user.id, orderId, isActive: true },
  });
  if (!entry) return errorResponse("Brak aktywnego timera");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return errorResponse("Użytkownik nie znaleziony", 404);

  const now = new Date();
  const durationMinutes = (now.getTime() - entry.startedAt.getTime()) / 60000;
  const cost = (durationMinutes / 60) * dbUser.hourlyRate;

  const updated = await prisma.timeEntry.update({
    where: { id: entry.id },
    data: { endedAt: now, duration: durationMinutes, cost, isActive: false },
  });
  emitEvent("timers:changed");
  return jsonResponse(updated);
});
