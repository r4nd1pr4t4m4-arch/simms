"use client";

import React, { useMemo, useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  Wallet,
  HeartHandshake,
  UserCheck,
  Sparkles,
  RefreshCw,
  CreditCard,
  CheckCircle2,
  Clock,
  BookOpen,
  Users,
} from "lucide-react";
import DashboardLayout, { NavGroup } from "./DashboardLayout";
import {
  ActiveSession,
  SimmDbSummary,
  callSimmAction,
} from "@/types/simm";

interface StudentParentPortalViewProps {
  mode: "siswa" | "ortu";
  session: ActiveSession;
  db: SimmDbSummary;
  onRefresh: () => Promise<void>;
  onToast: (msg: string, tone?: "success" | "error" | "info") => void;
  onOpenChangePassword: () => void;
  onRequestLogout: () => void;
}

const MONTHS_12 = [
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
];

export default function StudentParentPortalView({
  mode,
  session,
  db,
  onRefresh,
  onToast,
  onOpenChangePassword,
  onRequestLogout,
}: StudentParentPortalViewProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [busy, setBusy] = useState(false);

  const studentsList = useMemo(() => db.students || [], [db.students]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    studentsList[0]?.id || ""
  );

  const activeStudent = useMemo(() => {
    if (studentsList.length === 0) {
      return {
        id: session.userId,
        name: session.name,
        nisn: session.nisn || session.identifier,
        nis: session.nis || "-",
        rombel: session.rombel || "-",
        status: "AKTIF",
        savingsBalance: 0,
        komitePaidMonths: [],
      };
    }
    return (
      studentsList.find((s: any) => s.id === selectedStudentId) ||
      studentsList[0]
    );
  }, [studentsList, selectedStudentId, session]);

  const [phoneDraft, setPhoneDraft] = useState(
    activeStudent?.parentPhone || ""
  );
  const [addressDraft, setAddressDraft] = useState(
    activeStudent?.address || ""
  );

  const rombelSchedules = useMemo(() => {
    const list = db.schedules || [];
    if (!activeStudent?.rombel) return list;
    return list.filter((s: any) => s.rombel === activeStudent.rombel);
  }, [db.schedules, activeStudent?.rombel]);

  const studentCounseling = useMemo(() => {
    const list = db.counselingNotes || [];
    return list.filter(
      (c: any) =>
        c.studentId === activeStudent?.id ||
        c.studentName?.toLowerCase() === activeStudent?.name?.toLowerCase()
    );
  }, [db.counselingNotes, activeStudent]);

  const totalBkPoints = useMemo(() => {
    return studentCounseling.reduce(
      (acc: number, item: any) => acc + (Number(item.points) || 0),
      0
    );
  }, [studentCounseling]);

  const komitePaidSet = useMemo(() => {
    const raw = activeStudent?.komitePaidMonths;
    if (Array.isArray(raw)) return new Set(raw);
    return new Set<string>();
  }, [activeStudent]);

  const navGroups: NavGroup[] = useMemo(
    () => [
      {
        title: mode === "ortu" ? "Portal Orang Tua / Wali" : "Portal Siswa",
        items: [
          { key: "overview", label: "Ringkasan Akademik", icon: LayoutDashboard },
          {
            key: "schedule",
            label: "Jadwal Pelajaran",
            icon: Calendar,
            badge: String(rombelSchedules.length),
            badgeTone: "sky",
          },
          {
            key: "finance",
            label: "Tabungan & Komite",
            icon: Wallet,
          },
          {
            key: "counseling",
            label: "Catatan BK & Poin",
            icon: HeartHandshake,
            badge: String(studentCounseling.length),
            badgeTone: totalBkPoints >= 0 ? "emerald" : "amber",
          },
          {
            key: "biodata",
            label: "Buku Induk & Biodata",
            icon: UserCheck,
          },
        ],
      },
    ],
    [mode, rombelSchedules.length, studentCounseling.length, totalBkPoints]
  );

  const handleSaveBiodata = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await callSimmAction("UPDATE_STUDENT_BIODATA", {
        studentId: activeStudent.id,
        parentPhone: phoneDraft,
        address: addressDraft,
      });
      if (!res.ok) throw new Error(res.error || "Gagal memperbarui biodata.");
      onToast("Pembaruan biodata berhasil disimpan!", "success");
      await onRefresh();
    } catch (err: any) {
      onToast(err.message || "Gagal menyimpan biodata.", "error");
    } finally {
      setBusy(false);
    }
  };

  const tabMeta: Record<string, { title: string; subtitle: string }> = {
    overview: {
      title: `Ringkasan Siswa: ${activeStudent.name}`,
      subtitle: `${db.profile.name} • Rombel ${activeStudent.rombel || "-"} • TA ${db.profile.academicYear}`,
    },
    schedule: {
      title: `Jadwal Pelajaran Rombel ${activeStudent.rombel || "-"}`,
      subtitle: `Semester ${db.profile.semester} • ${db.profile.academicYear}`,
    },
    finance: {
      title: "Tabungan Siswa & Iuran Komite",
      subtitle: "Rekapitulasi pembayaran 12 bulan & informasi rekening madrasah",
    },
    counseling: {
      title: "Catatan Bimbingan Konseling (BK)",
      subtitle: "Pembinaan karakter, prestasi & poin kedisiplinan",
    },
    biodata: {
      title: "Buku Induk Peserta Didik",
      subtitle: "Identitas resmi & pembaruan kontak orang tua",
    },
  };

  const currentMeta = tabMeta[activeTab] || tabMeta.overview;

  return (
    <DashboardLayout
      portalBadge={mode === "ortu" ? "Portal Orang Tua" : "Portal Siswa"}
      portalSubtitle={db.profile.name}
      profile={db.profile}
      session={session}
      navGroups={navGroups}
      activeMenu={activeTab}
      onSelectMenu={setActiveTab}
      pageBreadcrumb={currentMeta.subtitle}
      pageTitle={currentMeta.title}
      onOpenChangePassword={onOpenChangePassword}
      onRequestLogout={onRequestLogout}
    >
      {mode === "ortu" && studentsList.length > 1 && (
        <div className="mb-4 flex items-center justify-between bg-white rounded-2xl border border-slate-200 px-4 py-3">
          <span className="text-xs font-bold text-slate-600">
            Pilih Putra/Putri:
          </span>
          <select
            value={activeStudent.id}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800"
          >
            {studentsList.map((st: any) => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.rombel})
              </option>
            ))}
          </select>
        </div>
      )}
      {/* OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div
            className={`rounded-2xl p-6 text-white shadow-lg bg-gradient-to-br ${
              mode === "ortu"
                ? "from-amber-600 via-amber-700 to-orange-800"
                : "from-sky-600 via-sky-700 to-blue-900"
            }`}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              {mode === "ortu" ? "Pantauan Wali Murid" : "Akun Peserta Didik"}
            </span>
            <h2 className="text-2xl font-black tracking-tight">
              {activeStudent.name}
            </h2>
            <p className="text-sm text-white/90 mt-1">
              NISN: <strong>{activeStudent.nisn || "-"}</strong> • Kelas / Rombel:{" "}
              <strong>{activeStudent.rombel || "-"}</strong> • Status:{" "}
              <strong>{activeStudent.status || "AKTIF"}</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-500 uppercase">
                Rombel Aktif
              </p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {activeStudent.rombel || "-"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                TA {db.profile.academicYear}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-500 uppercase">
                Saldo Tabungan
              </p>
              <p className="text-2xl font-black text-emerald-700 mt-1">
                Rp {Number(activeStudent.savingsBalance || 0).toLocaleString("id-ID")}
              </p>
              <p className="text-xs text-slate-500 mt-1">Tercatat di TU</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-500 uppercase">
                Komite Lunas
              </p>
              <p className="text-2xl font-black text-sky-700 mt-1">
                {komitePaidSet.size} / 12 Bulan
              </p>
              <p className="text-xs text-slate-500 mt-1">Tahun berjalan</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-500 uppercase">
                Catatan BK
              </p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {studentCounseling.length} Catatan
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Akumulasi poin: {totalBkPoints}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE */}
      {activeTab === "schedule" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-base font-extrabold text-slate-900 mb-4">
            Jadwal Pelajaran Rombel {activeStudent.rombel}
          </h3>
          {rombelSchedules.length === 0 ? (
            <p className="text-sm text-slate-500">
              Belum ada jadwal pelajaran yang dipublikasikan untuk rombel ini.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {rombelSchedules.map((s: any, idx: number) => (
                <div
                  key={s.id || idx}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-sky-700 mb-1">
                    <span>{s.day}</span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      {s.timeSlot}
                    </span>
                  </div>
                  <p className="text-sm font-extrabold text-slate-900">
                    {s.subject}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Guru: {s.teacherName || "-"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FINANCE */}
      {activeTab === "finance" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Informasi Rekening Resmi Komite Madrasah
                </h3>
                <p className="text-xs text-slate-500">
                  Gunakan rekening resmi berikut untuk transfer pembayaran komite.
                </p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800">
              {db.profile.komiteBankInfo || "Hubungi Tata Usaha madrasah."}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-base font-extrabold text-slate-900 mb-4">
              Status Iuran Komite 12 Bulan
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {MONTHS_12.map((m) => {
                const paid = komitePaidSet.has(m);
                return (
                  <div
                    key={m}
                    className={`p-3.5 rounded-xl border text-center ${
                      paid
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <p className="text-xs font-extrabold">{m}</p>
                    <p className="text-[11px] font-bold mt-1 flex items-center justify-center gap-1">
                      {paid ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Lunas
                        </>
                      ) : (
                        "Belum"
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* COUNSELING */}
      {activeTab === "counseling" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-base font-extrabold text-slate-900 mb-4">
            Riwayat Catatan BK ({studentCounseling.length})
          </h3>
          {studentCounseling.length === 0 ? (
            <p className="text-sm text-slate-500">
              Tidak ada catatan bimbingan konseling. Terus pertahankan prestasi!
            </p>
          ) : (
            <div className="space-y-3">
              {studentCounseling.map((c: any, idx: number) => (
                <div
                  key={c.id || idx}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50"
                >
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="text-sky-700">{c.category}</span>
                    <span className="text-slate-500">{c.points} Poin</span>
                  </div>
                  <p className="text-sm text-slate-800">{c.note}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BIODATA */}
      {activeTab === "biodata" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-2xl">
          <h3 className="text-base font-extrabold text-slate-900 mb-4">
            Biodata Buku Induk Siswa
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mb-6">
            <div className="p-3 rounded-xl bg-slate-50">
              <span className="text-slate-400 block">Nama Lengkap</span>
              <span className="font-bold text-slate-900 text-sm">
                {activeStudent.name}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <span className="text-slate-400 block">NISN / NIS</span>
              <span className="font-bold text-slate-900 text-sm">
                {activeStudent.nisn || "-"} / {activeStudent.nis || "-"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <span className="text-slate-400 block">Rombel</span>
              <span className="font-bold text-slate-900 text-sm">
                {activeStudent.rombel || "-"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <span className="text-slate-400 block">Status</span>
              <span className="font-bold text-emerald-700 text-sm">
                {activeStudent.status || "AKTIF"}
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveBiodata} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nomor HP / WhatsApp Orang Tua
              </label>
              <input
                type="text"
                value={phoneDraft}
                onChange={(e) => setPhoneDraft(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alamat Domisili Terbaru
              </label>
              <textarea
                rows={2}
                value={addressDraft}
                onChange={(e) => setAddressDraft(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
            >
              Simpan Perubahan Kontak
            </button>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
}
