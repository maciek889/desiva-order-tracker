import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, apiHandler } from "@/lib/utils";

export const GET = apiHandler(async () => {
  await requireAuth(["Admin", "Office", "Worker"]);
  const active = await prisma.timeEntry.findMany({
    where: { isActive: true },
    select: {
      id: true,
      orderId: true,
      stageId: true,
      startedAt: true,
      user: { select: { id: true, login: true } },
    },
  });
  return jsonResponse(active);
});
