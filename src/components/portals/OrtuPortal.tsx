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

interface OrtuPortalProps {
  db: PortalDbSummary;
  session: ActiveSession | null;
  onOpenChangePassword: () => void;
  onRequestLogout: () => void;
}

export default function OrtuPortal({
  db,
  session,
  onOpenChangePassword,
  onRequestLogout,
}: OrtuPortalProps) {
  const [activeView, setActiveView] = useState<string>("overview");
  const [selectedChildId, setSelectedChildId] = useState<string>(db.students[0]?.id || "");

  const child = useMemo(() => {
    return db.students.find((s) => s.id === selectedChildId) || db.students[0] || null;
  }, [db.students, selectedChildId]);

  const childSchedules = useMemo(
    () => (child ? db.schedules.filter((s) => s.rombel === child.rombel) : []),
    [db.schedules, child]
  );

  const childBkNotes = useMemo(
    () =>
      child
        ? db.counselingNotes.filter((n) => n.studentId === child.id || n.studentName === child.name)
        : [],
    [db.counselingNotes, child]
  );

  const navGroups: NavGroup[] = [
    {
      title: "Pemantauan Putra/Putri",
      items: [
        { key: "overview", label: "Ringkasan Perkembangan", icon: LayoutDashboard },
        { key: "biodata", label: "Biodata & Arsip R2", icon: BookOpen },
        { key: "jadwal", label: "Jadwal Pelajaran Anak", icon: Calendar, badge: childSchedules.length },
        { key: "bk", label: "Catatan Bimbingan BK", icon: HeartHandshake, badge: childBkNotes.length },
        { key: "komite", label: "Pembayaran Komite", icon: Wallet },
      ],
    },
  ];

  const metaMap: Record<string, { breadcrumb: string; title: string }> = {
    overview: { breadcrumb: "Portal Orang Tua / Ringkasan", title: `Pemantauan ${child?.name || "Putra/Putri"}` },
    biodata: { breadcrumb: "Portal Orang Tua / Biodata", title: "Biodata Buku Induk & Berkas" },
    jadwal: { breadcrumb: "Portal Orang Tua / Jadwal", title: `Jadwal Kelas ${child?.rombel || "-"}` },
    bk: { breadcrumb: "Portal Orang Tua / Konseling", title: "Laporan Bimbingan & Disiplin" },
    komite: { breadcrumb: "Portal Orang Tua / Komite", title: "Rekening Resmi Komite Madrasah" },
  };

  return (
    <PortalDashboardLayout
      portalBadge="Orang Tua / Wali"
      portalSubtitle={child ? `${child.name} (${child.rombel})` : "Pemantauan Siswa"}
      profile={db.profile}
      session={session}
      navGroups={navGroups}
      activeView={activeView}
      onSelectView={setActiveView}
      pageMeta={metaMap[activeView] || metaMap.overview}
      onOpenChangePassword={onOpenChangePassword}
      onRequestLogout={onRequestLogout}
      topLeftExtra={
        db.students.length > 1 ? (
          <select
            value={child?.id || ""}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-800"
          >
            {db.students.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.rombel})
              </option>
            ))}
          </select>
        ) : null
      }
    >
      {activeView === "overview" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-surface rounded-2xl p-5 shadow-soft">
              <div className="text-xs font-semibold text-slate-500">Kelas Saat Ini</div>
              <div className="text-3xl font-extrabold text-emerald-700 mt-1">{child?.rombel || "-"}</div>
              <div className="text-xs text-slate-500 mt-1">Status: {child?.status || "Aktif"}</div>
            </div>
            <div className="glass-surface rounded-2xl p-5 shadow-soft">
              <div className="text-xs font-semibold text-slate-500">Catatan BK</div>
              <div className="text-3xl font-extrabold text-slate-900 mt-1">{childBkNotes.length}</div>
              <div className="text-xs text-slate-500 mt-1">Laporan pembinaan/prestasi</div>
            </div>
            <div className="glass-surface rounded-2xl p-5 shadow-soft">
              <div className="text-xs font-semibold text-slate-500">Arsip Digital R2</div>
              <div className="text-3xl font-extrabold text-slate-900 mt-1">
                {child?.r2Documents?.length || 0}
              </div>
              <div className="text-xs text-slate-500 mt-1">Dokumen tersimpan</div>
            </div>
          </div>

          <div className="glass-surface rounded-2xl p-6 shadow-soft space-y-2">
            <h3 className="text-base font-bold text-slate-900">Informasi Rekening Resmi Komite</h3>
            <p className="text-sm font-bold text-emerald-700">{db.profile?.komiteBankInfo}</p>
            <p className="text-xs text-slate-500">
              Seluruh pembayaran komite hanya melalui rekening resmi di atas.
            </p>
          </div>
        </div>
      ) : activeView === "biodata" ? (
        <div className="glass-surface rounded-2xl p-6 shadow-soft space-y-4">
          <h3 className="text-base font-bold text-slate-900">Biodata Resmi Siswa</h3>
          {child ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white border border-slate-100">
                <span className="text-slate-500">Nama:</span> <strong>{child.name}</strong>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-100">
                <span className="text-slate-500">NIS / NISN:</span>{" "}
                <strong>{child.nis} / {child.nisn}</strong>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-100">
                <span className="text-slate-500">Rombel:</span>{" "}
                <strong className="text-emerald-700">{child.rombel}</strong>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-100">
                <span className="text-slate-500">Nama Orang Tua:</span>{" "}
                <strong>{child.parentName || "-"}</strong>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Data siswa tidak ditemukan.</p>
          )}
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
              </tr>
            </thead>
            <tbody>
              {childSchedules.map((sc) => (
                <tr key={sc.id} className="border-b border-slate-100">
                  <td className="py-2.5 px-3 font-semibold">{sc.day}</td>
                  <td className="py-2.5 px-3">{sc.startTime} - {sc.endTime}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{sc.subject}</td>
                  <td className="py-2.5 px-3">{sc.teacherName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeView === "bk" ? (
        <div className="glass-surface rounded-2xl p-6 shadow-soft space-y-3">
          <h3 className="text-base font-bold text-slate-900">Laporan Bimbingan & Konseling</h3>
          {childBkNotes.length === 0 ? (
            <p className="text-xs text-slate-500">Belum ada catatan konseling untuk siswa ini.</p>
          ) : (
            childBkNotes.map((n) => (
              <div key={n.id} className="p-3.5 rounded-xl bg-white border border-slate-100">
                <div className="font-bold text-xs text-slate-900">
                  {n.category} • {n.date}
                </div>
                <p className="text-xs text-slate-600 mt-1">{n.summary}</p>
                <p className="text-[11px] text-slate-400 mt-1">Tindak Lanjut: {n.followUp}</p>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="glass-surface rounded-2xl p-6 shadow-soft space-y-2">
          <h3 className="text-base font-bold text-slate-900">Pembayaran Komite Madrasah</h3>
          <p className="text-sm font-bold text-emerald-700">{db.profile?.komiteBankInfo}</p>
          <p className="text-xs text-slate-500">
            Hubungi Bendahara Komite / Tata Usaha madrasah untuk verifikasi bukti transfer.
          </p>
        </div>
      )}
    </PortalDashboardLayout>
  );
}
