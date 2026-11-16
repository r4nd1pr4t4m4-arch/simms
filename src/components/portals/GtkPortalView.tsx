"use client";

import React, { useMemo, useState } from "react";
import {
  LayoutDashboard,
  MapPin,
  Calendar,
  ShieldCheck,
  Users,
  HeartHandshake,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Upload,
  LogIn,
  LogOut as LogOutIcon,
  FileText,
  Sparkles,
  Navigation,
  RefreshCw,
} from "lucide-react";
import DashboardLayout, { NavGroup } from "./DashboardLayout";
import {
  ActiveSession,
  SimmDbSummary,
  callSimmAction,
  uploadToR2,
} from "@/types/simm";

interface GtkPortalViewProps {
  session: ActiveSession;
  db: SimmDbSummary;
  onRefresh: () => Promise<void>;
  onToast: (msg: string, tone?: "success" | "error" | "info") => void;
  onOpenChangePassword: () => void;
  onRequestLogout: () => void;
}

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function GtkPortalView({
  session,
  db,
  onRefresh,
  onToast,
  onOpenChangePassword,
  onRequestLogout,
}: GtkPortalViewProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [busy, setBusy] = useState(false);

  // GPS State
  const [gpsCoords, setGpsCoords] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    distance: number | null;
  } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string>(
    "Belum mengambil koordinat GPS perangkat"
  );
  const [gpsLoading, setGpsLoading] = useState(false);

  // Leave Request State
  const [leaveType, setLeaveType] = useState<"IZIN" | "SAKIT" | "DINAS_LUAR">(
    "IZIN"
  );
  const [leaveNote, setLeaveNote] = useState("");
  const [leaveFile, setLeaveFile] = useState<File | null>(null);

  // Piket Incident State
  const [incidentTitle, setIncidentTitle] = useState("");
  const [incidentCategory, setIncidentCategory] = useState("KETERTIBAN");
  const [incidentDesc, setIncidentDesc] = useState("");

  // BK Counseling State
  const [bkStudentId, setBkStudentId] = useState("");
  const [bkCategory, setBkCategory] = useState("PEMBINAAN");
  const [bkPoints, setBkPoints] = useState(0);
  const [bkNote, setBkNote] = useState("");

  // Kurikulum Schedule State
  const [schedDay, setSchedDay] = useState("Senin");
  const [schedTime, setSchedTime] = useState("07:00 - 08:20");
  const [schedRombel, setSchedRombel] = useState(
    db.academicMaster?.rombels?.[0]?.name || db.stats?.rombels?.[0] || "7A"
  );
  const [schedSubject, setSchedSubject] = useState(
    db.academicMaster?.subjects?.[0]?.name || "Matematika"
  );
  const [schedTeacher, setSchedTeacher] = useState(session.name);

  const roles = useMemo(
    () => (session.additionalRoles || []).map((r) => r.toUpperCase()),
    [session.additionalRoles]
  );

  const hasPiket =
    roles.some((r) => r.includes("PIKET")) || roles.includes("WAKA_KESISWAAN");
  const hasBk = roles.some((r) => r.includes("BK"));
  const hasKurikulum = roles.some((r) => r.includes("KURIKULUM"));
  const hasPpdb = roles.some((r) => r.includes("PPDB"));
  const hasWalas =
    Boolean(session.waliKelas) || roles.some((r) => r.includes("WALI_KELAS"));

  const myAttendances = useMemo(() => {
    const list = db.teacherAttendances || [];
    return list.filter(
      (a: any) =>
        a.teacherId === session.userId ||
        a.teacherName?.toLowerCase() === session.name?.toLowerCase()
    );
  }, [db.teacherAttendances, session.userId, session.name]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAttendance = useMemo(
    () => myAttendances.find((a: any) => String(a.date || "").startsWith(todayStr)),
    [myAttendances, todayStr]
  );

  const mySchedules = useMemo(() => {
    const list = db.schedules || [];
    return list.filter(
      (s: any) =>
        s.teacherName?.toLowerCase() === session.name?.toLowerCase() ||
        s.teacherId === session.userId
    );
  }, [db.schedules, session.name, session.userId]);

  const myWalasStudents = useMemo(() => {
    const list = db.students || [];
    const targetRombel = session.waliKelas || session.rombel;
    if (!targetRombel) return [];
    return list.filter((s: any) => s.rombel === targetRombel);
  }, [db.students, session.waliKelas, session.rombel]);

  const navGroups: NavGroup[] = useMemo(() => {
    const groups: NavGroup[] = [
      {
        title: "Menu Utama GTK",
        items: [
          { key: "overview", label: "Ringkasan & Profil", icon: LayoutDashboard },
          {
            key: "attendance",
            label: "Presensi GPS & Izin",
            icon: MapPin,
            badge: todayAttendance ? "Hadir" : "Belum",
            badgeTone: todayAttendance ? "emerald" : "amber",
          },
          {
            key: "schedule",
            label: "Jadwal Mengajar",
            icon: Calendar,
            badge: String(mySchedules.length),
            badgeTone: "sky",
          },
        ],
      },
    ];

    const extraItems = [];
    if (hasWalas) {
      extraItems.push({
        key: "walas",
        label: `Wali Kelas (${session.waliKelas || session.rombel || "-"})`,
        icon: Users,
      });
    }
    if (hasPiket) {
      extraItems.push({
        key: "piket",
        label: "Tugas Guru Piket",
        icon: ShieldCheck,
        badge: "Aktif",
        badgeTone: "teal" as const,
      });
    }
    if (hasBk) {
      extraItems.push({
        key: "bk",
        label: "Meja Kerja BK",
        icon: HeartHandshake,
      });
    }
    if (hasKurikulum) {
      extraItems.push({
        key: "kurikulum",
        label: "Jadwal Anti-Bentrok",
        icon: Calendar,
      });
    }
    if (hasPpdb) {
      extraItems.push({
        key: "ppdb_scoring",
        label: "Seleksi & Nilai PPDB",
        icon: ClipboardCheck,
      });
    }

    if (extraItems.length > 0) {
      groups.push({
        title: "Tugas Tambahan (RBAC)",
        items: extraItems,
      });
    }

    return groups;
  }, [
    todayAttendance,
    mySchedules.length,
    hasWalas,
    hasPiket,
    hasBk,
    hasKurikulum,
    hasPpdb,
    session.waliKelas,
    session.rombel,
  ]);

  const acquireGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus("Browser tidak mendukung Geolocation API.");
      onToast("Browser tidak mendukung Geolocation.", "error");
      return;
    }
    setGpsLoading(true);
    setGpsStatus("Mengambil posisi satelit / Wi-Fi akurat...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy);
        const mLat = parseFloat(db.profile.gpsLat || "0");
        const mLng = parseFloat(db.profile.gpsLng || "0");
        const distance =
          mLat && mLng ? haversineMeters(lat, lng, mLat, mLng) : null;
        setGpsCoords({ lat, lng, accuracy, distance });
        setGpsStatus(
          distance !== null
            ? `Lokasi terkunci (Jarak ${distance}m dari madrasah, akurasi ±${accuracy}m)`
            : `Lokasi terkunci (${lat.toFixed(5)}, ${lng.toFixed(5)})`
        );
        setGpsLoading(false);
      },
      (err) => {
        setGpsStatus(`Gagal mengambil lokasi: ${err.message}`);
        setGpsLoading(false);
        onToast(`Gagal GPS: ${err.message}`, "error");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleCheckIn = async () => {
    if (!gpsCoords) {
      onToast("Ambil koordinat GPS terlebih dahulu sebelum Check-In.", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await callSimmAction("RECORD_TEACHER_ATTENDANCE", {
        status: "HADIR",
        lat: gpsCoords.lat,
        lng: gpsCoords.lng,
        accuracy: gpsCoords.accuracy,
        note: `Check-in GPS native (akurasi ±${gpsCoords.accuracy}m)`,
      });
      if (!res.ok) throw new Error(res.error || "Check-In gagal.");
      onToast("Presensi Check-In GPS berhasil dicatat!", "success");
      await onRefresh();
    } catch (e: any) {
      onToast(e.message || "Gagal melakukan Check-In.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleCheckOut = async () => {
    setBusy(true);
    try {
      const res = await callSimmAction("RECORD_TEACHER_CHECKOUT", {
        lat: gpsCoords?.lat,
        lng: gpsCoords?.lng,
      });
      if (!res.ok) throw new Error(res.error || "Check-Out gagal.");
      onToast("Presensi Check-Out berhasil dicatat!", "success");
      await onRefresh();
    } catch (e: any) {
      onToast(e.message || "Gagal melakukan Check-Out.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveNote.trim()) {
      onToast("Mohon isi keterangan izin / tugas luar.", "error");
      return;
    }
    setBusy(true);
    try {
      let attachmentUrl = "";
      if (leaveFile) {
        const up = await uploadToR2(leaveFile, "gtk-izin");
        if (up?.ok && up.url) attachmentUrl = up.url;
      }
      const res = await callSimmAction("RECORD_TEACHER_ATTENDANCE", {
        status: leaveType,
        note: leaveNote.trim(),
        attachmentUrl,
      });
      if (!res.ok) throw new Error(res.error || "Gagal mengirim pengajuan izin.");
      onToast("Pengajuan izin / dinas luar berhasil dikirim.", "success");
      setLeaveNote("");
      setLeaveFile(null);
      await onRefresh();
    } catch (e: any) {
      onToast(e.message || "Gagal mengajukan izin.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentTitle.trim() || !incidentDesc.trim()) {
      onToast("Lengkapi judul dan kronologi kejadian piket.", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await callSimmAction("CREATE_PIKET_INCIDENT", {
        title: incidentTitle.trim(),
        category: incidentCategory,
        description: incidentDesc.trim(),
      });
      if (!res.ok) throw new Error(res.error || "Gagal mencatat insiden.");
      onToast("Laporan insiden piket tersimpan.", "success");
      setIncidentTitle("");
      setIncidentDesc("");
      await onRefresh();
    } catch (e: any) {
      onToast(e.message || "Terjadi kesalahan.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateBkNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bkStudentId || !bkNote.trim()) {
      onToast("Pilih siswa dan isi catatan konseling.", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await callSimmAction("CREATE_COUNSELING_NOTE", {
        studentId: bkStudentId,
        category: bkCategory,
        points: Number(bkPoints) || 0,
        note: bkNote.trim(),
      });
      if (!res.ok) throw new Error(res.error || "Gagal menyimpan catatan BK.");
      onToast("Catatan konseling BK berhasil disimpan.", "success");
      setBkNote("");
      setBkPoints(0);
      await onRefresh();
    } catch (e: any) {
      onToast(e.message || "Gagal menyimpan catatan BK.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await callSimmAction("CREATE_CLASS_SCHEDULE", {
        day: schedDay,
        timeSlot: schedTime,
        rombel: schedRombel,
        subject: schedSubject,
        teacherName: schedTeacher,
      });
      if (!res.ok) throw new Error(res.error || "Jadwal bentrok atau gagal.");
      onToast("Jadwal pelajaran berhasil ditambahkan!", "success");
      await onRefresh();
    } catch (e: any) {
      onToast(e.message || "Gagal menambahkan jadwal.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handlePpdbScore = async (id: string, status: string) => {
    setBusy(true);
    try {
      const res = await callSimmAction("UPDATE_PPDB_SCORE_STATUS", {
        id,
        status,
      });
      if (!res.ok) throw new Error(res.error || "Gagal memperbarui status PPDB.");
      onToast(`Status pendaftar diperbarui menjadi ${status}`, "success");
      await onRefresh();
    } catch (e: any) {
      onToast(e.message || "Gagal memperbarui PPDB.", "error");
    } finally {
      setBusy(false);
    }
  };

  const tabTitles: Record<string, { title: string; subtitle: string }> = {
    overview: {
      title: "Ringkasan Portal GTK",
      subtitle: `${db.profile.name} • TA ${db.profile.academicYear} (${db.profile.semester})`,
    },
    attendance: {
      title: "Presensi GPS & Pengajuan Izin",
      subtitle: "Validasi Haversine radius madrasah & riwayat kehadiran",
    },
    schedule: {
      title: "Jadwal Mengajar",
      subtitle: `Daftar jam mengajar ${session.name}`,
    },
    walas: {
      title: `Wali Kelas ${session.waliKelas || session.rombel || ""}`,
      subtitle: "Pantauan siswa binaan & data buku induk rombel",
    },
    piket: {
      title: "Meja Tugas Guru Piket",
      subtitle: "Log kejadian harian & pantauan presensi madrasah",
    },
    bk: {
      title: "Meja Kerja Bimbingan Konseling",
      subtitle: "Pencatatan pembinaan, prestasi & poin pelanggaran siswa",
    },
    kurikulum: {
      title: "Penyusunan Jadwal Anti-Bentrok",
      subtitle: "Referensi Rombel & Mapel Master Akademik",
    },
    ppdb_scoring: {
      title: "Seleksi & Verifikasi PPDB",
      subtitle: "Penilaian dan penetapan status kelulusan calon peserta didik",
    },
  };

  const currentMeta = tabTitles[activeTab] || tabTitles.overview;

  return (
    <DashboardLayout
      portalBadge="Portal GTK & Guru"
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
      {/* OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-gradient-to-br from-teal-700 via-teal-800 to-emerald-900 p-6 text-white shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-teal-100 text-xs font-bold mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  Selamat Datang, {session.name}
                </span>
                <h2 className="text-2xl font-black tracking-tight">
                  Dashboard Pendidik & Tenaga Kependidikan
                </h2>
                <p className="text-sm text-teal-100/90 mt-1">
                  Mata Pelajaran: <strong>{session.subject || "Umum"}</strong>{" "}
                  • Wali Kelas: <strong>{session.waliKelas || "-"}</strong>
                </p>
                {roles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {roles.map((r) => (
                      <span
                        key={r}
                        className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-200 text-[11px] font-bold"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
                <button
                  onClick={() => setActiveTab("attendance")}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-teal-800 font-bold text-sm hover:bg-teal-50 transition-colors shadow-sm"
                >
                  <MapPin className="w-4 h-4" />
                  {todayAttendance ? "Lihat Presensi Hari Ini" : "Check-In GPS Sekarang"}
                </button>
              </div>
            </div>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Status Hari Ini
              </p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {todayAttendance ? todayAttendance.status || "HADIR" : "Belum Absen"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {todayAttendance?.checkInTime
                  ? `Masuk ${todayAttendance.checkInTime}`
                  : "Silakan lakukan Check-In GPS"}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Jam Mengajar
              </p>
              <p className="text-2xl font-black text-teal-700 mt-1">
                {mySchedules.length} Sesi
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Semester {db.profile.semester}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Riwayat Presensi
              </p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {myAttendances.length} Catatan
              </p>
              <p className="text-xs text-slate-500 mt-1">Terekam di sistem</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Radius GPS Madrasah
              </p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {db.profile.gpsRadiusMeters || 150} m
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Validasi Haversine Server
              </p>
            </div>
          </div>

          {/* Upcoming Schedule Preview */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-slate-900">
                Jadwal Mengajar Anda
              </h3>
              <button
                onClick={() => setActiveTab("schedule")}
                className="text-xs font-bold text-teal-700 hover:underline"
              >
                Lihat Semua
              </button>
            </div>
            {mySchedules.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">
                Belum ada jadwal mengajar yang ditautkan ke akun Anda.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {mySchedules.slice(0, 6).map((s: any, idx: number) => (
                  <div
                    key={s.id || idx}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-teal-700 mb-1">
                      <span>{s.day}</span>
                      <span>{s.timeSlot}</span>
                    </div>
                    <p className="text-sm font-extrabold text-slate-900">
                      {s.subject}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Kelas / Rombel: <strong>{s.rombel}</strong>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ATTENDANCE & GPS */}
      {activeTab === "attendance" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* GPS Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Presensi Kehadiran Berbasis GPS
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Radius diizinkan: {db.profile.gpsRadiusMeters || 150} meter dari
                  titik koordinat madrasah.
                </p>
              </div>
              <span className="p-2.5 rounded-xl bg-teal-50 text-teal-700">
                <Navigation className="w-5 h-5" />
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600">Status Lokasi:</span>
                <span
                  className={`font-bold ${
                    gpsCoords ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {gpsCoords ? "Terkunci" : "Menunggu"}
                </span>
              </div>
              <p className="text-xs text-slate-700">{gpsStatus}</p>
              {gpsCoords && (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block">Latitude</span>
                    <span className="font-mono font-bold">
                      {gpsCoords.lat.toFixed(5)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Longitude</span>
                    <span className="font-mono font-bold">
                      {gpsCoords.lng.toFixed(5)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Jarak</span>
                    <span className="font-bold text-teal-700">
                      {gpsCoords.distance !== null
                        ? `${gpsCoords.distance} m`
                        : "-"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={acquireGps}
                disabled={gpsLoading || busy}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                <MapPin className="w-4 h-4" />
                {gpsLoading ? "Mengunci GPS..." : "Ambil Koordinat GPS"}
              </button>

              <button
                type="button"
                onClick={handleCheckIn}
                disabled={busy || !gpsCoords}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                Check-In Masuk
              </button>

              <button
                type="button"
                onClick={handleCheckOut}
                disabled={busy}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                <LogOutIcon className="w-4 h-4" />
                Check-Out Pulang
              </button>
            </div>
          </div>

          {/* Leave Request Form */}
          <form
            onSubmit={handleSubmitLeave}
            className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4"
          >
            <h3 className="text-base font-extrabold text-slate-900">
              Pengajuan Izin / Sakit / Dinas Luar
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Jenis Pengajuan
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="IZIN">Izin Tidak Masuk</option>
                <option value="SAKIT">Sakit</option>
                <option value="DINAS_LUAR">Dinas Luar / Tugas Madrasah</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Keterangan / Alasan
              </label>
              <textarea
                rows={3}
                value={leaveNote}
                onChange={(e) => setLeaveNote(e.target.value)}
                placeholder="Tuliskan alasan atau nomor surat tugas..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lampiran Surat (Opsional, R2)
              </label>
              <label className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 cursor-pointer text-xs text-slate-600 hover:border-teal-500">
                <Upload className="w-4 h-4 text-teal-600" />
                <span>
                  {leaveFile ? leaveFile.name : "Pilih file PDF/JPG..."}
                </span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setLeaveFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
            >
              Kirim Pengajuan
            </button>
          </form>

          {/* Attendance History Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-base font-extrabold text-slate-900 mb-4">
              Riwayat Presensi Anda
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 pr-4 font-bold">Tanggal</th>
                    <th className="py-2.5 pr-4 font-bold">Status</th>
                    <th className="py-2.5 pr-4 font-bold">Masuk</th>
                    <th className="py-2.5 pr-4 font-bold">Pulang</th>
                    <th className="py-2.5 font-bold">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myAttendances.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        Belum ada catatan presensi.
                      </td>
                    </tr>
                  ) : (
                    myAttendances.slice(0, 20).map((a: any, i: number) => (
                      <tr key={a.id || i}>
                        <td className="py-2.5 pr-4 font-semibold text-slate-800">
                          {a.date}
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                            {a.status}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 font-mono">
                          {a.checkInTime || "-"}
                        </td>
                        <td className="py-2.5 pr-4 font-mono">
                          {a.checkOutTime || "-"}
                        </td>
                        <td className="py-2.5 text-slate-600">{a.note || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE */}
      {activeTab === "schedule" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-base font-extrabold text-slate-900 mb-4">
            Jadwal Mengajar ({mySchedules.length} Sesi)
          </h3>
          {mySchedules.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada jadwal mengajar.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mySchedules.map((s: any, idx: number) => (
                <div
                  key={s.id || idx}
                  className="p-4 rounded-xl border border-slate-200 hover:border-teal-300 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-teal-700 mb-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-teal-50">
                      {s.day}
                    </span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      {s.timeSlot}
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    {s.subject}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Rombel: <strong className="text-slate-700">{s.rombel}</strong>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WALI KELAS */}
      {activeTab === "walas" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-base font-extrabold text-slate-900 mb-4">
            Daftar Siswa Rombel {session.waliKelas || session.rombel} (
            {myWalasStudents.length} Siswa)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4 font-bold">NISN</th>
                  <th className="py-2.5 pr-4 font-bold">Nama Lengkap</th>
                  <th className="py-2.5 pr-4 font-bold">L/P</th>
                  <th className="py-2.5 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myWalasStudents.map((st: any) => (
                  <tr key={st.id || st.nisn}>
                    <td className="py-2.5 pr-4 font-mono">{st.nisn}</td>
                    <td className="py-2.5 pr-4 font-bold text-slate-900">
                      {st.name}
                    </td>
                    <td className="py-2.5 pr-4">{st.gender || "-"}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                        {st.status || "AKTIF"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PIKET */}
      {activeTab === "piket" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={handleCreateIncident}
            className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4"
          >
            <h3 className="text-base font-extrabold text-slate-900">
              Catat Kejadian / Insiden Piket Harian
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Judul Kejadian
              </label>
              <input
                type="text"
                value={incidentTitle}
                onChange={(e) => setIncidentTitle(e.target.value)}
                placeholder="Contoh: Keterlambatan siswa gelombang 1"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kategori
              </label>
              <select
                value={incidentCategory}
                onChange={(e) => setIncidentCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              >
                <option value="KETERTIBAN">Ketertiban & Disiplin</option>
                <option value="KESEHATAN">UKS / Kesehatan</option>
                <option value="KEHADIRAN">Kehadiran Guru / Kelas Kosong</option>
                <option value="LAINNYA">Lainnya</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kronologi & Tindak Lanjut
              </label>
              <textarea
                rows={3}
                value={incidentDesc}
                onChange={(e) => setIncidentDesc(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold"
            >
              Simpan Laporan Piket
            </button>
          </form>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-base font-extrabold text-slate-900 mb-4">
              Log Kejadian Piket Terbaru
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(db.piketIncidents || []).length === 0 ? (
                <p className="text-sm text-slate-400">Belum ada insiden tercatat.</p>
              ) : (
                (db.piketIncidents || []).slice(0, 15).map((inc: any, i: number) => (
                  <div
                    key={inc.id || i}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200"
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-teal-700">
                      <span>{inc.category}</span>
                      <span className="text-slate-400">{inc.date || inc.createdAt}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 mt-1">
                      {inc.title}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {inc.description}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* BK */}
      {activeTab === "bk" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={handleCreateBkNote}
            className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4"
          >
            <h3 className="text-base font-extrabold text-slate-900">
              Catat Konseling / Pembinaan Siswa
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pilih Siswa
              </label>
              <select
                value={bkStudentId}
                onChange={(e) => setBkStudentId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              >
                <option value="">-- Pilih Siswa --</option>
                {(db.students || []).map((st: any) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.rombel}) - {st.nisn}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kategori
                </label>
                <select
                  value={bkCategory}
                  onChange={(e) => setBkCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                >
                  <option value="PEMBINAAN">Pembinaan</option>
                  <option value="PRESTASI">Prestasi</option>
                  <option value="PELANGGARAN">Pelanggaran</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Poin
                </label>
                <input
                  type="number"
                  value={bkPoints}
                  onChange={(e) => setBkPoints(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan Konseling
              </label>
              <textarea
                rows={3}
                value={bkNote}
                onChange={(e) => setBkNote(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold"
            >
              Simpan Catatan BK
            </button>
          </form>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-base font-extrabold text-slate-900 mb-4">
              Riwayat Konseling Terbaru
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(db.counselingNotes || []).slice(0, 15).map((c: any, i: number) => (
                <div
                  key={c.id || i}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-900">{c.studentName || c.studentId}</span>
                    <span className="text-teal-700">{c.category} ({c.points} poin)</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{c.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KURIKULUM */}
      {activeTab === "kurikulum" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <h3 className="text-base font-extrabold text-slate-900">
            Tambah Jadwal Pelajaran (Cek Bentrok Otomatis)
          </h3>
          <form
            onSubmit={handleCreateSchedule}
            className="grid grid-cols-1 md:grid-cols-5 gap-3"
          >
            <select
              value={schedDay}
              onChange={(e) => setSchedDay(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
            >
              {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"].map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <input
              type="text"
              value={schedTime}
              onChange={(e) => setSchedTime(e.target.value)}
              placeholder="07:00 - 08:20"
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
            <select
              value={schedRombel}
              onChange={(e) => setSchedRombel(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
            >
              {(db.academicMaster?.rombels || []).map((r) => (
                <option key={r.code} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
            <select
              value={schedSubject}
              onChange={(e) => setSchedSubject(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
            >
              {(db.academicMaster?.subjects || []).map((s) => (
                <option key={s.code} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold"
            >
              Tambah Jadwal
            </button>
          </form>
        </div>
      )}

      {/* PPDB SCORING */}
      {activeTab === "ppdb_scoring" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-base font-extrabold text-slate-900 mb-4">
            Daftar Calon Peserta Didik Baru ({(db.ppdb || []).length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4 font-bold">No. Reg</th>
                  <th className="py-2.5 pr-4 font-bold">Nama</th>
                  <th className="py-2.5 pr-4 font-bold">Asal Sekolah</th>
                  <th className="py-2.5 pr-4 font-bold">Status</th>
                  <th className="py-2.5 font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(db.ppdb || []).map((p: any) => (
                  <tr key={p.id}>
                    <td className="py-2.5 pr-4 font-mono">{p.regNumber || p.id}</td>
                    <td className="py-2.5 pr-4 font-bold text-slate-900">
                      {p.name}
                    </td>
                    <td className="py-2.5 pr-4">{p.originSchool || "-"}</td>
                    <td className="py-2.5 pr-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2.5 flex gap-1.5">
                      <button
                        onClick={() => handlePpdbScore(p.id, "DITERIMA")}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold"
                      >
                        Terima
                      </button>
                      <button
                        onClick={() => handlePpdbScore(p.id, "CADANGAN")}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-bold"
                      >
                        Cadangan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
