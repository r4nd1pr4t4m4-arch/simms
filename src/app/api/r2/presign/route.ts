import { NextRequest, NextResponse } from "next/server";
import {
  createR2PresignedUploadUrl,
  createR2PresignedReadUrl,
  isR2Configured,
  R2_BUCKET_NAME,
} from "@/lib/r2";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { folder = "uploads", filename = "dokumen.pdf", contentType = "application/pdf" } = body;

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "-");
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
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Gagal membuat Presigned URL R2" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const key = req.nextUrl.searchParams.get("key");
    if (!key) {
      return NextResponse.json({ ok: false, error: "Parameter key diperlukan" }, { status: 400 });
    }
    if (!isR2Configured) {
      return NextResponse.json({
        ok: true,
        simulated: true,
        key,
        readUrl: null,
      });
    }
    const readUrl = await createR2PresignedReadUrl(key);
    return NextResponse.json({
      ok: true,
      simulated: false,
      key,
      readUrl,
      bucket: R2_BUCKET_NAME,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Gagal membuat Read Presigned URL" },
      { status: 500 }
    );
  }
}
