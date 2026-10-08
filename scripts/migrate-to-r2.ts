/**
 * One-off migration script: uploads existing local files to Cloudflare R2
 * and updates the database filepath to the R2 object key.
 *
 * Usage: npx tsx scripts/migrate-to-r2.ts
 *
 * Prerequisites:
 *   - Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME in .env
 *   - Set UPLOAD_DIR in .env (or defaults to ./public/uploads)
 *
 * This script does NOT delete local files.
 */

import { readFileSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";

// Load .env before anything else
const envPath = path.resolve(process.cwd(), ".env");
for (const line of readFileSync(envPath, "utf-8").split("\n")) {
  const match = line.match(/^\s*([^#=]+?)\s*=\s*"?(.*?)"?\s*$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}

import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// --- Config ---

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME;

if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
  console.error("Missing R2 environment variables. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

const prisma = new PrismaClient();

// --- Main ---

async function main() {
  const files = await prisma.orderFile.findMany();
  console.log(`Found ${files.length} file records to migrate.\n`);

  let succeeded = 0;
  let skipped = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const label = `[${i + 1}/${files.length}]`;

    // Derive R2 key: strip leading "/uploads/" from the current filepath
    const r2Key = file.filepath.replace(/^\/uploads\//, "");

    // If the filepath already looks like an R2 key (no /uploads/ prefix), skip
    if (r2Key === file.filepath) {
      console.log(`${label} SKIP (already migrated): ${file.filename}`);
      skipped++;
      continue;
    }

    // Derive local path
    const localPath = path.join(UPLOAD_DIR, r2Key);

    try {
      const buffer = await readFile(localPath);

      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: r2Key,
        Body: buffer,
        ContentType: file.mimetype || "application/octet-stream",
      }));

      // Update DB to store R2 key instead of /uploads/... path
      await prisma.orderFile.update({
        where: { id: file.id },
        data: { filepath: r2Key },
      });

      console.log(`${label} OK: ${file.filename} -> ${r2Key}`);
      succeeded++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${label} FAIL: ${file.filename} (${localPath}) — ${msg}`);
      skipped++;
    }
  }

  console.log(`\n--- Migration complete ---`);
  console.log(`Total: ${files.length} | Succeeded: ${succeeded} | Skipped/Failed: ${skipped}`);
  console.log(`Local files have NOT been deleted.`);
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
