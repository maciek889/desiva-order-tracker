import { Prisma, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, errorResponse, apiHandler, ApiError, redactOrder } from "@/lib/utils";
import { emitEvent } from "@/lib/events";
import { ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET, isR2Configured } from "@/lib/r2";

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
  const user = await requireAuth(["Admin", "Office"]);
  const { id } = await params;
  const body = await req.json();
  const { name, price, client, colorId, stageId, categoryId, status, uwagi, notatki, dueDate, internalCode, isCustomOrder } = body;

  const data: Prisma.OrderUpdateInput = {};
  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) throw new ApiError("Nazwa nie może być pusta");
    if (name.trim().length > 200) throw new ApiError("Nieprawidłowa nazwa");
    data.name = name.trim();
  }
  if (price !== undefined) {
    const parsed = parseFloat(price);
    if (isNaN(parsed) || parsed < 0) throw new ApiError("Cena musi być liczbą >= 0");
    data.price = parsed;
  }
  if (client !== undefined) {
    if (typeof client !== "string" || client.trim().length === 0 || client.length > 200) throw new ApiError("Nieprawidłowy klient");
    data.client = client.trim();
  }
  if (colorId !== undefined) data.color = { connect: { id: colorId } };
  if (stageId !== undefined) data.stage = { connect: { id: stageId } };
  if (categoryId !== undefined) data.category = { connect: { id: categoryId } };
  if (status !== undefined) {
    if (!Object.values(OrderStatus).includes(status)) throw new ApiError("Nieprawidłowy status");
    data.status = status as OrderStatus;
  }
  if (uwagi !== undefined) {
    if (typeof uwagi !== "string") throw new ApiError("Nieprawidłowe uwagi");
    data.uwagi = uwagi.slice(0, 300);
  }
  if (notatki !== undefined) {
    if (typeof notatki !== "string") throw new ApiError("Nieprawidłowe notatki");
    data.notatki = notatki.slice(0, 300);
  }
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
  if (internalCode !== undefined) data.internalCode = internalCode || null;
  if (isCustomOrder !== undefined) data.isCustomOrder = isCustomOrder === true;

  const order = await prisma.order.update({
    where: { id },
    data,
    include: { stage: true, color: true, category: true, files: true },
  });
  emitEvent("orders:changed");
  return jsonResponse(redactOrder(order, user.role));
});

export const DELETE = apiHandler(async (_req, { params }) => {
  await requireAuth(["Admin"]);
  const { id } = await params;

  // Database first (file records cascade), so a storage outage or missing R2 config never blocks deletion
  await prisma.order.delete({ where: { id } });
  emitEvent("orders:changed");

  // Best-effort cleanup of the order's attachments in R2
  if (isR2Configured) {
    try {
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
    } catch (e) {
      console.error(`[DELETE order ${id}] R2 cleanup failed`, e);
    }
  }

  return jsonResponse({ ok: true });
});
