import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { HttpError } from "@/lib/guard";

const accountId = process.env.R2_ACCOUNT_ID || "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "simm-media";
export const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";

export const MAX_R2_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

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

export const ALLOWED_R2_FOLDERS = [
  "arsip-madrasah/2026",
  "buku-induk/2026",
  "cms-thumbnails/2026",
  "surat-izin-gtk/2026",
  "surat-izin-siswa/2026",
  "portal-ortu/leave",
  "portal-ortu/komite",
  "portal-ortu/doc",
  "portal-ortu/berkas",
  "ppdb-2027/kk",
  "ppdb-2027/akta",
  "ppdb-2027/skl",
  "ppdb-2027/foto",
  "ppdb-2027/extra",
  "ppdb-2027/berkas",
] as const;

const EXTENSION_MIME_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export function sanitizeR2Folder(rawFolder: unknown): string {
  const f = String(rawFolder || "arsip-madrasah/2026")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  if ((ALLOWED_R2_FOLDERS as readonly string[]).includes(f)) {
    return f;
  }
  if (/^ppdb-2027\/[a-z0-9_-]{1,24}$/i.test(f)) {
    return f.toLowerCase();
  }
  throw new HttpError(400, "Folder penyimpanan R2 tidak diizinkan.");
}

export function isPpdbPublicFolder(folder: string): boolean {
  return folder.startsWith("ppdb-2027/");
}

export function sanitizeR2FilenameAndMime(
  rawFilename: unknown
): { safeName: string; contentType: string; ext: string } {
  const raw = String(rawFilename || "dokumen.pdf").trim();
  const safeBase = raw.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  const dotIdx = safeBase.lastIndexOf(".");
  const ext = dotIdx >= 0 ? safeBase.slice(dotIdx).toLowerCase() : "";
  const contentType = EXTENSION_MIME_MAP[ext];
  if (!contentType) {
    throw new HttpError(
      400,
      "Format berkas tidak didukung. Gunakan file PDF, JPG, PNG, atau WEBP."
    );
  }
  return { safeName: safeBase, contentType, ext };
}

/** Verifikasi magic bytes buffer agar sesuai dengan ekstensi yang diklaim. */
export function verifyFileMagicBytes(buf: Buffer, ext: string): boolean {
  if (buf.length < 4) return false;
  if (ext === ".pdf") {
    return buf.subarray(0, 4).toString("ascii") === "%PDF";
  }
  if (ext === ".jpg" || ext === ".jpeg") {
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (ext === ".png") {
    return (
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47
    );
  }
  if (ext === ".webp") {
    return (
      buf.length >= 12 &&
      buf.subarray(0, 4).toString("ascii") === "RIFF" &&
      buf.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  return false;
}

/**
 * Buat Presigned URL untuk PUT (upload langsung ke Cloudflare R2)
 */
export async function createR2PresignedUploadUrl(
  key: string,
  contentType: string = "application/pdf"
) {
  if (!r2Client) {
    throw new Error("Cloudflare R2 belum dikonfigurasi di .env");
  }
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 600 });
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
  return await getSignedUrl(r2Client, command, { expiresIn: 600 });
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
  const isImage = contentType.startsWith("image/");
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
    ContentDisposition: isImage ? "inline" : "attachment",
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
