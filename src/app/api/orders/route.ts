import { Prisma, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, errorResponse, generateOrderId, apiHandler, redactOrder } from "@/lib/utils";
import { emitEvent } from "@/lib/events";

export const GET = apiHandler(async (req) => {
  const user = await requireAuth();
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "active";
  if (!Object.values(OrderStatus).includes(status as OrderStatus)) return errorResponse("Nieprawidłowy status");
  const search = url.searchParams.get("search") || "";

  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const rawLimit = parseInt(url.searchParams.get("limit") || "50");
  // Allow limit=0 to fetch all (for Kanban), otherwise cap at 500
  const limit = rawLimit === 0 ? 0 : Math.min(500, Math.max(1, rawLimit));

  const where: Prisma.OrderWhereInput = { status: status as OrderStatus };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' as const } },
      { id: { contains: search, mode: 'insensitive' as const } },
      { internalCode: { contains: search, mode: 'insensitive' as const } },
    ];
    // Workers can't see client names, so they can't search by them either
    if (user.role !== "Worker") {
      where.OR.push({ client: { contains: search, mode: 'insensitive' as const } });
    }
  }

  const findManyArgs: Parameters<typeof prisma.order.findMany>[0] = {
    where,
    include: { stage: true, color: true, category: true, files: true },
    orderBy: { createdAt: "desc" as const },
  };
  if (limit > 0) {
    findManyArgs.skip = (page - 1) * limit;
    findManyArgs.take = limit;
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany(findManyArgs),
    prisma.order.count({ where }),
  ]);
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;
  return jsonResponse({
    orders: orders.map((o) => redactOrder(o, user.role)),
    total, page, limit: limit || total, totalPages,
  });
});

export const POST = apiHandler(async (req) => {
  const user = await requireAuth(["Admin", "Office"]);
  const body = await req.json();
  const { name, price, client, colorId, stageId, categoryId, uwagi, notatki, dueDate, internalCode, isCustomOrder } = body;

  if (!name || price == null || !client || !colorId || !stageId || !categoryId) {
    return errorResponse("Wszystkie pola są wymagane");
  }
  if (typeof name !== "string" || name.length > 200) return errorResponse("Nieprawidłowa nazwa");
  if (typeof client !== "string" || client.length > 200) return errorResponse("Nieprawidłowy klient");
  if (uwagi != null && typeof uwagi !== "string") return errorResponse("Nieprawidłowe uwagi");
  if (notatki != null && typeof notatki !== "string") return errorResponse("Nieprawidłowe notatki");
  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice) || parsedPrice < 0) return errorResponse("Nieprawidłowa cena");

  const order = await prisma.order.create({
    data: {
      id: generateOrderId(),
      name,
      price: parsedPrice,
      client,
      colorId,
      stageId,
      categoryId,
      uwagi: (uwagi || "").slice(0, 300),
      notatki: (notatki || "").slice(0, 300),
      internalCode: internalCode || null,
      isCustomOrder: isCustomOrder === true,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
    include: { stage: true, color: true, category: true, files: true },
  });

  emitEvent("orders:changed");
  return jsonResponse(redactOrder(order, user.role), 201);
});
