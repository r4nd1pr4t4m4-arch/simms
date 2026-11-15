import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID || "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "simm-media";
export const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";

export const isR2Configured = Boolean(
  accountId && accessKeyId && secretAccessKey && R2_BUCKET_NAME
);

export const r2Client = isR2Configured
  ? new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  : null;

/**
 * Buat Presigned URL untuk PUT (upload langsung ke Cloudflare R2)
 */
export async function createR2PresignedUploadUrl(
  key: string,
  contentType: string = "application/octet-stream"
) {
  if (!r2Client) {
    throw new Error("Cloudflare R2 belum dikonfigurasi di .env");
  }
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
  return {
    uploadUrl,
    key,
    bucket: R2_BUCKET_NAME,
    publicUrl: R2_PUBLIC_URL ? `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}` : key,
  };
}

/**
 * Buat Presigned URL untuk GET (pratinjau dokumen dari Cloudflare R2)
 */
export async function createR2PresignedReadUrl(key: string) {
  if (!r2Client) {
    return null;
  }
  const cleanKey = key.replace(/^r2:\/\/[^/]+\//, "");
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: cleanKey,
  });
  return await getSignedUrl(r2Client, command, { expiresIn: 3600 });
}

/**
 * Upload buffer langsung dari server ke Cloudflare R2 (bebas kendala CORS browser)
 */
export async function uploadBufferToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
) {
  if (!r2Client) {
    throw new Error("Cloudflare R2 client tidak tersedia");
  }
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await r2Client.send(command);
  const signedReadUrl = await createR2PresignedReadUrl(key);
  return {
    key,
    bucket: R2_BUCKET_NAME,
    url: R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`
      : signedReadUrl || key,
  };
}
