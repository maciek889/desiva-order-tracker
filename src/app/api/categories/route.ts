import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, errorResponse, apiHandler } from "@/lib/utils";

export const GET = apiHandler(async () => {
  await requireAuth();
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return jsonResponse(categories);
});

export const POST = apiHandler(async (req) => {
  await requireAuth(["Admin"]);
  const { name } = await req.json();
  if (!name || typeof name !== "string") return errorResponse("Nazwa kategorii jest wymagana");
  const category = await prisma.category.create({ data: { name } });
  return jsonResponse(category, 201);
});

export const PUT = apiHandler(async (req) => {
  await requireAuth(["Admin"]);
  const { id, name } = await req.json();
  if (!id) return errorResponse("ID jest wymagane");
  if (!name || typeof name !== "string") return errorResponse("Nazwa kategorii jest wymagana");
  const category = await prisma.category.update({ where: { id }, data: { name } });
  return jsonResponse(category);
});

export const DELETE = apiHandler(async (req) => {
  await requireAuth(["Admin"]);
  const { id } = await req.json();
  const orderCount = await prisma.order.count({ where: { categoryId: id } });
  if (orderCount > 0) {
    return errorResponse(`Nie można usunąć kategorii — ${orderCount} zamówień ją używa`, 409);
  }
  await prisma.category.delete({ where: { id } });
  return jsonResponse({ ok: true });
});
