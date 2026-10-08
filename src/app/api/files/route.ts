import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, errorResponse, apiHandler } from "@/lib/utils";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET } from "@/lib/r2";
import path from "path";
import { randomUUID } from "crypto";

export const POST = apiHandler(async (req) => {
  await requireAuth(["Admin", "Office"]);
  const formData = await req.formData();
  const orderId = formData.get("orderId") as string;
  const file = formData.get("file") as File;

  if (!orderId || !file) return errorResponse("orderId i plik są wymagane");

  // Sanitize orderId to prevent path traversal
  const sanitizedOrderId = orderId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!sanitizedOrderId) return errorResponse("Nieprawidłowe orderId");

  // Block dangerous file extensions
  const BLOCKED_EXTENSIONS = [
    ".exe", ".bat", ".sh", ".cmd", ".ps1", ".vbs", ".js",
    ".msi", ".scr", ".com", ".pif", ".hta", ".cpl", ".reg",
    ".inf", ".ws", ".wsc", ".wsf",
  ];
  const ext = path.extname(file.name).toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return errorResponse("Ten typ pliku jest niedozwolony");
  }

  // Check file size (max 20MB)
  const MAX_FILE_SIZE = 20 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) return errorResponse("Maksymalny rozmiar pliku to 20MB");

  // Check file count (max 20)
  const existingFiles = await prisma.orderFile.count({ where: { orderId } });
  if (existingFiles >= 20) return errorResponse("Maksymalnie 20 plików na zamówienie");

  // Upload to R2
  const savedName = `${randomUUID()}${ext}`;
  const r2Key = `${sanitizedOrderId}/${savedName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: r2Key,
    Body: buffer,
    ContentType: file.type,
  }));

  const orderFile = await prisma.orderFile.create({
    data: {
      orderId,
      filename: file.name,
      filepath: r2Key,
      mimetype: file.type,
      size: buffer.length,
    },
  });

  return jsonResponse(orderFile, 201);
});

export const DELETE = apiHandler(async (req) => {
  await requireAuth(["Admin", "Office"]);
  const { fileId } = await req.json();

  const file = await prisma.orderFile.findUnique({ where: { id: fileId } });
  if (!file) return errorResponse("Plik nie znaleziony", 404);

  // Delete from R2
  try {
    await r2Client.send(new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: file.filepath,
    }));
  } catch {
    // Object may already be missing - continue with DB cleanup
  }

  await prisma.orderFile.delete({ where: { id: fileId } });
  return jsonResponse({ ok: true });
});
