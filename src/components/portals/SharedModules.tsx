"use client";

import React, { useMemo, useState } from "react";
import {
  ActiveSession,
  PortalDbSummary,
  callSimmAction,
} from "./types";

export type SharedModuleKey =
  | "piket_management"
  | "academic_master"
  | "academic_period"
  | "golive_settings"
  | "ppdb_scoring"
  | "schedule_conflict"
  | "bk_counseling"
  | "batch_promotion"
  | "tu_persuratan"
  | "tu_agenda"
  | "tu_emis"
  | "r2_uploader";

interface SharedModulesProps {
  moduleKey: SharedModuleKey;
  db: PortalDbSummary;
  session: ActiveSession | null;
  onRefresh: () => Promise<void> | void;
  triggerToast: (title: string, sub: string) => void;
  onSelectView?: (viewKey: string) => void;
}

const DAY_LIST = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;

export default function SharedModules({
  moduleKey,
  db,
  session,
  onRefresh,
  triggerToast,
  onSelectView,
}: SharedModulesProps) {
  const [busy, setBusy] = useState(false);

  const profile = db.profile;
  const master = db.academicMaster || {
    gradeLevels: [],
    rombels: [],
    subjects: [],
  };
  const teachers = db.teachers || [];
  const students = db.students || [];
  const ppdbList = db.ppdb || [];
  const schedules = db.schedules || [];
  const counselingNotes = db.counselingNotes || [];
  const serviceRequests = db.serviceRequests || [];
  const mailAgenda = db.mailAgenda || [];
  const archives = db.academicArchives || [];
  const dutySchedules = db.dutySchedules || [];
  const piketIncidents = db.piketIncidents || [];

  const rombelNames = useMemo(() => {
    const names = (master.rombels || []).map((r) => r.name);
    return names.length > 0 ? names : ["7A", "8A", "9A"];
  }, [master.rombels]);

  const subjectNames = useMemo(() => {
    const names = (master.subjects || []).map((s) => s.name);
    return names.length > 0
      ? names
      : ["Al-Qur'an Hadits", "Fiqih", "Bahasa Indonesia", "Matematika", "IPA"];
  }, [master.subjects]);

  // ========== 1. PIKET MANAGEMENT STATE ==========
  const [piketDay, setPiketDay] = useState<string>("Senin");
  const [piketOverrideDate, setPiketOverrideDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [piketSelectedTeacher, setPiketSelectedTeacher] = useState<string>("");
  const [piketNote, setPiketNote] = useState<string>("");
  const [incCategory, setIncCategory] = useState<string>("Keterlambatan");
  const [incTargetType, setIncTargetType] = useState<"Siswa" | "Guru" | "Umum">("Siswa");
  const [incTargetName, setIncTargetName] = useState<string>("");
  const [incRombel, setIncRombel] = useState<string>("7A");
  const [incDetail, setIncDetail] = useState<string>("");

  // ========== 2. ACADEMIC MASTER STATE ==========
  const [masterTab, setMasterTab] = useState<"levels" | "rombels" | "subjects">("levels");
  const [newLevelCode, setNewLevelCode] = useState("");
  const [newLevelName, setNewLevelName] = useState("");
  const [newLevelOrder, setNewLevelOrder] = useState("1");
  const [newRombelName, setNewRombelName] = useState("");
  const [newRombelLevel, setNewRombelLevel] = useState("");
  const [newRombelWali, setNewRombelWali] = useState("");
  const [newRombelCap, setNewRombelCap] = useState("32");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCat, setNewSubjectCat] = useState("PAI & Bahasa Arab");
  const [newSubjectJtm, setNewSubjectJtm] = useState("2");

  // ========== 3. ACADEMIC PERIOD TRANSITION STATE ==========
  const [nextYear, setNextYear] = useState("2027/2028");
  const [nextSemester, setNextSemester] = useState<"Ganjil" | "Genap">("Genap");
  const [periodNotes, setPeriodNotes] = useState("");
  const [autoPromote, setAutoPromote] = useState(false);

  // ========== 4. GO-LIVE SETTINGS STATE ==========
  const [goLiveTab, setGoLiveTab] = useState<"identitas" | "import_csv" | "reset_data">("identitas");
  const [profileForm, setProfileForm] = useState({
    name: profile?.name || "MTs Nurul Falah",
    nsm: profile?.nsm || "121216050060",
    npsn: profile?.npsn || "69963460",
    accreditation: profile?.accreditation || "Terakreditasi C",
    curriculum: profile?.curriculum || "Kurikulum Merdeka & KMA 450",
    headmasterName: profile?.headmasterName || "",
    headmasterNip: profile?.headmasterNip || "",
    tuHeadName: profile?.tuHeadName || "-",
    tuHeadNip: profile?.tuHeadNip || "-",
    address: profile?.address || "",
    phone: profile?.phone || "-",
    email: profile?.email || "",
    gpsLat: profile?.gpsLat || "-3.0659978",
    gpsLng: profile?.gpsLng || "102.8196529",
    gpsRadiusMeters: profile?.gpsRadiusMeters || 100,
    komiteBankInfo: profile?.komiteBankInfo || "",
  });
  const [adminPasswordForProfile, setAdminPasswordForProfile] = useState("");
  const [importTarget, setImportTarget] = useState<"students" | "teachers">("students");
  const [csvText, setCsvText] = useState("");
  const [resetConfirmText, setResetConfirmText] = useState("");

  // ========== 5. PPDB SCORING STATE ==========
  const [ppdbScores, setPpdbScores] = useState<Record<string, { score: string; status: string }>>({});

  // ========== 6. SCHEDULE CONFLICT STATE ==========
  const [schedDay, setSchedDay] = useState<string>("Senin");
  const [schedRombel, setSchedRombel] = useState<string>(rombelNames[0] || "7A");
  const [schedSubject, setSchedSubject] = useState<string>(subjectNames[0] || "Fiqih");
  const [schedTeacher, setSchedTeacher] = useState<string>(teachers[0]?.name || "");
  const [schedStart, setSchedStart] = useState("07:30");
  const [schedEnd, setSchedEnd] = useState("08:50");
  const [schedRoom, setSchedRoom] = useState("Ruang Kelas");

  // ========== 7. BK COUNSELING STATE ==========
  const [bkStudentId, setBkStudentId] = useState<string>(students[0]?.id || "");
  const [bkCategory, setBkCategory] = useState("Pembinaan Disiplin");
  const [bkSummary, setBkSummary] = useState("");
  const [bkFollowUp, setBkFollowUp] = useState("");
  const [bkPoints, setBkPoints] = useState("5");

  // ========== 8. BATCH PROMOTION STATE ==========
  const [promoSourceRombel, setPromoSourceRombel] = useState<string>(rombelNames[0] || "7A");
  const [promoTargetRombel, setPromoTargetRombel] = useState<string>(rombelNames[1] || "8A");
  const [promoActionType, setPromoActionType] = useState<"Naik Kelas" | "Lulus / Alumni">("Naik Kelas");

  // ========== 9. TU PERSURATAN & AGENDA STATE ==========
  const [mailDirection, setMailDirection] = useState<"Surat Masuk" | "Surat Keluar">("Surat Keluar");
  const [mailNumber, setMailNumber] = useState("");
  const [mailPartner, setMailPartner] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailDate, setMailDate] = useState(new Date().toISOString().slice(0, 10));

  // ========== 10. R2 UPLOADER STATE ==========
  const [r2StudentId, setR2StudentId] = useState<string>(students[0]?.id || "");
  const [r2DocType, setR2DocType] = useState("Kartu Keluarga (KK)");
  const [r2File, setR2File] = useState<File | null>(null);

  const runAction = async (
    action: string,
    payload: Record<string, unknown>,
    successTitle: string,
    successSub: string,
    after?: () => void
  ) => {
    setBusy(true);
    try {
      const res = await callSimmAction(action, payload);
      if (res.ok) {
        triggerToast(successTitle, successSub);
        after?.();
        await onRefresh();
      } else {
        triggerToast("Gagal Memproses", res.error || "Terjadi kesalahan.");
      }
    } catch {
      triggerToast("Koneksi Bermasalah", "Tidak dapat menghubungi server SIMMS.");
    } finally {
      setBusy(false);
    }
  };

  // =========================================================
  // RENDER: PIKET MANAGEMENT
  // =========================================================
  if (moduleKey === "piket_management") {
    const daySchedule = dutySchedules.find((d) => d.day === piketDay);
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-surface rounded-2xl p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Jadwal & Pergantian Guru Piket</h3>
                <p className="text-xs text-slate-500">
                  Atur koordinator piket harian atau override khusus tanggal tertentu.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                {dutySchedules.length} Hari Terjadwal
              </span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Hari Piket</label>
                  <select
                    value={piketDay}
                    onChange={(e) => setPiketDay(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    {DAY_LIST.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Tanggal Override (Opsional)</label>
                  <input
                    type="date"
                    value={piketOverrideDate}
                    onChange={(e) => setPiketOverrideDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Pilih Guru Piket ({daySchedule ? `Saat ini: ${daySchedule.teachers.join(", ")}` : "Belum diatur"})
                </label>
                <select
                  value={piketSelectedTeacher}
                  onChange={(e) => setPiketSelectedTeacher(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  <option value="">-- Pilih GTK --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name} ({t.subject})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Catatan Tugas Piket</label>
                <input
                  type="text"
                  value={piketNote}
                  onChange={(e) => setPiketNote(e.target.value)}
                  placeholder="Contoh: Monitoring apel pagi & jam pertama"
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || !piketSelectedTeacher}
                  onClick={() =>
                    runAction(
                      "SAVE_DAILY_DUTY_SCHEDULE",
                      {
                        day: piketDay,
                        teachers: [piketSelectedTeacher],
                        notes: piketNote || `Jadwal piket rutin hari ${piketDay}`,
                      },
                      "Jadwal Piket Disimpan",
                      `${piketSelectedTeacher} ditetapkan sebagai piket hari ${piketDay}.`,
                      () => setPiketNote("")
                    )
                  }
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50"
                >
                  Simpan Jadwal Rutin
                </button>
                <button
                  type="button"
                  disabled={busy || !piketSelectedTeacher || !piketOverrideDate}
                  onClick={() =>
                    runAction(
                      "OVERRIDE_DAILY_DUTY",
                      {
                        date: piketOverrideDate,
                        replacementTeacher: piketSelectedTeacher,
                        reason: piketNote || "Pergantian petugas piket harian",
                      },
                      "Override Piket Aktif",
                      `${piketSelectedTeacher} bertugas pada ${piketOverrideDate}.`
                    )
                  }
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-50"
                >
                  Override Tanggal Ini
                </button>
              </div>
            </div>
          </div>

          <div className="glass-surface rounded-2xl p-6 shadow-soft">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Catat Kejadian / Log Piket</h3>
            <p className="text-xs text-slate-500 mb-4">
              Dokumentasikan keterlambatan, izin pulang, atau laporan kelas kosong.
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Kategori</label>
                  <select
                    value={incCategory}
                    onChange={(e) => setIncCategory(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="Keterlambatan">Keterlambatan</option>
                    <option value="Izin Pulang Cepat">Izin Pulang Cepat</option>
                    <option value="Guru Pengganti">Guru Pengganti / Kelas Kosong</option>
                    <option value="Kejadian Umum">Kejadian Umum</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Subjek</label>
                  <select
                    value={incTargetType}
                    onChange={(e) => setIncTargetType(e.target.value as "Siswa" | "Guru" | "Umum")}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="Siswa">Siswa</option>
                    <option value="Guru">Guru</option>
                    <option value="Umum">Umum</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={incTargetName}
                  onChange={(e) => setIncTargetName(e.target.value)}
                  placeholder="Nama siswa / guru"
                  className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
                <select
                  value={incRombel}
                  onChange={(e) => setIncRombel(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  {rombelNames.map((r) => (
                    <option key={r} value={r}>
                      Kelas {r}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                rows={3}
                value={incDetail}
                onChange={(e) => setIncDetail(e.target.value)}
                placeholder="Kronologi & tindak lanjut piket..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <button
                type="button"
                disabled={busy || !incTargetName.trim() || !incDetail.trim()}
                onClick={() =>
                  runAction(
                    "CREATE_PIKET_INCIDENT",
                    {
                      category: incCategory,
                      targetType: incTargetType,
                      targetName: incTargetName.trim(),
                      rombel: incRombel,
                      description: incDetail.trim(),
                      recordedBy: session?.name || "Petugas Piket",
                    },
                    "Log Piket Tercatat",
                    "Laporan kejadian berhasil disimpan ke buku piket.",
                    () => {
                      setIncTargetName("");
                      setIncDetail("");
                    }
                  )
                }
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold disabled:opacity-50"
              >
                Simpan Laporan Piket
              </button>
            </div>
          </div>
        </div>

        <div className="glass-surface rounded-2xl p-6 shadow-soft">
          <h4 className="text-sm font-bold text-slate-800 mb-3">Rekap Jadwal & Log Kejadian Piket Terbaru</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
            {DAY_LIST.map((day) => {
              const found = dutySchedules.find((d) => d.day === day);
              return (
                <div key={day} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="text-xs font-bold text-emerald-700">{day}</div>
                  <div className="text-xs text-slate-700 mt-1 font-medium truncate">
                    {found?.teachers?.length ? found.teachers.join(", ") : "Belum diatur"}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {piketIncidents.length === 0 ? (
              <p className="text-xs text-slate-500">Belum ada log kejadian piket tercatat.</p>
            ) : (
              piketIncidents.slice(0, 12).map((inc) => (
                <div
                  key={inc.id}
                  className="flex items-start justify-between gap-4 p-3 rounded-xl bg-white border border-slate-100"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      [{inc.category}] {inc.targetName} ({inc.rombel || inc.targetType})
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{inc.description}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">{inc.date}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER: ACADEMIC MASTER (TINGKAT, ROMBEL, MAPEL)
  // =========================================================
  if (moduleKey === "academic_master") {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "levels", label: `Tingkat Kelas (${master.gradeLevels.length})` },
            { id: "rombels", label: `Rombel / Kelas (${master.rombels.length})` },
            { id: "subjects", label: `Mata Pelajaran (${master.subjects.length})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMasterTab(t.id as "levels" | "rombels" | "subjects")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                masterTab === t.id
                  ? "bg-emerald-600 text-white shadow-soft"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {masterTab === "levels" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-surface rounded-2xl p-5 shadow-soft space-y-3">
              <h3 className="text-base font-bold text-slate-900">Tambah Tingkat Kelas</h3>
              <input
                type="text"
                placeholder="Kode Tingkat (misal: 7)"
                value={newLevelCode}
                onChange={(e) => setNewLevelCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <input
                type="text"
                placeholder="Nama Tingkat (misal: Kelas VII)"
                value={newLevelName}
                onChange={(e) => setNewLevelName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <input
                type="number"
                placeholder="Urutan"
                value={newLevelOrder}
                onChange={(e) => setNewLevelOrder(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <button
                type="button"
                disabled={busy || !newLevelCode.trim() || !newLevelName.trim()}
                onClick={() =>
                  runAction(
                    "ADD_GRADE_LEVEL",
                    {
                      code: newLevelCode.trim(),
                      label: newLevelName.trim(),
                      phase: "D",
                      isFinalGrade: newLevelCode.trim() === "9",
                    },
                    "Tingkat Kelas Ditambahkan",
                    `${newLevelName} siap digunakan untuk rombel.`,
                    () => {
                      setNewLevelCode("");
                      setNewLevelName("");
                    }
                  )
                }
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                Simpan Tingkat Kelas
              </button>
            </div>
            <div className="lg:col-span-2 glass-surface rounded-2xl p-5 shadow-soft">
              <h4 className="text-sm font-bold text-slate-800 mb-3">Daftar Tingkat Kelas Aktif</h4>
              <div className="space-y-2">
                {master.gradeLevels.map((lvl) => (
                  <div key={lvl.code} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{lvl.label}</span>
                      <span className="ml-2 text-xs text-slate-500">Kode: {lvl.code} • Fase {lvl.phase}</span>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        runAction(
                          "DELETE_GRADE_LEVEL",
                          { code: lvl.code },
                          "Tingkat Dihapus",
                          `${lvl.label} dihapus dari master.`
                        )
                      }
                      className="text-xs font-semibold text-rose-600 hover:underline"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {masterTab === "rombels" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-surface rounded-2xl p-5 shadow-soft space-y-3">
              <h3 className="text-base font-bold text-slate-900">Tambah Rombel</h3>
              <input
                type="text"
                placeholder="Nama Rombel (misal: 7B)"
                value={newRombelName}
                onChange={(e) => setNewRombelName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <select
                value={newRombelLevel}
                onChange={(e) => setNewRombelLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="">-- Pilih Tingkat --</option>
                {master.gradeLevels.map((g) => (
                  <option key={g.code} value={g.code}>
                    {g.label} ({g.code})
                  </option>
                ))}
              </select>
              <select
                value={newRombelWali}
                onChange={(e) => setNewRombelWali(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="">-- Pilih Wali Kelas --</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Kapasitas Siswa"
                value={newRombelCap}
                onChange={(e) => setNewRombelCap(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <button
                type="button"
                disabled={busy || !newRombelName.trim()}
                onClick={() =>
                  runAction(
                    "ADD_ROMBEL",
                    {
                      code: newRombelName.trim().toUpperCase(),
                      name: newRombelName.trim(),
                      gradeCode: newRombelLevel || master.gradeLevels[0]?.code || "7",
                      waliKelas: newRombelWali || "-",
                      room: `R.${newRombelName.trim()}`,
                      quota: Number(newRombelCap || 32),
                    },
                    "Rombel Ditambahkan",
                    `Rombel ${newRombelName} kini tersedia di seluruh menu.`,
                    () => setNewRombelName("")
                  )
                }
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                Simpan Rombel
              </button>
            </div>
            <div className="lg:col-span-2 glass-surface rounded-2xl p-5 shadow-soft">
              <h4 className="text-sm font-bold text-slate-800 mb-3">Daftar Rombel Aktif</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {master.rombels.map((r) => (
                  <div key={r.code} className="p-3.5 rounded-xl bg-white border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">Kelas {r.name}</div>
                      <div className="text-xs text-slate-500">Wali: {r.waliKelas} • Kuota {r.quota}</div>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        runAction(
                          "DELETE_ROMBEL",
                          { code: r.code },
                          "Rombel Dihapus",
                          `Kelas ${r.name} dihapus.`
                        )
                      }
                      className="text-xs font-semibold text-rose-600 hover:underline"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {masterTab === "subjects" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-surface rounded-2xl p-5 shadow-soft space-y-3">
              <h3 className="text-base font-bold text-slate-900">Tambah Mata Pelajaran</h3>
              <input
                type="text"
                placeholder="Kode Mapel (misal: QHD)"
                value={newSubjectCode}
                onChange={(e) => setNewSubjectCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <input
                type="text"
                placeholder="Nama Mata Pelajaran"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <select
                value={newSubjectCat}
                onChange={(e) => setNewSubjectCat(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="PAI & Bahasa Arab (KMA 450)">PAI & Bahasa Arab (KMA 450)</option>
                <option value="Umum (Kurikulum Merdeka)">Umum (Kurikulum Merdeka)</option>
                <option value="Muatan Lokal">Muatan Lokal</option>
              </select>
              <input
                type="number"
                placeholder="JP / Minggu"
                value={newSubjectJtm}
                onChange={(e) => setNewSubjectJtm(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <button
                type="button"
                disabled={busy || !newSubjectCode.trim() || !newSubjectName.trim()}
                onClick={() =>
                  runAction(
                    "ADD_SUBJECT",
                    {
                      code: newSubjectCode.trim().toUpperCase(),
                      name: newSubjectName.trim(),
                      group: newSubjectCat,
                      jpPerWeek: Number(newSubjectJtm || 2),
                    },
                    "Mapel Ditambahkan",
                    `${newSubjectName} ditambahkan ke referensi jadwal.`,
                    () => {
                      setNewSubjectCode("");
                      setNewSubjectName("");
                    }
                  )
                }
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                Simpan Mata Pelajaran
              </button>
            </div>
            <div className="lg:col-span-2 glass-surface rounded-2xl p-5 shadow-soft">
              <h4 className="text-sm font-bold text-slate-800 mb-3">Daftar Mata Pelajaran</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {master.subjects.map((s) => (
                  <div key={s.code} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{s.name}</span>
                      <span className="ml-2 text-xs text-slate-500">
                        {s.code} • {s.group} • {s.jpPerWeek} JP
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        runAction(
                          "DELETE_SUBJECT",
                          { code: s.code },
                          "Mapel Dihapus",
                          `${s.name} dihapus.`
                        )
                      }
                      className="text-xs font-semibold text-rose-600 hover:underline"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================
  // RENDER: ACADEMIC PERIOD ARCHIVAL & TRANSITION
  // =========================================================
  if (moduleKey === "academic_period") {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-surface rounded-2xl p-6 shadow-soft space-y-4">
            <div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                Periode Aktif: TA {profile?.academicYear} • Semester {profile?.semester}
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-2">
                Transisi Semester & Arsip Tahun Pelajaran
              </h3>
              <p className="text-xs text-slate-500">
                Saat berpindah semester atau tahun pelajaran, snapshot jadwal, nilai BK, presensi, dan statistik siswa sebelumnya diarsipkan otomatis.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Tahun Pelajaran Baru</label>
                <input
                  type="text"
                  value={nextYear}
                  onChange={(e) => setNextYear(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Semester Baru</label>
                <select
                  value={nextSemester}
                  onChange={(e) => setNextSemester(e.target.value as "Ganjil" | "Genap")}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-700 font-medium">
              <input
                type="checkbox"
                checked={autoPromote}
                onChange={(e) => setAutoPromote(e.target.checked)}
                className="rounded border-slate-300"
              />
              Naikkan kelas siswa secara otomatis (khusus pergantian Tahun Pelajaran baru)
            </label>
            <textarea
              rows={2}
              value={periodNotes}
              onChange={(e) => setPeriodNotes(e.target.value)}
              placeholder="Catatan berita acara tutup buku / transisi semester..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
            <button
              type="button"
              disabled={busy || !nextYear.trim()}
              onClick={() =>
                runAction(
                  "TRANSITION_ACADEMIC_PERIOD",
                  {
                    newAcademicYear: nextYear.trim(),
                    newSemester: nextSemester,
                    notes: periodNotes.trim() || "Transisi periode akademik resmi",
                    autoPromoteStudents: autoPromote,
                  },
                  "Periode Akademik Diperbarui",
                  `Aktif sekarang: TA ${nextYear} Semester ${nextSemester}. Periode lama telah diarsipkan.`,
                  () => setPeriodNotes("")
                )
              }
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50"
            >
              Arsipkan Periode Lama & Aktifkan Periode Baru
            </button>
          </div>

          <div className="glass-surface rounded-2xl p-6 shadow-soft">
            <h4 className="text-sm font-bold text-slate-800 mb-3">Riwayat Arsip Akademik ({archives.length})</h4>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {archives.length === 0 ? (
                <p className="text-xs text-slate-500">Belum ada arsip periode sebelumnya.</p>
              ) : (
                archives.map((arc) => (
                  <div key={arc.id} className="p-3.5 rounded-xl bg-white border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">
                        TA {arc.academicYear} • {arc.semester}
                      </span>
                      <span className="text-[11px] text-slate-400">{arc.archivedAt?.slice(0, 10)}</span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      Siswa: {arc.stats?.totalStudents || 0} • Jadwal: {arc.stats?.totalSchedules || 0} • Presensi Guru: {arc.stats?.totalTeacherAttendances || 0}
                    </div>
                    {arc.notes && <div className="text-[11px] text-slate-500 mt-1">{arc.notes}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER: GO-LIVE SETTINGS (PROFIL, GPS, BANK, CSV, RESET)
  // =========================================================
  if (moduleKey === "golive_settings") {
    const parseCsvAndImport = async () => {
      const lines = csvText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) {
        triggerToast("CSV Kosong", "Masukkan header dan minimal 1 baris data.");
        return;
      }
      const headers = lines[0].split(",").map((h) => h.trim());
      const rows = lines.slice(1).map((line) => {
        const cols = line.split(",").map((c) => c.trim());
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          obj[h] = cols[i] || "";
        });
        return obj;
      });
      await runAction(
        importTarget === "students" ? "BULK_IMPORT_STUDENTS" : "BULK_IMPORT_TEACHERS",
        { rows },
        "Import Massal Berhasil",
        `${rows.length} baris ${importTarget === "students" ? "siswa" : "GTK"} berhasil diproses.`,
        () => setCsvText("")
      );
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "identitas", label: "Identitas, GPS & Rekening" },
            { id: "import_csv", label: "Import CSV Massal" },
            { id: "reset_data", label: "Reset Data Simulasi" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setGoLiveTab(t.id as "identitas" | "import_csv" | "reset_data")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                goLiveTab === t.id
                  ? "bg-emerald-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {goLiveTab === "identitas" && (
          <div className="glass-surface rounded-2xl p-6 shadow-soft space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">Nama Madrasah</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">NSM / NPSN</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <input
                    type="text"
                    value={profileForm.nsm}
                    onChange={(e) => setProfileForm((p) => ({ ...p, nsm: e.target.value }))}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                  <input
                    type="text"
                    value={profileForm.npsn}
                    onChange={(e) => setProfileForm((p) => ({ ...p, npsn: e.target.value }))}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Kepala Madrasah</label>
                <input
                  type="text"
                  value={profileForm.headmasterName}
                  onChange={(e) => setProfileForm((p) => ({ ...p, headmasterName: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Koordinat GPS (Lat / Lng)</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <input
                    type="text"
                    value={profileForm.gpsLat}
                    onChange={(e) => setProfileForm((p) => ({ ...p, gpsLat: e.target.value }))}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                  <input
                    type="text"
                    value={profileForm.gpsLng}
                    onChange={(e) => setProfileForm((p) => ({ ...p, gpsLng: e.target.value }))}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Radius Geofence (meter)</label>
                <input
                  type="number"
                  value={profileForm.gpsRadiusMeters}
                  onChange={(e) =>
                    setProfileForm((p) => ({ ...p, gpsRadiusMeters: Number(e.target.value || 100) }))
                  }
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Rekening Komite Resmi</label>
                <input
                  type="text"
                  value={profileForm.komiteBankInfo}
                  onChange={(e) => setProfileForm((p) => ({ ...p, komiteBankInfo: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">
                Verifikasi Password Admin (wajib jika mengubah Rekening Komite)
              </label>
              <input
                type="password"
                value={adminPasswordForProfile}
                onChange={(e) => setAdminPasswordForProfile(e.target.value)}
                placeholder="Masukkan password admin jika mengubah rekening..."
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm max-w-md"
              />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                runAction(
                  "SAVE_MADRASAH_PROFILE",
                  { ...profileForm, adminPassword: adminPasswordForProfile || undefined },
                  "Profil Madrasah Tersimpan",
                  "Identitas, titik GPS geofence, dan rekening komite diperbarui.",
                  () => setAdminPasswordForProfile("")
                )
              }
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
            >
              Simpan Pengaturan Madrasah
            </button>
          </div>
        )}

        {goLiveTab === "import_csv" && (
          <div className="glass-surface rounded-2xl p-6 shadow-soft space-y-4">
            <div className="flex items-center gap-3">
              <select
                value={importTarget}
                onChange={(e) => setImportTarget(e.target.value as "students" | "teachers")}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="students">Import Data Siswa (name,nis,nisn,rombel,gender)</option>
                <option value="teachers">Import Data GTK (name,nip,subject,status)</option>
              </select>
            </div>
            <textarea
              rows={7}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={
                importTarget === "students"
                  ? "name,nis,nisn,rombel,gender\nBudi Santoso,2026002,0098765432,7A,L"
                  : "name,nip,subject,status\nAhmad Fauzi S.Pd.,198901012025011001,Matematika,PNS / Sertifikasi"
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
            />
            <button
              type="button"
              disabled={busy || !csvText.trim()}
              onClick={parseCsvAndImport}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50"
            >
              Proses Import CSV
            </button>
          </div>
        )}

        {goLiveTab === "reset_data" && (
          <div className="glass-surface rounded-2xl p-6 shadow-soft space-y-4 border border-rose-200">
            <h4 className="text-base font-bold text-rose-700">Zona Berbahaya: Reset Data Simulasi</h4>
            <p className="text-xs text-slate-600">
              Menghapus data dummy bawaan dan mengosongkan antrean simulasi sebelum go-live. Ketik{" "}
              <code className="font-bold">RESET-SIMMS</code> untuk konfirmasi.
            </p>
            <input
              type="text"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="Ketik RESET-SIMMS"
              className="px-3 py-2 rounded-xl border border-rose-300 text-sm max-w-xs"
            />
            <div>
              <button
                type="button"
                disabled={busy || resetConfirmText !== "RESET-SIMMS"}
                onClick={() =>
                  runAction(
                    "RESET_DUMMY_DATA",
                    {},
                    "Reset Data Selesai",
                    "Database dibersihkan untuk operasional produksi.",
                    () => setResetConfirmText("")
                  )
                }
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                Jalankan Reset Produksi
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================
  // RENDER: PPDB SCORING & MIGRASI BUKU INDUK
  // =========================================================
  if (moduleKey === "ppdb_scoring") {
    return (
      <div className="glass-surface rounded-2xl p-6 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Verifikasi Nilai & Kelulusan PPDB</h3>
            <p className="text-xs text-slate-500">
              Input nilai seleksi, tetapkan status kelulusan, dan migrasikan pendaftar diterima ke Buku Induk Siswa.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
            {ppdbList.length} Pendaftar
          </span>
        </div>

        <div className="space-y-3">
          {ppdbList.length === 0 ? (
            <p className="text-xs text-slate-500">Belum ada pendaftar PPDB.</p>
          ) : (
            ppdbList.map((p) => {
              const cur = ppdbScores[p.id] || {
                score: String(p.testScore ?? 80),
                status: p.status || "Menunggu Verifikasi",
              };
              return (
                <div
                  key={p.id}
                  className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-bold text-slate-900 text-sm">
                      {p.fullName} <span className="text-xs font-normal text-slate-500">({p.regNumber})</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Asal: {p.originSchool} • NISN: {p.nisn} • Jalur: {p.track}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      value={cur.score}
                      onChange={(e) =>
                        setPpdbScores((prev) => ({
                          ...prev,
                          [p.id]: { ...cur, score: e.target.value },
                        }))
                      }
                      className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                    />
                    <select
                      value={cur.status}
                      onChange={(e) =>
                        setPpdbScores((prev) => ({
                          ...prev,
                          [p.id]: { ...cur, status: e.target.value },
                        }))
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    >
                      <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
                      <option value="Diterima">Diterima</option>
                      <option value="Cadangan">Cadangan</option>
                      <option value="Ditolak">Ditolak</option>
                    </select>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        runAction(
                          "UPDATE_PPDB_SCORE_STATUS",
                          {
                            id: p.id,
                            testScore: Number(cur.score || 0),
                            status: cur.status,
                          },
                          "Status PPDB Diperbarui",
                          `${p.fullName}: ${cur.status} (${cur.score}).`
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                    >
                      Simpan
                    </button>
                    {p.status === "Diterima" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          runAction(
                            "MIGRATE_PPDB_TO_BUKU_INDUK",
                            { id: p.id, targetRombel: rombelNames[0] || "7A" },
                            "Migrasi Berhasil",
                            `${p.fullName} resmi masuk ke Buku Induk.`
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold"
                      >
                        Migrasikan ke Buku Induk
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER: SCHEDULE CONFLICT & PENJADWALAN
  // =========================================================
  if (moduleKey === "schedule_conflict") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-surface rounded-2xl p-6 shadow-soft space-y-3">
          <h3 className="text-base font-bold text-slate-900">Tambah Jadwal Pelajaran</h3>
          <p className="text-xs text-slate-500">
            Sistem otomatis mendeteksi bentrok jam guru atau rombel sebelum menyimpan.
          </p>
          <select
            value={schedDay}
            onChange={(e) => setSchedDay(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
          >
            {DAY_LIST.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={schedRombel}
            onChange={(e) => setSchedRombel(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
          >
            {rombelNames.map((r) => (
              <option key={r} value={r}>
                Kelas {r}
              </option>
            ))}
          </select>
          <select
            value={schedSubject}
            onChange={(e) => setSchedSubject(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
          >
            {subjectNames.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={schedTeacher}
            onChange={(e) => setSchedTeacher(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
          >
            {teachers.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="time"
              value={schedStart}
              onChange={(e) => setSchedStart(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
            <input
              type="time"
              value={schedEnd}
              onChange={(e) => setSchedEnd(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <input
            type="text"
            value={schedRoom}
            onChange={(e) => setSchedRoom(e.target.value)}
            placeholder="Ruangan"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
          <button
            type="button"
            disabled={busy || !schedTeacher}
            onClick={() =>
              runAction(
                "CREATE_CLASS_SCHEDULE",
                {
                  day: schedDay,
                  rombel: schedRombel,
                  subject: schedSubject,
                  teacherName: schedTeacher,
                  startTime: schedStart,
                  endTime: schedEnd,
                  room: schedRoom,
                },
                "Jadwal Tersimpan",
                `${schedSubject} (${schedRombel}) pada ${schedDay} ${schedStart}-${schedEnd}.`
              )
            }
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50"
          >
            Simpan & Cek Bentrok
          </button>
        </div>

        <div className="lg:col-span-2 glass-surface rounded-2xl p-6 shadow-soft">
          <h4 className="text-sm font-bold text-slate-800 mb-3">Jadwal Aktif ({schedules.length})</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {schedules.map((sc) => (
              <div key={sc.id} className="p-3 rounded-xl bg-white border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-slate-900">
                    {sc.day} • {sc.startTime}–{sc.endTime} • {sc.subject}
                  </div>
                  <div className="text-xs text-slate-500">
                    Kelas {sc.rombel} • {sc.teacherName} • {sc.room}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER: BK COUNSELING
  // =========================================================
  if (moduleKey === "bk_counseling") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-surface rounded-2xl p-6 shadow-soft space-y-3">
          <h3 className="text-base font-bold text-slate-900">Input Catatan Bimbingan & Konseling</h3>
          <select
            value={bkStudentId}
            onChange={(e) => setBkStudentId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
          >
            {students.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.rombel})
              </option>
            ))}
          </select>
          <select
            value={bkCategory}
            onChange={(e) => setBkCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
          >
            <option value="Pembinaan Disiplin">Pembinaan Disiplin</option>
            <option value="Prestasi & Apresiasi">Prestasi & Apresiasi</option>
            <option value="Konseling Pribadi">Konseling Pribadi</option>
            <option value="Pemanggilan Orang Tua">Pemanggilan Orang Tua</option>
          </select>
          <input
            type="number"
            value={bkPoints}
            onChange={(e) => setBkPoints(e.target.value)}
            placeholder="Poin (+/-)"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
          <textarea
            rows={3}
            value={bkSummary}
            onChange={(e) => setBkSummary(e.target.value)}
            placeholder="Ringkasan konseling..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
          <input
            type="text"
            value={bkFollowUp}
            onChange={(e) => setBkFollowUp(e.target.value)}
            placeholder="Rencana tindak lanjut..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
          <button
            type="button"
            disabled={busy || !bkStudentId || !bkSummary.trim()}
            onClick={() => {
              const st = students.find((s) => s.id === bkStudentId);
              runAction(
                "CREATE_COUNSELING_NOTE",
                {
                  studentId: bkStudentId,
                  studentName: st?.name || "Siswa",
                  rombel: st?.rombel || "-",
                  category: bkCategory,
                  summary: bkSummary.trim(),
                  followUp: bkFollowUp.trim() || "Monitoring berkala",
                  pointsDelta: Number(bkPoints || 0),
                  counselorName: session?.name || "Guru BK",
                },
                "Catatan BK Tersimpan",
                "Log konseling tercatat dan tersinkron ke Portal Orang Tua.",
                () => {
                  setBkSummary("");
                  setBkFollowUp("");
                }
              );
            }}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50"
          >
            Simpan Catatan BK
          </button>
        </div>

        <div className="lg:col-span-2 glass-surface rounded-2xl p-6 shadow-soft">
          <h4 className="text-sm font-bold text-slate-800 mb-3">Riwayat Catatan BK ({counselingNotes.length})</h4>
          <div className="space-y-2.5 max-h-96 overflow-y-auto">
            {counselingNotes.map((n) => (
              <div key={n.id} className="p-3.5 rounded-xl bg-white border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">
                    {n.studentName} ({n.rombel}) • {n.category}
                  </span>
                  <span className="text-xs font-semibold text-emerald-700">{n.date}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">{n.summary}</p>
                <p className="text-[11px] text-slate-400 mt-1">Tindak Lanjut: {n.followUp}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER: BATCH PROMOTION
  // =========================================================
  if (moduleKey === "batch_promotion") {
    const affectedCount = students.filter((s) => s.rombel === promoSourceRombel).length;
    return (
      <div className="glass-surface rounded-2xl p-6 shadow-soft max-w-2xl space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Kenaikan Kelas & Kelulusan Massal</h3>
        <p className="text-xs text-slate-500">
          Pindahkan seluruh siswa dalam satu rombel ke tingkat berikutnya atau status Alumni secara serentak.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Rombel Asal</label>
            <select
              value={promoSourceRombel}
              onChange={(e) => setPromoSourceRombel(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
            >
              {rombelNames.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Aksi</label>
            <select
              value={promoActionType}
              onChange={(e) => setPromoActionType(e.target.value as "Naik Kelas" | "Lulus / Alumni")}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
            >
              <option value="Naik Kelas">Naik Kelas</option>
              <option value="Lulus / Alumni">Lulus / Alumni</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Rombel Tujuan</label>
            <select
              disabled={promoActionType === "Lulus / Alumni"}
              value={promoTargetRombel}
              onChange={(e) => setPromoTargetRombel(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white disabled:opacity-50"
            >
              {rombelNames.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
          Ditemukan <strong>{affectedCount}</strong> siswa aktif di rombel <strong>{promoSourceRombel}</strong>.
        </div>
        <button
          type="button"
          disabled={busy || affectedCount === 0}
          onClick={() =>
            runAction(
              "BATCH_PROMOTE_STUDENTS",
              {
                sourceRombel: promoSourceRombel,
                targetRombel: promoActionType === "Lulus / Alumni" ? "Alumni" : promoTargetRombel,
                graduate: promoActionType === "Lulus / Alumni",
              },
              "Proses Massal Selesai",
              `${affectedCount} siswa dari ${promoSourceRombel} berhasil diperbarui.`
            )
          }
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50"
        >
          Eksekusi Kenaikan / Kelulusan
        </button>
      </div>
    );
  }

  // =========================================================
  // RENDER: TU PERSURATAN / AGENDA / EMIS
  // =========================================================
  if (moduleKey === "tu_persuratan" || moduleKey === "tu_agenda" || moduleKey === "tu_emis") {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "tu_persuratan", label: `Layanan Surat (${serviceRequests.length})` },
            { id: "tu_agenda", label: `Agenda Surat (${mailAgenda.length})` },
            { id: "tu_emis", label: "Ekspor EMIS / VervalPD" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectView?.(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                moduleKey === t.id
                  ? "bg-emerald-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {moduleKey === "tu_persuratan" && (
          <div className="glass-surface rounded-2xl p-6 shadow-soft space-y-3">
            <h3 className="text-base font-bold text-slate-900">Antrean Permohonan Surat Siswa & GTK</h3>
            {serviceRequests.length === 0 ? (
              <p className="text-xs text-slate-500">Belum ada permohonan surat masuk.</p>
            ) : (
              serviceRequests.map((req) => (
                <div key={req.id} className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-sm text-slate-900">
                      {req.type} — {req.applicantName}
                    </div>
                    <div className="text-xs text-slate-500">
                      {req.applicantRole} • {req.purpose} • Status: <strong>{req.status}</strong>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy || req.status === "Selesai"}
                      onClick={() =>
                        runAction(
                          "PROCESS_SERVICE_REQUEST",
                          { id: req.id, status: "Selesai" },
                          "Surat Diterbitkan",
                          `Permohonan ${req.applicantName} ditandai selesai.`
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50"
                    >
                      Terbitkan
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {moduleKey === "tu_agenda" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-surface rounded-2xl p-5 shadow-soft space-y-3">
              <h3 className="text-base font-bold text-slate-900">Catat Agenda Surat</h3>
              <select
                value={mailDirection}
                onChange={(e) => setMailDirection(e.target.value as "Surat Masuk" | "Surat Keluar")}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="Surat Keluar">Surat Keluar</option>
                <option value="Surat Masuk">Surat Masuk</option>
              </select>
              <input
                type="text"
                placeholder="Nomor Surat"
                value={mailNumber}
                onChange={(e) => setMailNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <input
                type="text"
                placeholder="Instansi Pengirim / Tujuan"
                value={mailPartner}
                onChange={(e) => setMailPartner(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <input
                type="text"
                placeholder="Perihal"
                value={mailSubject}
                onChange={(e) => setMailSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <input
                type="date"
                value={mailDate}
                onChange={(e) => setMailDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <button
                type="button"
                disabled={busy || !mailNumber.trim() || !mailSubject.trim()}
                onClick={() =>
                  runAction(
                    "CREATE_MAIL_AGENDA",
                    {
                      direction: mailDirection,
                      number: mailNumber.trim(),
                      partner: mailPartner.trim() || "-",
                      subject: mailSubject.trim(),
                      date: mailDate,
                    },
                    "Agenda Surat Tercatat",
                    `${mailDirection} nomor ${mailNumber} disimpan.`,
                    () => {
                      setMailNumber("");
                      setMailPartner("");
                      setMailSubject("");
                    }
                  )
                }
                className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                Simpan Agenda
              </button>
            </div>
            <div className="lg:col-span-2 glass-surface rounded-2xl p-5 shadow-soft space-y-2 max-h-96 overflow-y-auto">
              <h4 className="text-sm font-bold text-slate-800 mb-2">Buku Agenda Resmi</h4>
              {mailAgenda.map((m) => (
                <div key={m.id} className="p-3 rounded-xl bg-white border border-slate-100">
                  <div className="font-bold text-xs text-slate-900">
                    [{m.direction}] {m.number} • {m.subject}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {m.partner} • {m.date}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {moduleKey === "tu_emis" && (
          <div className="glass-surface rounded-2xl p-6 shadow-soft space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Ekspor Data EMIS & VervalPD</h3>
            <p className="text-xs text-slate-500">
              Unduh rekap CSV Buku Induk Siswa ({students.length} siswa) dan Data GTK ({teachers.length} GTK) dalam format siap unggah EMIS Kemenag.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  const csv = [
                    "NIS,NISN,Nama,Rombel,JK,Status",
                    ...students.map((s) => `${s.nis},${s.nisn},"${s.name}",${s.rombel},${s.gender},${s.status}`),
                  ].join("\n");
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "emis-siswa-mts-nurul-falah.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                  triggerToast("Ekspor EMIS Siswa", "File CSV berhasil diunduh.");
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
              >
                Unduh CSV Siswa ({students.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  const csv = [
                    "Nama,NIP,Mapel,Status",
                    ...teachers.map((t) => `"${t.name}",${t.nip},"${t.subject}",${t.status}`),
                  ].join("\n");
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "emis-gtk-mts-nurul-falah.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                  triggerToast("Ekspor EMIS GTK", "File CSV GTK berhasil diunduh.");
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold"
              >
                Unduh CSV GTK ({teachers.length})
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================
  // RENDER: R2 DOCUMENT UPLOADER
  // =========================================================
  if (moduleKey === "r2_uploader") {
    const handleUpload = async () => {
      if (!r2File || !r2StudentId) return;
      setBusy(true);
      try {
        const fd = new FormData();
        fd.append("file", r2File);
        fd.append("folder", `arsip-siswa/${r2StudentId}`);
        const upRes = await fetch("/api/r2/upload", { method: "POST", body: fd });
        const upData = await upRes.json();
        if (!upData.ok) {
          triggerToast("Upload Gagal", upData.error || "Gagal mengunggah ke R2.");
          return;
        }
        await runAction(
          "UPDATE_STUDENT_BIODATA",
          {
            id: r2StudentId,
            r2DocumentAdd: {
              type: r2DocType,
              fileName: r2File.name,
              url: upData.url,
              key: upData.key,
              uploadedAt: new Date().toISOString(),
            },
          },
          "Arsip Digital Tersimpan",
          `${r2DocType} berhasil diunggah ke Cloudflare R2.`,
          () => setR2File(null)
        );
      } catch {
        triggerToast("Error Upload", "Koneksi ke layanan R2 terputus.");
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="glass-surface rounded-2xl p-6 shadow-soft max-w-xl space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Upload Arsip Digital Siswa (Cloudflare R2)</h3>
        <select
          value={r2StudentId}
          onChange={(e) => setR2StudentId(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
        >
          {students.map((st) => (
            <option key={st.id} value={st.id}>
              {st.name} ({st.rombel})
            </option>
          ))}
        </select>
        <select
          value={r2DocType}
          onChange={(e) => setR2DocType(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
        >
          <option value="Kartu Keluarga (KK)">Kartu Keluarga (KK)</option>
          <option value="Akta Kelahiran">Akta Kelahiran</option>
          <option value="Ijazah / SKL SD/MI">Ijazah / SKL SD/MI</option>
          <option value="KIP / PKH">KIP / PKH</option>
        </select>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => setR2File(e.target.files?.[0] || null)}
          className="w-full text-xs text-slate-600"
        />
        <button
          type="button"
          disabled={busy || !r2File || !r2StudentId}
          onClick={handleUpload}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50"
        >
          {busy ? "Mengunggah..." : "Unggah ke Cloudflare R2"}
        </button>
      </div>
    );
  }

  return null;
}
