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
} from "lucide-react";

export type PortalKey =
  | "publik"
  | "ppdb"
  | "admin"
  | "tu"
  | "gtk"
  | "siswa"
  | "ortu";

interface PortalTab {
  key: PortalKey;
  label: string;
  sublabel: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeColor: string;
}

const PORTAL_TABS: PortalTab[] = [
  {
    key: "publik",
    label: "Halaman Publik",
    sublabel: "CMS & Live Piket",
    href: "/",
    icon: Globe,
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  {
    key: "ppdb",
    label: "Portal PPDB",
    sublabel: "End-to-End R2",
    href: "/ppdb",
    icon: UserPlus,
    badgeColor: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  },
  {
    key: "admin",
    label: "Super Admin",
    sublabel: "RBAC & Inval",
    href: "/admin",
    icon: ShieldCheck,
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
  {
    key: "tu",
    label: "Tata Usaha (TU)",
    sublabel: "Buku Induk & EMIS",
    href: "/tu",
    icon: FileSpreadsheet,
    badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  },
  {
    key: "gtk",
    label: "Guru & GTK",
    sublabel: "Dynamic RBAC",
    href: "/gtk",
    icon: GraduationCap,
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  },
  {
    key: "siswa",
    label: "Portal Siswa",
    sublabel: "KBM & Tabungan",
    href: "/siswa",
    icon: Users,
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  },
  {
    key: "ortu",
    label: "Orang Tua / Wali",
    sublabel: "Multi-Child Sync",
    href: "/ortu",
    icon: HeartHandshake,
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  },
];

type ExtendedModalType =
  | null
  | "ppdb_scoring"
  | "schedule_conflict"
  | "bk_counseling"
  | "batch_promotion"
  | "r2_uploader";

export default function SimmWorkspaceShell({
  activePortal,
}: {
  activePortal: PortalKey;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [barCollapsed, setBarCollapsed] = useState(false);
  const [activeModal, setActiveModal] = useState<ExtendedModalType>(null);
  const [toastMsg, setToastMsg] = useState<{ title: string; sub: string } | null>(
    null
  );

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

  // State Modul 2: Penyusunan Jadwal Pelajaran Anti-Bentrok (Conflict Detection)
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

  // State Modul 4: Kenaikan Kelas Massal (Batch Promotion)
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

  // Dengarkan event postMessage dari iframe portal
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.source !== "SIMM_PORTAL") return;

      if (data.type === "NAVIGATE" && data.payload?.path) {
        router.push(data.payload.path);
      } else if (data.type === "AUTH_SUCCESS" && data.payload?.targetPath) {
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

  const handleOneClickMigrate = async (regNo: string, name: string, rombel: string) => {
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
      prev.map((a) => (a.regNo === regNo ? { ...a, status: "SUDAH_MIGRASI" } : a))
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
    triggerToast("Pesan Terkirim ke Orang Tua", "Balasan konsultasi BK telah diteruskan ke portal Orang Tua.");
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

  const handleDirectR2FileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          TOP GLOBAL SIMS NAVIGATION & EXTENDED SPECIFICATION TOOLBAR
      =================================================================== */}
      {!barCollapsed ? (
        <header className="z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-200 shadow-lg">
          {/* Left: Brand & Portal Switcher Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <div className="flex items-center gap-2 pr-2 mr-1 border-r border-slate-700/80 shrink-0">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold tracking-tight text-white">
                SIMS MTs Nurul Falah
              </span>
              <span className="hidden xl:inline-block text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                Supabase + R2 Live
              </span>
            </div>

            {PORTAL_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive =
                activePortal === tab.key || pathname === tab.href;
              return (
                <button
                  key={tab.key}
                  onClick={() => router.push(tab.href)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition shrink-0 border ${
                    isActive
                      ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                      : "bg-slate-800/70 hover:bg-slate-800 text-slate-300 border-slate-700/70"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right: 4 Extended Specification Modules + Direct R2 Upload */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="hidden 2xl:inline text-[11px] text-slate-400 mr-1">
              Modul Spesifikasi Tambahan:
            </span>

            <button
              onClick={() => setActiveModal("ppdb_scoring")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 font-medium transition"
              title="Meja Kerja Panitia PPDB: Input Skor Seleksi BTQ/Tahfidz, TPA, Wawancara & Perankingan"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Skor & Ranking PPDB</span>
            </button>

            <button
              onClick={() => setActiveModal("schedule_conflict")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-medium transition"
              title="Waka Kurikulum & Admin: Penyusunan Jadwal Pelajaran dengan Conflict Detection"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Jadwal Anti-Bentrok</span>
            </button>

            <button
              onClick={() => setActiveModal("bk_counseling")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 font-medium transition"
              title="Meja Kerja Guru Wali / BK: Input Catatan Pembinaan, Poin & Chat Orang Tua"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Meja Kerja BK</span>
            </button>

            <button
              onClick={() => setActiveModal("batch_promotion")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 font-medium transition"
              title="Buku Induk: Kenaikan Kelas Massal (Batch Promotion) & Alumni"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Kenaikan Kelas Massal</span>
            </button>

            <button
              onClick={() => setActiveModal("r2_uploader")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-medium transition"
              title="Uji & Kelola Unggahan Langsung ke Bucket Cloudflare R2 (simm-media)"
            >
              <CloudUpload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cloudflare R2</span>
            </button>

            <button
              onClick={() => setBarCollapsed(true)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
              title="Sembunyikan Bilah Navigasi Portal"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>
      ) : (
        <button
          onClick={() => setBarCollapsed(false)}
          className="fixed top-2 right-3 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-emerald-300 border border-emerald-500/40 text-xs font-semibold shadow-lg backdrop-blur-md transition"
        >
          <Database className="w-3.5 h-3.5" />
          <span>Pindah Portal / Modul SIMS</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      )}

      {/* ===================================================================
          MAIN PORTAL VIEWPORT (100% PROTOTYPE FIDELITY + R2/SUPABASE BRIDGE)
      =================================================================== */}
      <main className="relative flex-1 w-full h-full bg-slate-50 overflow-hidden">
        <iframe
          key={activePortal}
          src={`/api/portal/${activePortal}`}
          title={`Portal SIMS - ${activePortal.toUpperCase()}`}
          className="w-full h-full border-0"
        />
      </main>

      {/* ===================================================================
          MODAL 1: MEJA KERJA PANITIA PPDB (INPUT SKOR SELEKSI & PERANKINGAN)
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

                {/* Indikator Real-Time Conflict Detection */}
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
          MODAL 3: MEJA KERJA GURU WALI / BK (POIN, KONSELING & CHAT ORTU)
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
              {/* Left 7 cols: Input Catatan BK & Poin */}
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

              {/* Right 5 cols: Direct Messaging dengan Orang Tua */}
              <div className="lg:col-span-5 flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                <div className="p-3.5 bg-slate-900 text-white">
                  <p className="font-bold text-xs">
                    Kanal Konsultasi Langsung Orang Tua / Wali
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Terhubung ke Dashboard Orang Tua (Bapak Hendra Kusuma, S.T.)
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
          MODAL 4: KENAIKAN KELAS MASSAL (BATCH PROMOTION BUKU INDUK)
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
          MODAL 5: CLOUDFLARE R2 STORAGE MANAGER (BUCKET: simm-media)
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
                    Belum ada file yang diunggah pada sesi ini. Anda dapat mengunggah dari sini atau langsung melalui tombol unggah R2 di dalam 7 portal.
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
