import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, apiHandler, redactOrder } from "@/lib/utils";

export const GET = apiHandler(async () => {
  const user = await requireAuth(["Worker"]);
  const active = await prisma.timeEntry.findMany({
    where: { userId: user.id, isActive: true },
    include: { order: true, stage: true },
  });
  return jsonResponse(active.map((t) => ({ ...t, order: redactOrder(t.order, user.role) })));
});
