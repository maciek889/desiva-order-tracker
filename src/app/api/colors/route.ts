import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, errorResponse, apiHandler } from "@/lib/utils";

export const GET = apiHandler(async () => {
  await requireAuth();
  const colors = await prisma.color.findMany({ orderBy: { name: "asc" } });
  return jsonResponse(colors);
});

export const POST = apiHandler(async (req) => {
  await requireAuth(["Admin"]);
  const { name } = await req.json();
  if (!name || typeof name !== "string") return errorResponse("Nazwa koloru jest wymagana");
  const color = await prisma.color.create({ data: { name } });
  return jsonResponse(color, 201);
});

export const DELETE = apiHandler(async (req) => {
  await requireAuth(["Admin"]);
  const { id } = await req.json();
  const orderCount = await prisma.order.count({ where: { colorId: id } });
  if (orderCount > 0) {
    return errorResponse(`Nie można usunąć koloru — ${orderCount} zamówień go używa`, 409);
  }
  await prisma.color.delete({ where: { id } });
  return jsonResponse({ ok: true });
});
