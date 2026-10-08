import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { errorResponse, apiHandler } from "@/lib/utils";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET } from "@/lib/r2";

export const GET = apiHandler(async (_req, { params }) => {
  await requireAuth();
  const { id } = await params;

  const file = await prisma.orderFile.findUnique({ where: { id } });
  if (!file) return errorResponse("Plik nie znaleziony", 404);

  const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: file.filepath });
  const response = await r2Client.send(command);

  if (!response.Body) return errorResponse("Plik nie znaleziony w storage", 404);

  const stream = response.Body.transformToWebStream();

  return new Response(stream, {
    headers: {
      "Content-Type": file.mimetype || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.filename)}"`,
      ...(file.size ? { "Content-Length": String(file.size) } : {}),
    },
  });
});
