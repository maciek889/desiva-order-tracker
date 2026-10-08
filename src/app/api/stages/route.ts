import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, errorResponse, apiHandler } from "@/lib/utils";

export const GET = apiHandler(async () => {
  await requireAuth();
  const stages = await prisma.stage.findMany({ orderBy: { position: "asc" } });
  return jsonResponse(stages);
});

export const POST = apiHandler(async (req) => {
  await requireAuth(["Admin"]);
  const { name, nameEn, type } = await req.json();
  if (!name || typeof name !== "string") return errorResponse("Nazwa etapu jest wymagana");
  if (type && !["office", "factory"].includes(type)) return errorResponse("Nieprawidłowy typ etapu");
  const maxPos = await prisma.stage.aggregate({ _max: { position: true } });
  const stage = await prisma.stage.create({
    data: { name, nameEn: nameEn || "", type: type || "factory", position: (maxPos._max.position || 0) + 1 },
  });
  return jsonResponse(stage, 201);
});

export const PUT = apiHandler(async (req) => {
  await requireAuth(["Admin"]);
  const { id, name, nameEn, type, position } = await req.json();
  if (!id) return errorResponse("ID jest wymagane");
  if (!name || typeof name !== "string") return errorResponse("Nazwa etapu jest wymagana");
  if (type && !["office", "factory"].includes(type)) return errorResponse("Nieprawidłowy typ etapu");
  const stage = await prisma.stage.update({
    where: { id },
    data: { name, nameEn, type, position },
  });
  return jsonResponse(stage);
});

export const DELETE = apiHandler(async (req) => {
  await requireAuth(["Admin"]);
  const { id } = await req.json();
  const orderCount = await prisma.order.count({ where: { stageId: id } });
  if (orderCount > 0) {
    return errorResponse(`Nie można usunąć etapu — ${orderCount} zamówień go używa`, 409);
  }
  await prisma.stage.delete({ where: { id } });
  return jsonResponse({ ok: true });
});
