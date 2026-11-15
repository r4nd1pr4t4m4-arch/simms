"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Globe,
  UserPlus,
  ShieldCheck,
  FileSpreadsheet,
  GraduationCap,
  Users,
  HeartHandshake,
  Database,
  CloudUpload,
  CalendarClock,
  Award,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Layers,
  Send,
  LogOut,
  KeyRound,
  Lock,
  Building2,
  Download,
  Upload,
  Trash2,
} from "lucide-react";

export type PortalKey =
  | "publik"
  | "ppdb"
  | "admin"
  | "tu"
  | "gtk"
  | "siswa"
  | "ortu";

interface ActiveSession {
  userId: string;
  identifier: string;
  name: string;
  baseRole: "ADMIN" | "TU" | "GTK" | "SISWA" | "ORTU" | "PPDB";
  subProfileKey?: string;
  additionalRoles?: string[];
  targetPath: string;
}

interface PortalTab {
  key: PortalKey;
  label: string;
  sublabel: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PORTAL_TABS: PortalTab[] = [
  {
    key: "publik",
    label: "Halaman Publik",
    sublabel: "CMS & Live Piket",
    href: "/",
    icon: Globe,
  },
  {
    key: "ppdb",
    label: "Portal PPDB",
    sublabel: "End-to-End R2",
    href: "/ppdb",
    icon: UserPlus,
  },
  {
    key: "admin",
    label: "Super Admin",
    sublabel: "RBAC & Inval",
    href: "/admin",
    icon: ShieldCheck,
  },
  {
    key: "tu",
    label: "Tata Usaha (TU)",
    sublabel: "Buku Induk & EMIS",
    href: "/tu",
    icon: FileSpreadsheet,
  },
  {
    key: "gtk",
    label: "Guru & GTK",
    sublabel: "Dynamic RBAC",
    href: "/gtk",
    icon: GraduationCap,
  },
  {
    key: "siswa",
    label: "Portal Siswa",
    sublabel: "KBM & Tabungan",
    href: "/siswa",
    icon: Users,
  },
  {
    key: "ortu",
    label: "Orang Tua / Wali",
    sublabel: "Multi-Child Sync",
    href: "/ortu",
    icon: HeartHandshake,
  },
];

type ExtendedModalType =
  | null
  | "ppdb_scoring"
  | "schedule_conflict"
  | "bk_counseling"
  | "batch_promotion"
  | "r2_uploader"
  | "change_password"
  | "golive_settings";

export default function SimmWorkspaceShell({
  activePortal,
}: {
  activePortal: PortalKey;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [barCollapsed, setBarCollapsed] = useState(false);
  const [activeModal, setActiveModal] = useState<ExtendedModalType>(null);
  const [iframeRefreshKey, setIframeRefreshKey] = useState(0);
  const [toastMsg, setToastMsg] = useState<{ title: string; sub: string } | null>(
    null
  );

  // State Ubah Kata Sandi
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // State Go-Live Settings, Import CSV & Identitas Madrasah
  const [goLiveTab, setGoLiveTab] = useState<
    "identitas" | "import_csv" | "reset_data"
  >("identitas");
  const [madrasahProfile, setMadrasahProfile] = useState({
    name: "MTs Nurul Falah",
    nsm: "121232040089",
    npsn: "20278412",
    accreditation: "Terakreditasi A (Unggul)",
    academicYear: "2026/2027",
    semester: "Ganjil",
    curriculum: "Kurikulum Merdeka & KMA 450",
    headmasterName: "Dr. H. Ahmad Fauzi, M.Pd.",
    headmasterNip: "197605142003121003",
    tuHeadName: "Bapak Ridwan Kamil, S.AP.",
    tuHeadNip: "198204152009011003",
    address:
      "Jl. Pendidikan No. 45, Kel. Mekarjaya, Kec. Cileunyi, Kab. Bandung, Jawa Barat 40622",
    phone: "0812-2345-6789",
    email: "info@mtsnurulfalah.sch.id",
    gpsLat: "-6.9348",
    gpsLng: "107.7186",
    gpsRadiusMeters: 100,
    komiteBankInfo:
      "BSI (Bank Syariah Indonesia) 7123456789 a.n. Komite MTs Nurul Falah",
  });
  const [importTarget, setImportTarget] = useState<"students" | "teachers">(
    "students"
  );
  const [csvPreviewRows, setCsvPreviewRows] = useState<Array<Record<string, string>>>([]);
  const [importingCsv, setImportingCsv] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");

  // State Modul 1: Panitia PPDB (Input Skor Seleksi & Ranking)
  const [ppdbApplicants, setPpdbApplicants] = useState([
    {
      regNo: "PPDB-2027-0142",
      name: "Muhammad Zidan Al-Farizi",
      nisn: "0134582910",
      track: "PRESTASI",
      school: "MI Plus Al-Muhajirin",
      btq: 95,
      academic: 91,
      interview: 93,
      status: "DITERIMA",
      rombel: "VII-A",
    },
    {
      regNo: "PPDB-2027-0148",
      name: "Anindya Putri Salsabila",
      nisn: "0139041822",
      track: "REGULER",
      school: "SDN 124 Hanura Bandung",
      btq: 86,
      academic: 88,
      interview: 85,
      status: "MENUNGGU_VERIFIKASI",
      rombel: "VII-A",
    },
    {
      regNo: "PPDB-2027-0151",
      name: "Rafa Aditya Pratama",
      nisn: "0137761209",
      track: "AFIRMASI",
      school: "SDN Cibiru 04",
      btq: 82,
      academic: 84,
      interview: 88,
      status: "PERLU_REVISI",
      rombel: "VII-B",
    },
  ]);

  // State Modul 2: Penyusunan Jadwal Pelajaran Anti-Bentrok
  const [schedules, setSchedules] = useState([
    {
      id: "sch-1",
      day: "Senin",
      slot: "Jam ke 1–2 (07.30 – 08.50)",
      rombel: "VIII-A",
      subject: "Matematika",
      teacher: "Ust. Ahmad Fauzi, S.Pd.",
    },
    {
      id: "sch-2",
      day: "Senin",
      slot: "Jam ke 1–2 (07.30 – 08.50)",
      rombel: "IX-A",
      subject: "IPA Terpadu",
      teacher: "Budi Santoso, M.Pd.",
    },
    {
      id: "sch-3",
      day: "Senin",
      slot: "Jam ke 3–4 (09.10 – 10.30)",
      rombel: "VII-A",
      subject: "Bahasa Arab",
      teacher: "M. Iqbal Maulana, S.Pd.",
    },
  ]);
  const [newSchDay, setNewSchDay] = useState("Senin");
  const [newSchSlot, setNewSchSlot] = useState("Jam ke 1–2 (07.30 – 08.50)");
  const [newSchRombel, setNewSchRombel] = useState("VIII-B");
  const [newSchSubject, setNewSchSubject] = useState("Matematika");
  const [newSchTeacher, setNewSchTeacher] = useState("Ust. Ahmad Fauzi, S.Pd.");

  // State Modul 3: Meja Kerja Guru Wali / BK
  const [bkRecords, setBkRecords] = useState([
    {
      id: "bk-1",
      student: "Muhammad Rizky Pratama (VIII-A)",
      type: "Prestasi & Apresiasi",
      points: +15,
      note: "Juara 1 Olimpiade Matematika Terintegrasi Tingkat Kota & disiplin ibadah dhuha.",
      date: "14 Nov 2026",
    },
    {
      id: "bk-2",
      student: "Aisyah Zahra Kusuma (VII-B)",
      type: "Bimbingan Tahfidz",
      points: +10,
      note: "Capaian setoran hafalan Juz 29 lancar (Predikat Mumtaz).",
      date: "12 Nov 2026",
    },
    {
      id: "bk-3",
      student: "Fajar Ramadhan Putra (IX-A)",
      type: "Konseling Karir & Studi Lanjut",
      points: +5,
      note: "Pendampingan pemilihan MAN Insan Cendekia & pemetaan minat bakat.",
      date: "10 Nov 2026",
    },
  ]);
  const [bkStudent, setBkStudent] = useState("Muhammad Rizky Pratama (VIII-A)");
  const [bkCategory, setBkCategory] = useState("Prestasi & Apresiasi (+Poin)");
  const [bkPoints, setBkPoints] = useState(10);
  const [bkNote, setBkNote] = useState("");
  const [bkReplyText, setBkReplyText] = useState("");
  const [bkChatThread, setBkChatThread] = useState([
    {
      sender: "Bapak Hendra Kusuma, S.T. (Orang Tua Rizky)",
      role: "ortu",
      text: "Assalamu'alaikum Ustadzah Dewi, mohon info perkembangan adaptasi belajar Rizky di semester ganjil ini.",
      time: "08:30 WIB",
    },
    {
      sender: "Dewi Sartika Putri, S.Psi. (Koordinator BK)",
      role: "bk",
      text: "Wa'alaikumussalam Bapak Hendra. Alhamdulillah perkembangan akademik dan karakter ananda Rizky sangat positif (+105 poin teladan).",
      time: "08:42 WIB",
    },
  ]);

  // State Modul 4: Kenaikan Kelas Massal
  const [fromRombel, setFromRombel] = useState("VII-A");
  const [toRombel, setToRombel] = useState("VIII-A");
  const [batchHistory, setBatchHistory] = useState<string[]>([
    "TA 2025/2026 → 2026/2027: 32 Siswa Rombel VII-A dinaikkan ke VIII-A (Status: Selesai)",
  ]);

  // State Modul 5: Direct Cloudflare R2 Uploader
  const [r2Uploading, setR2Uploading] = useState(false);
  const [r2UploadedFiles, setR2UploadedFiles] = useState<
    Array<{ key: string; url: string; size: number; time: string }>
  >([]);

  const triggerToast = (title: string, sub: string) => {
    setToastMsg({ title, sub });
    setTimeout(() => setToastMsg(null), 4500);
  };

  // Muat sesi aktif & profil madrasah dari server
  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => setSession(d?.session || null))
      .catch(() => setSession(null));

    fetch("/api/simm?resource=profile")
      .then((r) => r.json())
      .then((d) => {
        if (d?.profile) setMadrasahProfile(d.profile);
      })
      .catch(() => null);
  }, [pathname]);

  // Dengarkan event postMessage dari iframe portal
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.source !== "SIMM_PORTAL") return;

      if (data.type === "NAVIGATE" && data.payload?.path) {
        router.push(data.payload.path);
      } else if (data.type === "AUTH_SUCCESS" && data.payload?.targetPath) {
        setSession(data.payload);
        triggerToast(
          `Autentikasi Berhasil (${data.payload.baseRole})`,
          `Selamat datang, ${data.payload.name}`
        );
      } else if (data.type === "R2_UPLOADED" && data.payload?.key) {
        setR2UploadedFiles((prev) => [
          {
            key: data.payload.key,
            url: data.payload.url || "#",
            size: data.payload.size || 0,
            time: new Date().toLocaleTimeString("id-ID"),
          },
          ...prev,
        ]);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } catch {
      // ignore
    }
    setSession(null);
    triggerToast("Sesi Berakhir", "Anda telah keluar dari portal SIMS.");
    router.push("/");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      triggerToast("Validasi Gagal", "Kata sandi baru minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      triggerToast("Validasi Gagal", "Konfirmasi kata sandi tidak cocok.");
      return;
    }
    try {
      const res = await fetch("/api/auth", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (data.ok) {
        setNewPassword("");
        setConfirmPassword("");
        setActiveModal(null);
        triggerToast("Kata Sandi Diperbarui", data.message);
      } else {
        triggerToast("Gagal", data.error || "Gagal memperbarui kata sandi");
      }
    } catch {
      triggerToast("Error", "Gagal menghubungi server autentikasi");
    }
  };

  // Simpan Identitas Resmi Madrasah
  const handleSaveMadrasahProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/simm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_MADRASAH_PROFILE",
          payload: madrasahProfile,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setIframeRefreshKey((k) => k + 1);
        setActiveModal(null);
        triggerToast(
          "Identitas Madrasah Diperbarui!",
          `Profil resmi "${madrasahProfile.name}" telah diterapkan di seluruh portal & cetakan surat.`
        );
      }
    } catch {
      triggerToast("Error", "Gagal menyimpan profil madrasah");
    }
  };

  // Unduh Template Excel (.xlsx) Siswa / Guru dari endpoint /api/xlsx
  const handleDownloadXlsxTemplate = (type: "students" | "teachers") => {
    const a = document.createElement("a");
    a.href = `/api/xlsx?type=${type}`;
    a.download =
      type === "students"
        ? "Template_Import_Siswa_EMIS_SIMS.xlsx"
        : "Template_Import_Guru_GTK_SIMS.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    triggerToast(
      "Mengunduh Template Excel (.xlsx)",
      `File ${a.download} sedang diunduh ke komputer Anda.`
    );
  };

  // Baca File Excel (.xlsx) melalui /api/xlsx
  const handleXlsxFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/xlsx", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.rows)) {
        setCsvPreviewRows(data.rows);
        triggerToast(
          "File Excel (.xlsx) Terbaca",
          `Ditemukan ${data.rows.length} baris data dari ${file.name} siap diimpor ke Supabase.`
        );
      } else {
        triggerToast(
          "Gagal Membaca File .xlsx",
          data.error || "Pastikan file berformat Excel (.xlsx) sesuai template."
        );
      }
    } catch {
      triggerToast(
        "Error Pembacaan File",
        "Gagal memproses file .xlsx yang dipilih."
      );
    } finally {
      e.target.value = "";
    }
  };

  const handleExecuteBulkImport = async () => {
    if (csvPreviewRows.length === 0) return;
    setImportingCsv(true);
    try {
      const action =
        importTarget === "students"
          ? "BULK_IMPORT_STUDENTS"
          : "BULK_IMPORT_TEACHERS";
      const res = await fetch("/api/simm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          payload: { rows: csvPreviewRows },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setCsvPreviewRows([]);
        setIframeRefreshKey((k) => k + 1);
        triggerToast(
          "Import Massal Berhasil!",
          `${data.importedCount} data ${
            importTarget === "students" ? "Siswa & Akun" : "Guru/GTK & Akun"
          } telah disimpan ke database Supabase.`
        );
      } else {
        triggerToast("Gagal Import", data.error || "Periksa format CSV");
      }
    } catch {
      triggerToast("Error", "Gagal mengimpor data ke server");
    } finally {
      setImportingCsv(false);
    }
  };

  const handleResetDummyData = async () => {
    if (resetConfirmText !== "SIAP-GOLIVE") {
      triggerToast(
        "Konfirmasi Diperlukan",
        "Ketik SIAP-GOLIVE pada kolom konfirmasi terlebih dahulu."
      );
      return;
    }
    try {
      const res = await fetch("/api/simm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESET_DUMMY_DATA" }),
      });
      const data = await res.json();
      if (data.ok) {
        setResetConfirmText("");
        setIframeRefreshKey((k) => k + 1);
        setActiveModal(null);
        triggerToast("Data Dummy Dibersihkan", data.message);
      }
    } catch {
      triggerToast("Error", "Gagal membersihkan data dummy");
    }
  };

  // Deteksi hak akses modul tambahan sesuai BaseRole + Dynamic Additional Roles
  const joinedRoles = (session?.additionalRoles || []).join(" ").toLowerCase();
  const isKepalaMadrasah =
    session?.baseRole === "GTK" && joinedRoles.includes("kepala madrasah");
  const isSuperAdmin = session?.baseRole === "ADMIN" || isKepalaMadrasah;
  const isTu = session?.baseRole === "TU";
  const isGtk = session?.baseRole === "GTK";

  const canAccessPpdbScoring =
    isSuperAdmin || isTu || (isGtk && joinedRoles.includes("ppdb"));
  const canAccessScheduleBuilder =
    isSuperAdmin ||
    (isGtk &&
      (joinedRoles.includes("kurikulum") || joinedRoles.includes("piket")));
  const canAccessBkDesk =
    isSuperAdmin ||
    (isGtk && (joinedRoles.includes("bk") || joinedRoles.includes("wali")));
  const canAccessBatchPromotion = isSuperAdmin || isTu;
  const canAccessR2Manager = isSuperAdmin || isTu || isGtk;
  const canAccessGoLiveSettings = isSuperAdmin || isTu;

  // Deteksi bentrok jadwal secara real-time
  const conflictingSchedule = schedules.find(
    (s) =>
      s.day === newSchDay &&
      s.slot === newSchSlot &&
      (s.teacher === newSchTeacher || s.rombel === newSchRombel)
  );

  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (conflictingSchedule) {
      triggerToast(
        "Jadwal Bentrok Terdeteksi!",
        `${conflictingSchedule.teacher} sudah terjadwal di kelas ${conflictingSchedule.rombel} pada ${conflictingSchedule.day} ${conflictingSchedule.slot}`
      );
      return;
    }
    setSchedules((prev) => [
      {
        id: "sch-" + Date.now(),
        day: newSchDay,
        slot: newSchSlot,
        rombel: newSchRombel,
        subject: newSchSubject,
        teacher: newSchTeacher,
      },
      ...prev,
    ]);
    triggerToast(
      "Jadwal Pelajaran Disimpan",
      `${newSchSubject} (${newSchRombel}) berhasil ditambahkan tanpa bentrok jam mengajar.`
    );
  };

  const handleSavePpdbScore = async (regNo: string, idx: number) => {
    const item = ppdbApplicants[idx];
    try {
      await fetch("/api/simm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_PPDB_SCORE_STATUS",
          payload: {
            regNo,
            scoreBtq: item.btq,
            scoreAcademic: item.academic,
            scoreInterview: item.interview,
            status: item.status,
            targetClassroom: item.rombel,
          },
        }),
      });
    } catch {
      // ignore
    }
    triggerToast(
      "Nilai Seleksi & Status PPDB Tersimpan",
      `Skor akhir ${item.name} (${regNo}) telah diperbarui di Supabase.`
    );
  };

  const handleOneClickMigrate = async (
    regNo: string,
    name: string,
    rombel: string
  ) => {
    try {
      await fetch("/api/simm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MIGRATE_PPDB_TO_BUKU_INDUK",
          payload: { regNo, targetRombel: rombel },
        }),
      });
    } catch {
      // ignore
    }
    setPpdbApplicants((prev) =>
      prev.map((a) =>
        a.regNo === regNo ? { ...a, status: "SUDAH_MIGRASI" } : a
      )
    );
    triggerToast(
      "One-Click Migration Berhasil!",
      `${name} beserta dokumen R2 otomatis masuk ke Buku Induk Siswa (${rombel}).`
    );
  };

  const handleAddBkRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bkNote.trim()) return;
    const isNegative = bkCategory.includes("Pelanggaran");
    const delta = isNegative ? -Math.abs(bkPoints) : Math.abs(bkPoints);
    setBkRecords((prev) => [
      {
        id: "bk-" + Date.now(),
        student: bkStudent,
        type: bkCategory,
        points: delta,
        note: bkNote,
        date: "15 Nov 2026",
      },
      ...prev,
    ]);
    setBkNote("");
    triggerToast(
      "Catatan BK & Poin Siswa Tersimpan",
      `Catatan pembinaan untuk ${bkStudent} (${delta > 0 ? "+" + delta : delta} poin) berhasil disinkronkan ke portal Siswa & Orang Tua.`
    );
  };

  const handleSendBkChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bkReplyText.trim()) return;
    setBkChatThread((prev) => [
      ...prev,
      {
        sender: "Dewi Sartika Putri, S.Psi. (Koordinator BK)",
        role: "bk",
        text: bkReplyText,
        time: "Baru saja",
      },
    ]);
    setBkReplyText("");
    triggerToast(
      "Pesan Terkirim ke Orang Tua",
      "Balasan konsultasi BK telah diteruskan ke portal Orang Tua."
    );
  };

  const handleBatchPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/simm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BATCH_PROMOTE_STUDENTS",
          payload: { fromRombel, toRombel },
        }),
      });
    } catch {
      // ignore
    }
    const label =
      toRombel === "LULUS_ALUMNI"
        ? `15 Nov 2026: Seluruh siswa aktif Rombel ${fromRombel} diluluskan menjadi Alumni`
        : `15 Nov 2026: Seluruh siswa aktif Rombel ${fromRombel} dinaikkan secara massal ke Rombel ${toRombel}`;
    setBatchHistory((prev) => [label, ...prev]);
    triggerToast("Kenaikan Kelas Massal Selesai", label);
  };

  const handleDirectR2FileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setR2Uploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "arsip-madrasah/2026");
      const res = await fetch("/api/r2/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.ok) {
        setR2UploadedFiles((prev) => [
          {
            key: data.key,
            url: data.url,
            size: file.size,
            time: new Date().toLocaleTimeString("id-ID"),
          },
          ...prev,
        ]);
        triggerToast(
          "Unggah Cloudflare R2 Berhasil!",
          `Berkas ${file.name} tersimpan di bucket simm-media (${data.key}).`
        );
      } else {
        triggerToast("Gagal Unggah R2", data.error || "Periksa kredensial R2");
      }
    } catch (err: any) {
      triggerToast("Error R2", err?.message || "Gagal menghubungi endpoint R2");
    } finally {
      setR2Uploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-slate-950 select-none">
      {/* ===================================================================
          BILAH NAVIGASI SESI AKTIF (HANYA TAMPIL JIKA PENGGUNA SUDAH LOGIN)
      =================================================================== */}
      {session && !barCollapsed && (
        <header className="z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-200 shadow-lg">
          {/* Left: Session Identity & Direct Role Navigation */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <div className="flex items-center gap-2 pr-2.5 mr-1 border-r border-slate-700/80 shrink-0">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-white">{session.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                {isKepalaMadrasah ? "KEPALA MADRASAH" : session.baseRole}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => router.push(session.targetPath)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition border ${
                  pathname === session.targetPath
                    ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Dashboard Utama</span>
              </button>

              {isKepalaMadrasah && (
                <button
                  onClick={() => router.push("/admin")}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition border ${
                    pathname === "/admin"
                      ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Panel Eksekutif</span>
                </button>
              )}

              {(session.baseRole === "ADMIN" || isKepalaMadrasah) && (
                <button
                  onClick={() => router.push("/tu")}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition border ${
                    pathname === "/tu"
                      ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Tata Usaha (TU)</span>
                </button>
              )}

              <button
                onClick={() => router.push("/")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition border ${
                  pathname === "/"
                    ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Beranda Publik</span>
              </button>
            </div>
          </div>

          {/* Right: Role-Permitted Extended Modules + Master Settings + Change Password + Logout */}
          <div className="flex items-center gap-1.5 shrink-0">
            {canAccessGoLiveSettings && (
              <button
                onClick={() => setActiveModal("golive_settings")}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition shadow-sm"
                title="Pengaturan Identitas Madrasah & Import Massal Excel (.xlsx)"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Master & Import EMIS</span>
              </button>
            )}

            {canAccessPpdbScoring && (
              <button
                onClick={() => setActiveModal("ppdb_scoring")}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 font-medium transition"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Skor PPDB</span>
              </button>
            )}

            {canAccessScheduleBuilder && (
              <button
                onClick={() => setActiveModal("schedule_conflict")}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-medium transition"
              >
                <CalendarClock className="w-3.5 h-3.5" />
                <span>Jadwal Kurikulum</span>
              </button>
            )}

            {canAccessBkDesk && (
              <button
                onClick={() => setActiveModal("bk_counseling")}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 font-medium transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Meja BK</span>
              </button>
            )}

            {canAccessBatchPromotion && (
              <button
                onClick={() => setActiveModal("batch_promotion")}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 font-medium transition"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Naik Kelas</span>
              </button>
            )}

            <button
              onClick={() => setActiveModal("change_password")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium transition"
              title="Ubah Kata Sandi Akun"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Sandi</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-semibold transition"
              title="Keluar dari Sesi SIMS"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>

            <button
              onClick={() => setBarCollapsed(true)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
              title="Sembunyikan Bilah Sesi"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>
      )}

      {session && barCollapsed && (
        <button
          onClick={() => setBarCollapsed(false)}
          className="fixed top-2 right-3 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-emerald-300 border border-emerald-500/40 text-xs font-semibold shadow-lg backdrop-blur-md transition"
        >
          <Database className="w-3.5 h-3.5" />
          <span>{session.baseRole} • Menu Sesi</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      )}

      {/* ===================================================================
          MAIN PORTAL VIEWPORT
      =================================================================== */}
      <main className="relative flex-1 w-full h-full bg-slate-50 overflow-hidden">
        <iframe
          key={`${activePortal}-${session?.userId || "guest"}-${iframeRefreshKey}`}
          src={`/api/portal/${activePortal}`}
          title={`Portal SIMS - ${activePortal.toUpperCase()}`}
          className="w-full h-full border-0"
        />
      </main>

      {/* ===================================================================
          MODAL PENGATURAN IDENTITAS MADRASAH & IMPORT EXCEL (.XLSX)
      =================================================================== */}
      {activeModal === "golive_settings" && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 font-semibold">
                  Pengaturan Master Madrasah
                </span>
                <h2 className="text-lg font-bold mt-1">
                  Identitas Resmi Madrasah & Import Massal Excel (.xlsx)
                </h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Tabs */}
            <div className="px-6 pt-3 bg-slate-100 border-b border-slate-200 flex gap-2 text-xs font-semibold">
              <button
                onClick={() => setGoLiveTab("identitas")}
                className={`px-4 py-2.5 rounded-t-xl border-t border-x transition ${
                  goLiveTab === "identitas"
                    ? "bg-white text-emerald-700 border-slate-200"
                    : "bg-transparent text-slate-600 border-transparent hover:text-slate-900"
                }`}
              >
                1. Identitas & Kop Madrasah
              </button>
              <button
                onClick={() => setGoLiveTab("import_csv")}
                className={`px-4 py-2.5 rounded-t-xl border-t border-x transition ${
                  goLiveTab === "import_csv"
                    ? "bg-white text-emerald-700 border-slate-200"
                    : "bg-transparent text-slate-600 border-transparent hover:text-slate-900"
                }`}
              >
                2. Import Massal Excel (.xlsx) — Siswa EMIS & Guru
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {/* TAB 1: IDENTITAS RESMI MADRASAH */}
              {goLiveTab === "identitas" && (
                <form onSubmit={handleSaveMadrasahProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Resmi Sekolah / Madrasah
                      </label>
                      <input
                        type="text"
                        required
                        value={madrasahProfile.name}
                        onChange={(e) =>
                          setMadrasahProfile({
                            ...madrasahProfile,
                            name: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nomor Statistik Madrasah (NSM)
                      </label>
                      <input
                        type="text"
                        value={madrasahProfile.nsm}
                        onChange={(e) =>
                          setMadrasahProfile({
                            ...madrasahProfile,
                            nsm: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        NPSN Kemendikdasmen / Kemenag
                      </label>
                      <input
                        type="text"
                        value={madrasahProfile.npsn}
                        onChange={(e) =>
                          setMadrasahProfile({
                            ...madrasahProfile,
                            npsn: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tahun Ajaran Aktif
                      </label>
                      <input
                        type="text"
                        value={madrasahProfile.academicYear}
                        onChange={(e) =>
                          setMadrasahProfile({
                            ...madrasahProfile,
                            academicYear: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Semester Berjalan
                      </label>
                      <select
                        value={madrasahProfile.semester}
                        onChange={(e) =>
                          setMadrasahProfile({
                            ...madrasahProfile,
                            semester: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="Ganjil">Semester Ganjil</option>
                        <option value="Genap">Semester Genap</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Status Akreditasi
                      </label>
                      <input
                        type="text"
                        value={madrasahProfile.accreditation}
                        onChange={(e) =>
                          setMadrasahProfile({
                            ...madrasahProfile,
                            accreditation: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Kepala Madrasah (Untuk TTE SKL & SK)
                      </label>
                      <input
                        type="text"
                        value={madrasahProfile.headmasterName}
                        onChange={(e) =>
                          setMadrasahProfile({
                            ...madrasahProfile,
                            headmasterName: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        NIP Kepala Madrasah
                      </label>
                      <input
                        type="text"
                        value={madrasahProfile.headmasterNip}
                        onChange={(e) =>
                          setMadrasahProfile({
                            ...madrasahProfile,
                            headmasterNip: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Alamat Lengkap Madrasah (Kop Surat & Halaman Publik)
                    </label>
                    <input
                      type="text"
                      value={madrasahProfile.address}
                      onChange={(e) =>
                        setMadrasahProfile({
                          ...madrasahProfile,
                          address: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Koordinat GPS Latitude (Absensi Guru)
                      </label>
                      <input
                        type="text"
                        value={madrasahProfile.gpsLat}
                        onChange={(e) =>
                          setMadrasahProfile({
                            ...madrasahProfile,
                            gpsLat: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Koordinat GPS Longitude
                      </label>
                      <input
                        type="text"
                        value={madrasahProfile.gpsLng}
                        onChange={(e) =>
                          setMadrasahProfile({
                            ...madrasahProfile,
                            gpsLng: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Info Rekening Komite Madrasah
                      </label>
                      <input
                        type="text"
                        value={madrasahProfile.komiteBankInfo}
                        onChange={(e) =>
                          setMadrasahProfile({
                            ...madrasahProfile,
                            komiteBankInfo: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md"
                  >
                    Simpan Identitas Madrasah & Terapkan ke Seluruh 7 Portal
                  </button>
                </form>
              )}

              {/* TAB 2: IMPORT MASSAL EXCEL (.XLSX) (SISWA EMIS & GURU) */}
              {goLiveTab === "import_csv" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setImportTarget("students");
                          setCsvPreviewRows([]);
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                          importTarget === "students"
                            ? "bg-emerald-600 text-white"
                            : "bg-white text-slate-700 border border-slate-300"
                        }`}
                      >
                        Import Buku Induk Siswa (EMIS)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImportTarget("teachers");
                          setCsvPreviewRows([]);
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                          importTarget === "teachers"
                            ? "bg-emerald-600 text-white"
                            : "bg-white text-slate-700 border border-slate-300"
                        }`}
                      >
                        Import Data Guru / GTK
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownloadXlsxTemplate(importTarget)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>
                        Unduh Template Excel (.xlsx){" "}
                        {importTarget === "students" ? "Siswa EMIS" : "Guru GTK"}
                      </span>
                    </button>
                  </div>

                  <label className="block p-6 rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50/40 hover:bg-emerald-50 text-center cursor-pointer transition">
                    <Upload className="w-7 h-7 text-emerald-600 mx-auto mb-2" />
                    <p className="font-bold text-emerald-950">
                      Pilih File Excel (.xlsx) ({importTarget === "students" ? "Data Siswa EMIS" : "Data Guru GTK"}) dari Komputer Anda
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Kolom NIS, NISN, NIK, dan NIP otomatis terjaga sebagai Teks (angka nol di depan tidak hilang). Sistem otomatis membuat akun login (sandi awal: Simms2026!) di Supabase.
                    </p>
                    <input
                      type="file"
                      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      onChange={handleXlsxFileSelected}
                      className="hidden"
                    />
                  </label>

                  {csvPreviewRows.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">
                          Pratinjau Data Siap Impor ({csvPreviewRows.length} Baris)
                        </span>
                        <button
                          type="button"
                          disabled={importingCsv}
                          onClick={handleExecuteBulkImport}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
                        >
                          {importingCsv
                            ? "Sedang Menyimpan ke Supabase..."
                            : `Proses Import ${csvPreviewRows.length} Data ke Supabase →`}
                        </button>
                      </div>
                      <div className="max-h-48 overflow-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-slate-100 text-slate-700">
                            <tr>
                              {Object.keys(csvPreviewRows[0]).map((h) => (
                                <th key={h} className="py-2 px-3 border-b">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {csvPreviewRows.slice(0, 10).map((r, i) => (
                              <tr key={i}>
                                {Object.values(r).map((v, j) => (
                                  <td key={j} className="py-1.5 px-3">
                                    {v}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: BERSIHKAN DATA DUMMY (SIAP GO-LIVE) */}
              {goLiveTab === "reset_data" && (
                <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 space-y-4">
                  <div className="flex items-start gap-3">
                    <Trash2 className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-rose-950 text-base">
                        Pembersihan Data Contoh (Dummy) Sebelum Go-Live
                      </h3>
                      <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                        Tindakan ini akan menghapus seluruh data siswa contoh, pendaftar PPDB contoh, mutasi tabungan contoh, dan tiket layanan contoh di dalam database Supabase Anda, namun <strong>tetap mempertahankan akun Super Admin dan konfigurasi Tahun Ajaran</strong>.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-rose-900 mb-1">
                      Ketik <code className="px-1.5 py-0.5 rounded bg-white border border-rose-300 font-mono">SIAP-GOLIVE</code> untuk mengonfirmasi:
                    </label>
                    <input
                      type="text"
                      value={resetConfirmText}
                      onChange={(e) => setResetConfirmText(e.target.value)}
                      placeholder="SIAP-GOLIVE"
                      className="w-full px-3.5 py-2 rounded-xl border border-rose-300 bg-white font-mono text-sm"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleResetDummyData}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition"
                  >
                    Bersihkan Seluruh Data Dummy di Database Supabase Sekarang
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL UBAH KATA SANDI MANDIRI (PRODUCTION SECURITY)
      =================================================================== */}
      {activeModal === "change_password" && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-emerald-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <h2 className="text-base font-bold">Ubah Kata Sandi Akun</h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="p-6 space-y-4 text-sm">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                Akun Aktif: <strong className="text-slate-900">{session?.name}</strong> ({session?.identifier})
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kata Sandi Baru (Minimal 6 Karakter)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan kata sandi baru..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Konfirmasi Kata Sandi Baru
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi baru..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
              >
                Simpan Kata Sandi Baru ke Supabase
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL 1: MEJA KERJA PANITIA PPDB
      =================================================================== */}
      {activeModal === "ppdb_scoring" && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-900 to-teal-800 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/15 font-semibold">
                  Tugas Tambahan: Panitia PPDB
                </span>
                <h2 className="text-lg font-bold mt-1">
                  Dashboard Penilaian Tes Seleksi, Perankingan & One-Click Migration PPDB
                </h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-emerald-950">
                    Formula Bobot Penilaian Seleksi PPDB Terpadu
                  </p>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Skor Akhir dihitung otomatis: <strong>40% Tes BTQ & Tahfidz Al-Qur&apos;an</strong> +{" "}
                    <strong>35% Tes Potensi Akademik (TPA)</strong> + <strong>25% Wawancara Siswa/Wali</strong>.
                  </p>
                </div>
                <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-white text-emerald-800 border border-emerald-300 font-semibold">
                  Sinkron Tabel: PpdbApplicant (Supabase)
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-xs uppercase">
                      <th className="py-3 px-4">Peringkat & Pendaftar</th>
                      <th className="py-3 px-3">Jalur</th>
                      <th className="py-3 px-3 text-center">BTQ/Tahfidz (40%)</th>
                      <th className="py-3 px-3 text-center">TPA (35%)</th>
                      <th className="py-3 px-3 text-center">Wawancara (25%)</th>
                      <th className="py-3 px-3 text-center">Skor Akhir</th>
                      <th className="py-3 px-3">Status & Rombel</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {[...ppdbApplicants]
                      .sort((a, b) => {
                        const scoreA = a.btq * 0.4 + a.academic * 0.35 + a.interview * 0.25;
                        const scoreB = b.btq * 0.4 + b.academic * 0.35 + b.interview * 0.25;
                        return scoreB - scoreA;
                      })
                      .map((app, rankIdx) => {
                        const origIdx = ppdbApplicants.findIndex(
                          (x) => x.regNo === app.regNo
                        );
                        const finalScore = (
                          app.btq * 0.4 +
                          app.academic * 0.35 +
                          app.interview * 0.25
                        ).toFixed(2);
                        return (
                          <tr key={app.regNo} className="hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                                  #{rankIdx + 1}
                                </span>
                                <div>
                                  <div className="font-semibold text-slate-900">
                                    {app.name}
                                  </div>
                                  <div className="text-xs text-slate-500 font-mono">
                                    {app.regNo} • NISN: {app.nisn}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                                {app.track}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={app.btq}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setPpdbApplicants((prev) =>
                                    prev.map((item, i) =>
                                      i === origIdx ? { ...item, btq: val } : item
                                    )
                                  );
                                }}
                                className="w-16 px-2 py-1 text-center rounded-lg border border-slate-300 font-mono text-sm"
                              />
                            </td>
                            <td className="py-3 px-3 text-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={app.academic}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setPpdbApplicants((prev) =>
                                    prev.map((item, i) =>
                                      i === origIdx
                                        ? { ...item, academic: val }
                                        : item
                                    )
                                  );
                                }}
                                className="w-16 px-2 py-1 text-center rounded-lg border border-slate-300 font-mono text-sm"
                              />
                            </td>
                            <td className="py-3 px-3 text-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={app.interview}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setPpdbApplicants((prev) =>
                                    prev.map((item, i) =>
                                      i === origIdx
                                        ? { ...item, interview: val }
                                        : item
                                    )
                                  );
                                }}
                                className="w-16 px-2 py-1 text-center rounded-lg border border-slate-300 font-mono text-sm"
                              />
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="font-mono font-bold text-emerald-700 text-base">
                                {finalScore}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-col gap-1">
                                <select
                                  value={app.status}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setPpdbApplicants((prev) =>
                                      prev.map((item, i) =>
                                        i === origIdx
                                          ? { ...item, status: val }
                                          : item
                                      )
                                    );
                                  }}
                                  className="px-2 py-1 rounded-lg border border-slate-300 text-xs font-medium"
                                >
                                  <option value="MENUNGGU_VERIFIKASI">
                                    Menunggu Verifikasi
                                  </option>
                                  <option value="PERLU_REVISI">
                                    Perlu Revisi Berkas
                                  </option>
                                  <option value="DITERIMA">
                                    Diterima (Lulus)
                                  </option>
                                  <option value="CADANGAN">Cadangan</option>
                                  <option value="SUDAH_MIGRASI">
                                    Sudah Migrasi Buku Induk
                                  </option>
                                </select>
                                <select
                                  value={app.rombel}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setPpdbApplicants((prev) =>
                                      prev.map((item, i) =>
                                        i === origIdx
                                          ? { ...item, rombel: val }
                                          : item
                                      )
                                    );
                                  }}
                                  className="px-2 py-1 rounded-lg border border-slate-200 text-xs text-slate-600"
                                >
                                  <option value="VII-A">Target: VII-A</option>
                                  <option value="VII-B">Target: VII-B</option>
                                </select>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right space-y-1">
                              <button
                                onClick={() =>
                                  handleSavePpdbScore(app.regNo, origIdx)
                                }
                                className="w-full px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
                              >
                                Simpan Nilai
                              </button>
                              {app.status === "DITERIMA" && (
                                <button
                                  onClick={() =>
                                    handleOneClickMigrate(
                                      app.regNo,
                                      app.name,
                                      app.rombel
                                    )
                                  }
                                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1 transition"
                                >
                                  <span>Migrasi Buku Induk</span>
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL 2: PENYUSUNAN JADWAL ANTI-BENTROK (CONFLICT DETECTION)
      =================================================================== */}
      {activeModal === "schedule_conflict" && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
            <div className="px-6 py-4 bg-gradient-to-r from-amber-700 to-emerald-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/15 font-semibold">
                  Waka Kurikulum & Super Admin
                </span>
                <h2 className="text-lg font-bold mt-1">
                  Penyusunan Master Jadwal Pelajaran & Deteksi Bentrok Otomatis (Conflict Detection)
                </h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              <form
                onSubmit={handleAddSchedule}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Hari KBM
                    </label>
                    <select
                      value={newSchDay}
                      onChange={(e) => setNewSchDay(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    >
                      {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"].map(
                        (d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Jam Pelajaran
                    </label>
                    <select
                      value={newSchSlot}
                      onChange={(e) => setNewSchSlot(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="Jam ke 1–2 (07.30 – 08.50)">
                        Jam ke 1–2 (07.30 – 08.50)
                      </option>
                      <option value="Jam ke 3–4 (09.10 – 10.30)">
                        Jam ke 3–4 (09.10 – 10.30)
                      </option>
                      <option value="Jam ke 5–6 (10.45 – 12.05)">
                        Jam ke 5–6 (10.45 – 12.05)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Kelas / Rombel
                    </label>
                    <select
                      value={newSchRombel}
                      onChange={(e) => setNewSchRombel(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    >
                      {["VII-A", "VII-B", "VIII-A", "VIII-B", "IX-A", "IX-B"].map(
                        (r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Mata Pelajaran
                    </label>
                    <input
                      type="text"
                      value={newSchSubject}
                      onChange={(e) => setNewSchSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Guru Pengampu
                    </label>
                    <select
                      value={newSchTeacher}
                      onChange={(e) => setNewSchTeacher(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="Ust. Ahmad Fauzi, S.Pd.">
                        Ust. Ahmad Fauzi, S.Pd.
                      </option>
                      <option value="Budi Santoso, M.Pd.">
                        Budi Santoso, M.Pd.
                      </option>
                      <option value="M. Iqbal Maulana, S.Pd.">
                        M. Iqbal Maulana, S.Pd.
                      </option>
                      <option value="Fitriani Rahmawati, S.E.">
                        Fitriani Rahmawati, S.E.
                      </option>
                      <option value="Nurul Hidayah, S.Ag.">
                        Nurul Hidayah, S.Ag.
                      </option>
                    </select>
                  </div>
                </div>

                {conflictingSchedule ? (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                      <div>
                        <p className="font-bold text-xs uppercase tracking-wide text-rose-700">
                          Peringatan Deteksi Bentrok (Conflict Detected)
                        </p>
                        <p className="text-xs mt-0.5">
                          Tidak dapat menjadwalkan: <strong>{conflictingSchedule.teacher}</strong> / Kelas{" "}
                          <strong>{conflictingSchedule.rombel}</strong> sudah memiliki jadwal{" "}
                          <strong>{conflictingSchedule.subject}</strong> pada hari{" "}
                          <strong>{conflictingSchedule.day}</strong> ({conflictingSchedule.slot}).
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-rose-200/80 text-rose-900 text-xs font-bold shrink-0">
                      Diblokir Sistem
                    </span>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span className="text-xs font-medium">
                        Slot aman! <strong>{newSchTeacher}</strong> dan ruang kelas{" "}
                        <strong>{newSchRombel}</strong> tersedia pada {newSchDay} ({newSchSlot}).
                      </span>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shrink-0"
                    >
                      + Tambahkan ke Master Jadwal
                    </button>
                  </div>
                )}
              </form>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-xs uppercase">
                      <th className="py-2.5 px-4">Hari & Jam</th>
                      <th className="py-2.5 px-4">Rombel</th>
                      <th className="py-2.5 px-4">Mata Pelajaran</th>
                      <th className="py-2.5 px-4">Guru Pengampu</th>
                      <th className="py-2.5 px-4 text-right">Status Validasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {schedules.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-medium">
                          {s.day} • <span className="text-slate-500 text-xs">{s.slot}</span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 font-semibold text-xs">
                            {s.rombel}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-semibold">{s.subject}</td>
                        <td className="py-2.5 px-4">{s.teacher}</td>
                        <td className="py-2.5 px-4 text-right">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                            ✓ Bebas Bentrok
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL 3: MEJA KERJA GURU WALI / BK
      =================================================================== */}
      {activeModal === "bk_counseling" && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-900 to-emerald-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/15 font-semibold">
                  Tugas Tambahan: Guru Wali / Bimbingan Konseling (BK)
                </span>
                <h2 className="text-lg font-bold mt-1">
                  Meja Kerja Pembinaan Karakter, Poin Prestasi/Kedisiplinan & Konsultasi Orang Tua
                </h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 text-sm">
              <div className="lg:col-span-7 space-y-4">
                <form
                  onSubmit={handleAddBkRecord}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                >
                  <h3 className="font-bold text-slate-900">
                    + Catat Bimbingan Konseling / Poin Siswa Asuh
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Pilih Siswa Asuh
                      </label>
                      <select
                        value={bkStudent}
                        onChange={(e) => setBkStudent(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                      >
                        <option value="Muhammad Rizky Pratama (VIII-A)">
                          Muhammad Rizky Pratama (VIII-A)
                        </option>
                        <option value="Aisyah Zahra Kusuma (VII-B)">
                          Aisyah Zahra Kusuma (VII-B)
                        </option>
                        <option value="Nabila Khairunnisa (VII-A)">
                          Nabila Khairunnisa (VII-A)
                        </option>
                        <option value="Fajar Ramadhan Putra (IX-A)">
                          Fajar Ramadhan Putra (IX-A)
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Kategori Pembinaan
                      </label>
                      <select
                        value={bkCategory}
                        onChange={(e) => setBkCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                      >
                        <option value="Prestasi & Apresiasi (+Poin)">
                          Prestasi & Apresiasi (+Poin)
                        </option>
                        <option value="Bimbingan Akademik & Karakter">
                          Bimbingan Akademik & Karakter
                        </option>
                        <option value="Pembinaan Kedisiplinan / Pelanggaran (-Poin)">
                          Pembinaan Kedisiplinan (-Poin)
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Bobot Poin
                      </label>
                      <input
                        type="number"
                        value={bkPoints}
                        onChange={(e) => setBkPoints(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Rincian Catatan Bimbingan / Tindak Lanjut untuk Orang Tua
                    </label>
                    <textarea
                      rows={2}
                      value={bkNote}
                      onChange={(e) => setBkNote(e.target.value)}
                      placeholder="Tuliskan hasil observasi, apresiasi prestasi, atau catatan pembinaan siswa..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
                  >
                    Simpan & Terbitkan ke Portal Siswa / Ortu
                  </button>
                </form>

                <div className="space-y-2.5">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                    Riwayat Catatan Pembinaan & Poin Terkini
                  </h4>
                  {bkRecords.map((r) => (
                    <div
                      key={r.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {r.student}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {r.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{r.note}</p>
                        <span className="text-[11px] text-slate-400">
                          {r.date}
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold shrink-0 ${
                          r.points >= 0
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {r.points >= 0 ? `+${r.points}` : r.points} Poin
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                <div className="p-3.5 bg-slate-900 text-white">
                  <p className="font-bold text-xs">
                    Kanal Konsultasi Langsung Orang Tua / Wali
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Terhubung ke Dashboard Orang Tua
                  </p>
                </div>
                <div className="flex-1 p-3.5 space-y-3 overflow-y-auto max-h-72">
                  {bkChatThread.map((m, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl text-xs ${
                        m.role === "bk"
                          ? "bg-emerald-600 text-white ml-6"
                          : "bg-white border border-slate-200 text-slate-800 mr-6"
                      }`}
                    >
                      <div className="font-bold text-[11px] opacity-85 mb-1">
                        {m.sender} • {m.time}
                      </div>
                      <p>{m.text}</p>
                    </div>
                  ))}
                </div>
                <form
                  onSubmit={handleSendBkChat}
                  className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={bkReplyText}
                    onChange={(e) => setBkReplyText(e.target.value)}
                    placeholder="Ketik balasan untuk Orang Tua/Wali..."
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL 4: KENAIKAN KELAS MASSAL
      =================================================================== */}
      {activeModal === "batch_promotion" && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
            <div className="px-6 py-4 bg-gradient-to-r from-sky-900 to-emerald-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/15 font-semibold">
                  Modul Buku Induk Siswa Digital
                </span>
                <h2 className="text-lg font-bold mt-1">
                  Kenaikan Kelas Massal (Batch Promotion) & Kelulusan Akhir Tahun
                </h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-sm">
              <form
                onSubmit={handleBatchPromotion}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Rombel Asal (Tahun Ajaran Berjalan)
                    </label>
                    <select
                      value={fromRombel}
                      onChange={(e) => setFromRombel(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                    >
                      {["VII-A", "VII-B", "VIII-A", "VIII-B", "IX-A", "IX-B"].map(
                        (r) => (
                          <option key={r} value={r}>
                            Rombel {r}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Rombel Tujuan / Status Kelulusan
                    </label>
                    <select
                      value={toRombel}
                      onChange={(e) => setToRombel(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                    >
                      <option value="VIII-A">Naik ke Kelas VIII-A</option>
                      <option value="VIII-B">Naik ke Kelas VIII-B</option>
                      <option value="IX-A">Naik ke Kelas IX-A</option>
                      <option value="IX-B">Naik ke Kelas IX-B</option>
                      <option value="LULUS_ALUMNI">
                        Luluskan Menjadi Alumni (Kelas IX → Alumni)
                      </option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
                >
                  Proses Kenaikan Kelas Massal & Catat Riwayat Rombel di Supabase
                </button>
              </form>

              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Log Riwayat Batch Promotion Buku Induk
                </h4>
                {batchHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 font-medium"
                  >
                    ✓ {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL 5: CLOUDFLARE R2 STORAGE MANAGER
      =================================================================== */}
      {activeModal === "r2_uploader" && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-900 to-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                  Cloudflare R2 Object Storage (@aws-sdk/client-s3)
                </span>
                <h2 className="text-lg font-bold mt-1">
                  Manajemen Unggah Berkas Langsung ke Bucket R2 (simm-media)
                </h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <label className="block p-6 rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50/50 hover:bg-emerald-50 text-center cursor-pointer transition">
                <CloudUpload className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="font-bold text-emerald-950">
                  {r2Uploading
                    ? "Sedang Mengunggah ke Cloudflare R2..."
                    : "Klik untuk Memilih File dari Komputer & Unggah ke Cloudflare R2"}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Mendukung KK, Akta, Ijazah, SKL PPDB, Surat Izin Dokter, Bukti Komite (PDF/JPG/PNG)
                </p>
                <input
                  type="file"
                  onChange={handleDirectR2FileSelect}
                  disabled={r2Uploading}
                  className="hidden"
                />
              </label>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Berkas yang Baru Diunggah ke Bucket R2 (Sesi Ini)
                </h4>
                {r2UploadedFiles.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    Belum ada file yang diunggah pada sesi ini.
                  </p>
                ) : (
                  r2UploadedFiles.map((f, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="truncate">
                        <p className="font-mono font-semibold text-slate-900 truncate">
                          {f.key}
                        </p>
                        <p className="text-slate-500">
                          {Math.round(f.size / 1024)} KB • Diunggah pukul {f.time}
                        </p>
                      </div>
                      {f.url && f.url !== "#" && (
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold shrink-0"
                        >
                          Buka Presigned URL
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-emerald-500/40 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-xs">{toastMsg.title}</p>
            <p className="text-[11px] text-slate-300 mt-0.5">{toastMsg.sub}</p>
          </div>
        </div>
      )}
    </div>
  );
}
