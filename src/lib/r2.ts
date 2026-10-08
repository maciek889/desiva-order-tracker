import { S3Client } from "@aws-sdk/client-s3";
import { ApiError } from "./utils";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? "";

// Attachments are optional: without R2 credentials the rest of the app keeps working.
export const isR2Configured = Boolean(accountId && accessKeyId && secretAccessKey && R2_BUCKET);

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: accessKeyId ?? "", secretAccessKey: secretAccessKey ?? "" },
});

export function requireR2() {
  if (!isR2Configured) throw new ApiError("Przechowywanie plików nie jest skonfigurowane", 503);
}
