"use client";

import React, { useMemo, useState } from "react";
import {
  BookOpen,
  Calendar,
  HeartHandshake,
  LayoutDashboard,
  Wallet,
} from "lucide-react";
import PortalDashboardLayout, { NavGroup } from "./PortalDashboardLayout";
import { ActiveSession, PortalDbSummary } from "./types";

interface SiswaPortalProps {
  db: PortalDbSummary;
  session: ActiveSession | null;
  onOpenChangePassword: () => void;
  onRequestLogout: () => void;
}

export default function SiswaPortal({
  db,
  session,
  onOpenChangePassword,
  onRequestLogout,
}: SiswaPortalProps) {
  const [activeView, setActiveView] = useState<string>("overview");

  const myStudent = useMemo(() => {
    if (session?.nisn) {
      const found = db.students.find((s) => s.nisn === session.nisn);
      if (found) return found;
    }
    if (session?.name) {
      const found = db.students.find((s) => s.name.toLowerCase() === session.name.toLowerCase());
      if (found) return found;
    }
    return db.students[0] || null;
  }, [db.students, session]);

  const myRombel = myStudent?.rombel || session?.rombel || "7A";

  const mySchedules = useMemo(
    () => db.schedules.filter((s) => s.rombel === myRombel),
    [db.schedules, myRombel]
  );

  const myBkNotes = useMemo(
    () =>
      myStudent
        ? db.counselingNotes.filter(
            (n) => n.studentId === myStudent.id || n.studentName === myStudent.name
          )
        : [],
    [db.counselingNotes, myStudent]
  );

  const navGroups: NavGroup[] = [
    {
      title: "Menu Siswa",
      items: [
        { key: "overview", label: "Ringkasan Belajar", icon: LayoutDashboard },
        { key: "jadwal", label: `Jadwal Kelas ${myRombel}`, icon: Calendar, badge: mySchedules.length },
        { key: "bukuinduk", label: "Biodata & Arsip Digital", icon: BookOpen },
        { key: "bk", label: "Catatan Bimbingan & BK", icon: HeartHandshake, badge: myBkNotes.length },
        { key: "komite", label: "Info Komite & Tabungan", icon: Wallet },
      ],
    },
  ];

  const metaMap: Record<string, { breadcrumb: string; title: string }> = {
    overview: { breadcrumb: "Portal Siswa / Beranda", title: `Halo, ${myStudent?.name || session?.name || "Siswa"}` },
    jadwal: { breadcrumb: "Portal Siswa / Jadwal", title: `Jadwal Pelajaran Kelas ${myRombel}` },
    bukuinduk: { breadcrumb: "Portal Siswa / Biodata", title: "Buku Induk & Dokumen R2" },
    bk: { breadcrumb: "Portal Siswa / BK", title: "Catatan Pembinaan & Prestasi" },
    komite: { breadcrumb: "Portal Siswa / Keuangan", title: "Informasi Rekening Komite Madrasah" },
  };

  return (
    <PortalDashboardLayout
      portalBadge="Portal Siswa"
      portalSubtitle={`Kelas ${myRombel}`}
      profile={db.profile}
      session={session}
      navGroups={navGroups}
      activeView={activeView}
      onSelectView={setActiveView}
      pageMeta={metaMap[activeView] || metaMap.overview}
      onOpenChangePassword={onOpenChangePassword}
      onRequestLogout={onRequestLogout}
    >
      {activeView === "overview" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-surface rounded-2xl p-5 shadow-soft">
              <div className="text-xs font-semibold text-slate-500">Rombel Aktif</div>
              <div className="text-3xl font-extrabold text-emerald-700 mt-1">{myRombel}</div>
              <div className="text-xs text-slate-500 mt-1">NISN: {myStudent?.nisn || session?.nisn || "-"}</div>
            </div>
            <div className="glass-surface rounded-2xl p-5 shadow-soft">
              <div className="text-xs font-semibold text-slate-500">Jadwal Pelajaran</div>
              <div className="text-3xl font-extrabold text-slate-900 mt-1">{mySchedules.length}</div>
              <div className="text-xs text-slate-500 mt-1">Sesi per minggu</div>
            </div>
            <div className="glass-surface rounded-2xl p-5 shadow-soft">
              <div className="text-xs font-semibold text-slate-500">Arsip Dokumen R2</div>
              <div className="text-3xl font-extrabold text-slate-900 mt-1">
                {myStudent?.r2Documents?.length || 0}
              </div>
              <div className="text-xs text-slate-500 mt-1">Berkas terverifikasi TU</div>
            </div>
          </div>

          <div className="glass-surface rounded-2xl p-6 shadow-soft">
            <h3 className="text-base font-bold text-slate-900 mb-3">Jadwal Kelas {myRombel}</h3>
            <div className="space-y-2">
              {mySchedules.slice(0, 6).map((sc) => (
                <div key={sc.id} className="p-3 rounded-xl bg-white border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-slate-900">
                      {sc.day} • {sc.subject}
                    </div>
                    <div className="text-[11px] text-slate-500">{sc.teacherName}</div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700">
                    {sc.startTime} - {sc.endTime}
                  </span>
                </div>
              ))}
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
                <th className="py-2.5 px-3">Mata Pelajaran</th>
                <th className="py-2.5 px-3">Guru</th>
                <th className="py-2.5 px-3">Ruang</th>
              </tr>
            </thead>
            <tbody>
              {mySchedules.map((sc) => (
                <tr key={sc.id} className="border-b border-slate-100">
                  <td className="py-2.5 px-3 font-semibold">{sc.day}</td>
                  <td className="py-2.5 px-3">{sc.startTime} - {sc.endTime}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{sc.subject}</td>
                  <td className="py-2.5 px-3">{sc.teacherName}</td>
                  <td className="py-2.5 px-3">{sc.room}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeView === "bukuinduk" ? (
        <div className="glass-surface rounded-2xl p-6 shadow-soft space-y-4">
          <h3 className="text-base font-bold text-slate-900">Biodata Resmi Buku Induk</h3>
          {myStudent ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white border border-slate-100">
                <span className="text-slate-500">Nama Lengkap:</span>{" "}
                <strong className="text-slate-900">{myStudent.name}</strong>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-100">
                <span className="text-slate-500">NIS / NISN:</span>{" "}
                <strong className="text-slate-900">{myStudent.nis} / {myStudent.nisn}</strong>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-100">
                <span className="text-slate-500">Rombel:</span>{" "}
                <strong className="text-emerald-700">{myStudent.rombel}</strong>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-100">
                <span className="text-slate-500">Status:</span>{" "}
                <strong className="text-slate-900">{myStudent.status}</strong>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Data biodata belum tersedia.</p>
          )}
        </div>
      ) : activeView === "bk" ? (
        <div className="glass-surface rounded-2xl p-6 shadow-soft space-y-3">
          <h3 className="text-base font-bold text-slate-900">Catatan Bimbingan & Konseling</h3>
          {myBkNotes.length === 0 ? (
            <p className="text-xs text-slate-500">Belum ada catatan BK.</p>
          ) : (
            myBkNotes.map((n) => (
              <div key={n.id} className="p-3.5 rounded-xl bg-white border border-slate-100">
                <div className="font-bold text-xs text-slate-900">
                  {n.category} • {n.date}
                </div>
                <p className="text-xs text-slate-600 mt-1">{n.summary}</p>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="glass-surface rounded-2xl p-6 shadow-soft space-y-2">
          <h3 className="text-base font-bold text-slate-900">Rekening Komite Resmi Madrasah</h3>
          <p className="text-sm font-bold text-emerald-700">{db.profile?.komiteBankInfo}</p>
          <p className="text-xs text-slate-500">
            Pastikan transfer hanya ke rekening resmi di atas dan simpan bukti transfer untuk konfirmasi ke Tata Usaha.
          </p>
        </div>
      )}
    </PortalDashboardLayout>
  );
}
