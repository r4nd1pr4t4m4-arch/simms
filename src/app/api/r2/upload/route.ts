import { NextRequest, NextResponse } from "next/server";
import { uploadBufferToR2, isR2Configured, R2_BUCKET_NAME } from "@/lib/r2";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "arsip-madrasah/2026";
    const customName = formData.get("customName") as string | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "Tidak ada file yang dikirim" },
        { status: 400 }
      );
    }

    const rawName = customName || file.name || "berkas.pdf";
    const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${folder.replace(/\/$/, "")}/${Date.now()}-${safeName}`;

    if (!isR2Configured) {
      return NextResponse.json({
        ok: true,
        simulated: true,
        bucket: R2_BUCKET_NAME,
        key,
        url: `r2://${R2_BUCKET_NAME}/${key}`,
        size: file.size,
        contentType: file.type || "application/octet-stream",
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await uploadBufferToR2(
      key,
      buffer,
      file.type || "application/octet-stream"
    );

    return NextResponse.json({
      ok: true,
      simulated: false,
      bucket: result.bucket,
      key: result.key,
      url: result.url,
      size: file.size,
      contentType: file.type || "application/octet-stream",
    });
  } catch (error: any) {
    console.error("R2 Upload Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Gagal mengunggah berkas ke Cloudflare R2",
      },
      { status: 500 }
    );
  }
}
