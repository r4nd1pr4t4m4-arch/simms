"use client";

import React, { useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  HeartHandshake,
  MapPin,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import PortalDashboardLayout, { NavGroup } from "./PortalDashboardLayout";
import SharedModules, { SharedModuleKey } from "./SharedModules";
import {
  ActiveSession,
  PortalDbSummary,
  calcHaversineMeters,
  callSimmAction,
} from "./types";

interface GtkPortalProps {
  db: PortalDbSummary;
  session: ActiveSession | null;
  onRefresh: () => Promise<void> | void;
  onOpenChangePassword: () => void;
  onRequestLogout: () => void;
  triggerToast: (title: string, sub: string) => void;
}

const SHARED_VIEWS: ReadonlySet<string> = new Set<SharedModuleKey>([
  "piket_management",
  "bk_counseling",
]);

export default function GtkPortal({
  db,
  session,
  onRefresh,
  onOpenChangePassword,
  onRequestLogout,
  triggerToast,
}: GtkPortalProps) {
  const [activeView, setActiveView] = useState<string>("overview");
  const [gpsStatus, setGpsStatus] = useState<{
    lat: number | null;
    lng: number | null;
    accuracy: number | null;
    distance: number | null;
    error: string | null;
    locating: boolean;
  }>({
    lat: null,
    lng: null,
    accuracy: null,
    distance: null,
    error: null,
    locating: false,
  });
  const [busy, setBusy] = useState(false);

  // Izin / Sakit upload
  const [leaveType, setLeaveType] = useState<"Izin" | "Sakit">("Izin");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveFile, setLeaveFile] = useState<File | null>(null);

  const profile = db.profile;
  const targetLat = Number(profile?.gpsLat || -3.0659978);
  const targetLng = Number(profile?.gpsLng || 102.8196529);
  const maxRadius = Number(profile?.gpsRadiusMeters || 100);

  const myRoles = useMemo(() => session?.additionalRoles || [], [session?.additionalRoles]);
  const myAttendances = useMemo(() => db.teacherAttendances || [], [db.teacherAttendances]);
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecord = useMemo(
    () =>
      myAttendances.find(
        (a) =>
          a.date === todayStr &&
          (!session?.name || a.teacherName.toLowerCase() === session.name.toLowerCase())
      ),
    [myAttendances, todayStr, session?.name]
  );

  const mySchedules = useMemo(() => {
    if (!session?.name) return db.schedules;
    const mine = db.schedules.filter((s) =>
      s.teacherName.toLowerCase().includes(session.name.toLowerCase())
    );
    return mine.length > 0 ? mine : db.schedules;
  }, [db.schedules, session?.name]);

  const waliRombel =
    session?.roleDetails?.find((r) => r.type === "Wali Kelas")?.detail ||
    session?.waliKelas ||
    "7A";
  const waliStudents = useMemo(
    () => db.students.filter((s) => s.rombel === waliRombel),
    [db.students, waliRombel]
  );

  const navGroups: NavGroup[] = [
    {
      title: "Portal Utama GTK",
      items: [
        { key: "overview", label: "Check-In GPS & Beranda", icon: MapPin },
        { key: "jadwal", label: "Jadwal Mengajar", icon: Calendar, badge: mySchedules.length },
        { key: "presensi", label: "Riwayat Presensi", icon: Clock, badge: myAttendances.length },
      ],
    },
    {
      title: "Tugas Tambahan",
      items: [
        ...(myRoles.includes("Wali Kelas") || myRoles.length === 0
          ? [{ key: "walikelas", label: `Wali Kelas (${waliRombel})`, icon: Users }]
          : []),
        ...(myRoles.includes("Guru Piket") || session?.baseRole === "ADMIN"
          ? [{ key: "piket_management", label: "Manajemen Guru Piket", icon: UserCheck }]
          : []),
        ...(myRoles.includes("Guru BK") || session?.baseRole === "ADMIN"
          ? [{ key: "bk_counseling", label: "Bimbingan Konseling", icon: HeartHandshake }]
          : []),
        ...(myRoles.includes("Bendahara Komite")
          ? [{ key: "komite", label: "Keuangan & Komite", icon: Wallet }]
          : []),
      ],
    },
  ];

  const fetchCurrentGps = (): Promise<{ lat: number; lng: number; accuracy: number }> =>
    new Promise((resolve, reject) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        reject(new Error("Browser tidak mendukung Geolocation GPS."));
        return;
      }
      setGpsStatus((p) => ({ ...p, locating: true, error: null }));
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = Math.round(pos.coords.accuracy);
          const distance = Math.round(calcHaversineMeters(lat, lng, targetLat, targetLng));
          setGpsStatus({
            lat,
            lng,
            accuracy,
            distance,
            error: null,
            locating: false,
          });
          resolve({ lat, lng, accuracy });
        },
        (err) => {
          let msg = "Gagal membaca lokasi GPS.";
          if (err.code === err.PERMISSION_DENIED) {
            msg = "Izin lokasi ditolak. Aktifkan izin lokasi di browser Anda.";
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = "Sinyal GPS tidak tersedia. Pastikan GPS perangkat aktif.";
          } else if (err.code === err.TIMEOUT) {
            msg = "Waktu pembacaan GPS habis. Coba ulangi di area terbuka.";
          }
          setGpsStatus((p) => ({ ...p, locating: false, error: msg }));
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });

  const handleCheckIn = async () => {
    setBusy(true);
    try {
      const coords = await fetchCurrentGps();
      const res = await callSimmAction("RECORD_TEACHER_ATTENDANCE", {
        teacherId: session?.userId,
        teacherName: session?.name || "Guru",
        status: "Hadir",
        lat: coords.lat,
        lng: coords.lng,
        accuracy: coords.accuracy,
      });
      if (res.ok) {
        triggerToast("Check-In Berhasil", "Kehadiran GPS Anda tercatat.");
        await onRefresh();
      } else {
        triggerToast("Check-In Ditolak", res.error || "Posisi di luar radius madrasah.");
      }
    } catch (e) {
      triggerToast("GPS Bermasalah", e instanceof Error ? e.message : "Gagal check-in.");
    } finally {
      setBusy(false);
    }
  };

  const handleCheckOut = async () => {
    setBusy(true);
    try {
      const coords = await fetchCurrentGps();
      const res = await callSimmAction("RECORD_TEACHER_CHECKOUT", {
        teacherId: session?.userId,
        teacherName: session?.name || "Guru",
        lat: coords.lat,
        lng: coords.lng,
        accuracy: coords.accuracy,
      });
      if (res.ok) {
        triggerToast("Check-Out Berhasil", "Jam pulang Anda berhasil dicatat.");
        await onRefresh();
      } else {
        triggerToast("Check-Out Gagal", res.error || "Gagal mencatat check-out.");
      }
    } catch (e) {
      triggerToast("GPS Bermasalah", e instanceof Error ? e.message : "Gagal check-out.");
    } finally {
      setBusy(false);
    }
  };

  const handleLeaveSubmit = async () => {
    if (!leaveReason.trim()) {
      triggerToast("Alasan Kosong", "Tuliskan keterangan izin atau sakit.");
      return;
    }
    setBusy(true);
    try {
      let attachmentUrl = "";
      if (leaveFile) {
        const fd = new FormData();
        fd.append("file", leaveFile);
        fd.append("folder", `izin-gtk/${session?.userId || "gtk"}`);
        const up = await fetch("/api/r2/upload", { method: "POST", body: fd });
        const upJson = await up.json();
        if (upJson.ok) attachmentUrl = upJson.url;
      }
      const res = await callSimmAction("RECORD_TEACHER_ATTENDANCE", {
        teacherId: session?.userId,
        teacherName: session?.name || "Guru",
        status: leaveType,
        notes: leaveReason.trim(),
        attachmentUrl,
      });
      if (res.ok) {
        triggerToast("Pengajuan Terkirim", `Status ${leaveType} berhasil dicatat.`);
        setLeaveReason("");
        setLeaveFile(null);
        await onRefresh();
      } else {
        triggerToast("Gagal", res.error || "Gagal mengirim pengajuan.");
      }
    } finally {
      setBusy(false);
    }
  };

  const pageMetaMap: Record<string, { breadcrumb: string; title: string }> = {
    overview: { breadcrumb: "Portal GTK / Beranda", title: "Presensi GPS & Ringkasan Mengajar" },
    jadwal: { breadcrumb: "Portal GTK / Jadwal", title: "Jadwal Mengajar Mingguan" },
    presensi: { breadcrumb: "Portal GTK / Presensi", title: "Riwayat Kehadiran GTK" },
    walikelas: { breadcrumb: "Tugas Tambahan / Wali Kelas", title: `Perwalian Kelas ${waliRombel}` },
    piket_management: { breadcrumb: "Tugas Tambahan / Piket", title: "Manajemen & Log Guru Piket" },
    bk_counseling: { breadcrumb: "Tugas Tambahan / BK", title: "Bimbingan & Konseling Siswa" },
    komite: { breadcrumb: "Tugas Tambahan / Bendahara", title: "Informasi Rekening Komite" },
  };

  return (
    <PortalDashboardLayout
      portalBadge="Portal GTK"
      portalSubtitle={session?.subject || "Guru & Tenaga Kependidikan"}
      profile={db.profile}
      session={session}
      navGroups={navGroups}
      activeView={activeView}
      onSelectView={setActiveView}
      pageMeta={pageMetaMap[activeView] || pageMetaMap.overview}
      onOpenChangePassword={onOpenChangePassword}
      onRequestLogout={onRequestLogout}
    >
      {SHARED_VIEWS.has(activeView) ? (
        <SharedModules
          moduleKey={activeView as SharedModuleKey}
          db={db}
          session={session}
          onRefresh={onRefresh}
          triggerToast={triggerToast}
          onSelectView={setActiveView}
        />
      ) : activeView === "overview" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* GPS Check-in Card */}
            <div className="glass-surface rounded-2xl p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Presensi Geofence GPS</h3>
                  <p className="text-xs text-slate-500">
                    Radius sah madrasah: {maxRadius} meter dari titik pusat {profile?.name}.
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    todayRecord?.checkInTime
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {todayRecord?.checkInTime ? `Hadir (${todayRecord.checkInTime})` : "Belum Check-In"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Koordinat Terdeteksi:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {gpsStatus.lat && gpsStatus.lng
                      ? `${gpsStatus.lat.toFixed(6)}, ${gpsStatus.lng.toFixed(6)}`
                      : "Belum dipindai"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jarak ke Madrasah:</span>
                  <span
                    className={`font-bold ${
                      gpsStatus.distance !== null && gpsStatus.distance <= maxRadius
                        ? "text-emerald-700"
                        : "text-slate-700"
                    }`}
                  >
                    {gpsStatus.distance !== null ? `${gpsStatus.distance} meter` : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Akurasi GPS:</span>
                  <span>{gpsStatus.accuracy !== null ? `±${gpsStatus.accuracy} m` : "-"}</span>
                </div>
                {gpsStatus.error && (
                  <div className="text-rose-600 font-semibold pt-1">{gpsStatus.error}</div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || gpsStatus.locating}
                  onClick={() => fetchCurrentGps().catch(() => undefined)}
                  className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
                >
                  {gpsStatus.locating ? "Memindai GPS..." : "Cek Posisi GPS"}
                </button>
                <button
                  type="button"
                  disabled={busy || Boolean(todayRecord?.checkInTime)}
                  onClick={handleCheckIn}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50"
                >
                  Check-In Sekarang
                </button>
                <button
                  type="button"
                  disabled={busy || !todayRecord?.checkInTime || Boolean(todayRecord?.checkOutTime)}
                  onClick={handleCheckOut}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {todayRecord?.checkOutTime ? `Pulang (${todayRecord.checkOutTime})` : "Check-Out Pulang"}
                </button>
              </div>
            </div>

            {/* Izin / Sakit Card */}
            <div className="glass-surface rounded-2xl p-6 shadow-soft space-y-3">
              <h3 className="text-lg font-bold text-slate-900">Pengajuan Izin / Sakit</h3>
              <p className="text-xs text-slate-500">
                Jika berhalangan hadir, ajukan izin beserta surat keterangan (opsional).
              </p>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as "Izin" | "Sakit")}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  <option value="Izin">Izin</option>
                  <option value="Sakit">Sakit</option>
                </select>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setLeaveFile(e.target.files?.[0] || null)}
                  className="text-xs text-slate-600 self-center"
                />
              </div>
              <textarea
                rows={3}
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="Keterangan izin / sakit..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <button
                type="button"
                disabled={busy}
                onClick={handleLeaveSubmit}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                Kirim Pengajuan {leaveType}
              </button>
            </div>
          </div>
        </div>
      ) : activeView === "jadwal" ? (
        <div className="glass-surface rounded-2xl p-6 shadow-soft overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 px-3">Hari</th>
                <th className="py-2.5 px-3">Jam</th>
                <th className="py-2.5 px-3">Rombel</th>
                <th className="py-2.5 px-3">Mata Pelajaran</th>
                <th className="py-2.5 px-3">Ruang</th>
              </tr>
            </thead>
            <tbody>
              {mySchedules.map((sc) => (
                <tr key={sc.id} className="border-b border-slate-100">
                  <td className="py-2.5 px-3 font-semibold">{sc.day}</td>
                  <td className="py-2.5 px-3">{sc.startTime} - {sc.endTime}</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-700">{sc.rombel}</td>
                  <td className="py-2.5 px-3">{sc.subject}</td>
                  <td className="py-2.5 px-3">{sc.room}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeView === "presensi" ? (
        <div className="glass-surface rounded-2xl p-6 shadow-soft space-y-2.5">
          {myAttendances.length === 0 ? (
            <p className="text-xs text-slate-500">Belum ada riwayat presensi tercatat.</p>
          ) : (
            myAttendances.map((a) => (
              <div key={a.id} className="p-3.5 rounded-xl bg-white border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-900">
                    {a.date} • {a.teacherName}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Masuk: {a.checkInTime || "-"} • Pulang: {a.checkOutTime || "-"} • Jarak: {a.distanceMeters ?? "-"} m
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                  {a.status}
                </span>
              </div>
            ))
          )}
        </div>
      ) : activeView === "walikelas" ? (
        <div className="glass-surface rounded-2xl p-6 shadow-soft space-y-3">
          <h3 className="text-base font-bold text-slate-900">Daftar Siswa Perwalian Kelas {waliRombel}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {waliStudents.map((st) => (
              <div key={st.id} className="p-3.5 rounded-xl bg-white border border-slate-100">
                <div className="font-bold text-sm text-slate-900">{st.name}</div>
                <div className="text-xs text-slate-500">
                  NIS {st.nis} • NISN {st.nisn} • {st.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-surface rounded-2xl p-6 shadow-soft space-y-2">
          <h3 className="text-base font-bold text-slate-900">Rekening Komite Madrasah</h3>
          <p className="text-sm font-semibold text-emerald-700">{profile?.komiteBankInfo}</p>
        </div>
      )}
    </PortalDashboardLayout>
  );
}
