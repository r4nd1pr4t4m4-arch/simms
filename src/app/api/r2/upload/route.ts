import { NextRequest, NextResponse } from "next/server";
import {
  uploadBufferToR2,
  isR2Configured,
  R2_BUCKET_NAME,
  MAX_R2_UPLOAD_BYTES,
  sanitizeR2Folder,
  isPpdbPublicFolder,
  sanitizeR2FilenameAndMime,
  verifyFileMagicBytes,
} from "@/lib/r2";
import {
  HttpError,
  errorResponse,
  getAuthContext,
  requireAuth,
} from "@/lib/guard";
import { enforceRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData().catch(() => null);
    if (!formData) {
      throw new HttpError(400, "Data form tidak valid.");
    }

    const file = formData.get("file") as File | null;
    const rawFolder = (formData.get("folder") as string) || "arsip-madrasah/2026";
    const customName = formData.get("customName") as string | null;

    if (!file) {
      throw new HttpError(400, "Tidak ada file yang dikirim.");
    }

    if (file.size <= 0 || file.size > MAX_R2_UPLOAD_BYTES) {
      throw new HttpError(
        400,
        "Ukuran berkas tidak valid atau melebihi batas maksimal 5 MB."
      );
    }

    const folder = sanitizeR2Folder(rawFolder);

    // Wajib login untuk seluruh folder non-PPDB; rate limit ketat untuk unggahan PPDB publik
    if (isPpdbPublicFolder(folder)) {
      enforceRateLimit("r2_ppdb_upload", getClientIp(req), 12, 60 * 1000);
      await getAuthContext();
    } else {
      await requireAuth();
    }

    const { safeName, contentType, ext } = sanitizeR2FilenameAndMime(
      customName || file.name || "berkas.pdf"
    );

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!verifyFileMagicBytes(buffer, ext)) {
      throw new HttpError(
        400,
        "Isi berkas tidak sesuai dengan format ekstensi file (PDF/JPG/PNG/WEBP)."
      );
    }

    const key = `${folder}/${Date.now()}-${safeName}`;

    if (!isR2Configured) {
      return NextResponse.json({
        ok: true,
        simulated: true,
        bucket: R2_BUCKET_NAME,
        key,
        url: `r2://${R2_BUCKET_NAME}/${key}`,
        size: file.size,
        contentType,
      });
    }

    const result = await uploadBufferToR2(key, buffer, contentType);

    return NextResponse.json({
      ok: true,
      simulated: false,
      bucket: result.bucket,
      key: result.key,
      url: result.url,
      size: file.size,
      contentType,
    });
  } catch (error) {
    return errorResponse(error, "Gagal mengunggah berkas ke Cloudflare R2");
  }
}
