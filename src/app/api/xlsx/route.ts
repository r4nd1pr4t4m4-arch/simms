import { NextRequest, NextResponse } from "next/server";
import { buildXlsxBuffer, parseXlsxBuffer } from "@/lib/xlsx-helper";

const STUDENT_TEMPLATE_ROWS: string[][] = [
  [
    "nis",
    "nisn",
    "nik",
    "name",
    "ttl",
    "gender",
    "rombel",
    "fatherName",
    "motherName",
    "parentPhone",
    "address",
    "prevSchool",
    "waliKelas",
  ],
  [
    "262707101",
    "0135566778",
    "3204120101130001",
    "Ahmad Zaki Mubarak",
    "Bandung, 12 Maret 2013",
    "Laki-laki",
    "VII-A",
    "H. Fauzan",
    "Hj. Rahmah",
    "081234567890",
    "Jl. Raya Cibiru No. 10, Kota Bandung",
    "MI Al-Hidayah",
    "Fitriani Rahmawati, S.E.",
  ],
  [
    "262707102",
    "0135566779",
    "3204120202130002",
    "Siti Fatimah Azzahra",
    "Bandung, 20 Juni 2013",
    "Perempuan",
    "VII-A",
    "Drs. Mahmud",
    "Siti Aminah",
    "081298765432",
    "Komp. Griya Cempaka Blok A2, Kota Bandung",
    "SDN Cibiru 01",
    "Fitriani Rahmawati, S.E.",
  ],
];

const TEACHER_TEMPLATE_ROWS: string[][] = [
  ["nip", "name", "subject", "additionalRole", "roleDetail"],
  [
    "198501012010011001",
    "Ust. H. Lukmanul Hakim, M.Pd.",
    "Al-Qur'an Hadits",
    "Wali Kelas",
    "IX-B",
  ],
  [
    "199002022015032002",
    "Usth. Rina Kartika, S.Pd.",
    "Bahasa Indonesia",
    "Guru Piket",
    "Selasa",
  ],
];

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") || "students";

  if (type === "teachers") {
    const buf = buildXlsxBuffer("Template Guru GTK", TEACHER_TEMPLATE_ROWS);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="Template_Import_Guru_GTK_SIMS.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  }

  const buf = buildXlsxBuffer("Template Siswa EMIS", STUDENT_TEMPLATE_ROWS);
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="Template_Import_Siswa_EMIS_SIMS.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { ok: false, error: "File Excel (.xlsx) tidak ditemukan" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    const rows = parseXlsxBuffer(buf);

    return NextResponse.json({
      ok: true,
      filename: file.name,
      rows,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Gagal membaca file Excel (.xlsx). Pastikan menggunakan format .xlsx",
      },
      { status: 400 }
    );
  }
}
