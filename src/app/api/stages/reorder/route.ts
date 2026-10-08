import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, errorResponse, apiHandler } from "@/lib/utils";

export const PUT = apiHandler(async (req) => {
  await requireAuth(["Admin"]);

  const body = await req.json();
  const stageIds = Array.isArray(body) ? body : body?.stageIds ?? body?.ids;

  if (!Array.isArray(stageIds) || stageIds.some((id) => typeof id !== "string")) {
    return errorResponse("Lista etapow jest wymagana");
  }

  const uniqueIds = new Set(stageIds);
  if (uniqueIds.size !== stageIds.length) {
    return errorResponse("Lista etapow zawiera duplikaty");
  }

  const currentStages = await prisma.stage.findMany({
    select: { id: true, position: true },
    orderBy: { position: "asc" },
  });

  if (currentStages.length !== stageIds.length || currentStages.some((stage) => !uniqueIds.has(stage.id))) {
    return errorResponse("Lista etapow musi zawierac wszystkie istniejace etapy", 400);
  }

  const minPosition = currentStages.reduce((min, stage) => Math.min(min, stage.position), 0);
  const tempBase = minPosition - stageIds.length - 1;

  const updates = [
    ...stageIds.map((id, index) =>
      prisma.stage.update({
        where: { id },
        data: { position: tempBase + index },
      })
    ),
    ...stageIds.map((id, index) =>
      prisma.stage.update({
        where: { id },
        data: { position: index + 1 },
      })
    ),
  ];

  await prisma.$transaction(updates);

  const stages = await prisma.stage.findMany({ orderBy: { position: "asc" } });
  return jsonResponse(stages);
});

export const POST = PUT;
