import { Prisma, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, errorResponse, apiHandler, ApiError, redactOrder } from "@/lib/utils";
import { emitEvent } from "@/lib/events";
import { ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET } from "@/lib/r2";

export const GET = apiHandler(async (_req, { params }) => {
  const user = await requireAuth();
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      stage: true, color: true, category: true, files: true,
      timeEntries: { include: { user: { select: { id: true, login: true } }, stage: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) return errorResponse("Zamówienie nie znalezione", 404);
  return jsonResponse(redactOrder(order, user.role));
});

export const PATCH = apiHandler(async (req, { params }) => {
  await requireAuth(["Admin", "Office"]);
  const { id } = await params;
  const body = await req.json();
  const { name, price, client, colorId, stageId, categoryId, status, uwagi, notatki, dueDate, internalCode, isCustomOrder } = body;

  const data: Prisma.OrderUpdateInput = {};
  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) throw new ApiError("Nazwa nie może być pusta");
    data.name = name.trim();
  }
  if (price !== undefined) {
    const parsed = parseFloat(price);
    if (isNaN(parsed) || parsed < 0) throw new ApiError("Cena musi być liczbą >= 0");
    data.price = parsed;
  }
  if (client !== undefined) data.client = client;
  if (colorId !== undefined) data.color = { connect: { id: colorId } };
  if (stageId !== undefined) data.stage = { connect: { id: stageId } };
  if (categoryId !== undefined) data.category = { connect: { id: categoryId } };
  if (status !== undefined) {
    if (!Object.values(OrderStatus).includes(status)) throw new ApiError("Nieprawidłowy status");
    data.status = status as OrderStatus;
  }
  if (uwagi !== undefined) data.uwagi = typeof uwagi === "string" ? uwagi.slice(0, 300) : uwagi;
  if (notatki !== undefined) data.notatki = typeof notatki === "string" ? notatki.slice(0, 300) : notatki;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
  if (internalCode !== undefined) data.internalCode = internalCode || null;
  if (isCustomOrder !== undefined) data.isCustomOrder = isCustomOrder === true;

  const order = await prisma.order.update({
    where: { id },
    data,
    include: { stage: true, color: true, category: true, files: true },
  });
  emitEvent("orders:changed");
  return jsonResponse(order);
});

export const DELETE = apiHandler(async (_req, { params }) => {
  await requireAuth(["Admin"]);
  const { id } = await params;

  // Delete all R2 objects for this order
  const listed = await r2Client.send(new ListObjectsV2Command({
    Bucket: R2_BUCKET,
    Prefix: `${id}/`,
  }));
  if (listed.Contents && listed.Contents.length > 0) {
    await r2Client.send(new DeleteObjectsCommand({
      Bucket: R2_BUCKET,
      Delete: { Objects: listed.Contents.map((o) => ({ Key: o.Key })) },
    }));
  }

  await prisma.order.delete({ where: { id } });
  emitEvent("orders:changed");
  return jsonResponse({ ok: true });
});
