import { NextRequest, NextResponse } from "next/server";
import {
  createR2PresignedUploadUrl,
  createR2PresignedReadUrl,
  isR2Configured,
  R2_BUCKET_NAME,
  sanitizeR2Folder,
  sanitizeR2FilenameAndMime,
} from "@/lib/r2";
import {
  AuthContext,
  HttpError,
  errorResponse,
  hasRoleKeyword,
  requireAuth,
} from "@/lib/guard";
import { r2KeyOrNull } from "@/lib/validate";

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      throw new HttpError(400, "Body permintaan tidak valid.");
    }

    const folder = sanitizeR2Folder(
      (body as Record<string, unknown>).folder || "arsip-madrasah/2026"
    );
    const { safeName, contentType } = sanitizeR2FilenameAndMime(
      (body as Record<string, unknown>).filename || "dokumen.pdf"
    );
    const key = `${folder}/${Date.now()}-${safeName}`;

    if (!isR2Configured) {
      return NextResponse.json({
        ok: true,
        simulated: true,
        key,
        bucket: R2_BUCKET_NAME,
        uploadUrl: null,
        publicUrl: `r2://${R2_BUCKET_NAME}/${key}`,
      });
    }

    const signed = await createR2PresignedUploadUrl(key, contentType);
    return NextResponse.json({
      ok: true,
      simulated: false,
      ...signed,
    });
  } catch (error) {
    return errorResponse(error, "Gagal membuat Presigned URL R2");
  }
}

function canReadR2Key(ctx: AuthContext, cleanKey: string): boolean {
  if (ctx.isStaff) return true;
  if (ctx.baseRole === "GTK") {
    if (cleanKey.startsWith("ppdb")) {
      return hasRoleKeyword(ctx, "ppdb");
    }
    return true;
  }
  if (ctx.baseRole === "SISWA") {
    const stu = ctx.user.studentProfile;
    const allowedKeys = [
      stu?.r2KkUrl,
      stu?.r2AktaUrl,
      stu?.r2IjazahUrl,
      stu?.r2FotoUrl,
    ].filter(Boolean) as string[];
    if (allowedKeys.includes(cleanKey)) return true;
    if (stu?.nis && cleanKey.includes(stu.nis)) return true;
    if (cleanKey.startsWith("surat-izin-siswa/")) return true;
    return false;
  }
  if (ctx.baseRole === "ORTU") {
    const children = ctx.user.parentChildren.map((pc) => pc.student);
    for (const c of children) {
      const allowedKeys = [
        c.r2KkUrl,
        c.r2AktaUrl,
        c.r2IjazahUrl,
        c.r2FotoUrl,
      ].filter(Boolean) as string[];
      if (allowedKeys.includes(cleanKey)) return true;
      if (c.nis && cleanKey.includes(c.nis)) return true;
    }
    if (cleanKey.startsWith("portal-ortu/")) return true;
    return false;
  }
  return false;
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth();
    const rawKey = req.nextUrl.searchParams.get("key") || "";
    const cleanKey = r2KeyOrNull(rawKey.replace(/^r2:\/\/[^/]+\//, ""));
    if (!cleanKey) {
      throw new HttpError(400, "Parameter key tidak valid.");
    }

    if (!canReadR2Key(ctx, cleanKey)) {
      throw new HttpError(
        403,
        "Akses ditolak. Anda tidak memiliki izin untuk membaca dokumen ini."
      );
    }

    if (!isR2Configured) {
      return NextResponse.json({
        ok: true,
        simulated: true,
        key: cleanKey,
        readUrl: null,
      });
    }
    const readUrl = await createR2PresignedReadUrl(cleanKey);
    return NextResponse.json({
      ok: true,
      simulated: false,
      key: cleanKey,
      readUrl,
      bucket: R2_BUCKET_NAME,
    });
  } catch (error) {
    return errorResponse(error, "Gagal membuat Read Presigned URL");
  }
}
