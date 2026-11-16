"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ActiveSession,
  PortalDbSummary,
  PortalKey,
} from "./portals/types";
import PublikPortal from "./portals/PublikPortal";
import PpdbPortal from "./portals/PpdbPortal";
import AdminPortal from "./portals/AdminPortal";
import TuPortal from "./portals/TuPortal";
import GtkPortal from "./portals/GtkPortal";
import SiswaPortal from "./portals/SiswaPortal";
import OrtuPortal from "./portals/OrtuPortal";

const PROTECTED_PORTALS: ReadonlySet<PortalKey> = new Set<PortalKey>([
  "admin",
  "tu",
  "gtk",
  "siswa",
  "ortu",
]);

export default function SimmWorkspaceShell({
  activePortal,
}: {
  activePortal: PortalKey;
}) {
  const router = useRouter();
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [db, setDb] = useState<PortalDbSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeModal, setActiveModal] = useState<
    "change_password" | "logout_confirm" | null
  >(null);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Toast state
  const [toastMsg, setToastMsg] = useState<{ title: string; sub: string } | null>(
    null
  );

  const triggerToast = useCallback((title: string, sub: string) => {
    setToastMsg({ title, sub });
    setTimeout(() => {
      setToastMsg((prev) => (prev?.title === title && prev?.sub === sub ? null : prev));
    }, 4200);
  }, []);

  const loadWorkspaceData = useCallback(async () => {
    try {
      setLoadError(null);
      const sessRes = await fetch("/api/auth/session", { cache: "no-store" });
      const sessData = await sessRes.json();
      const activeUser: ActiveSession | null = sessData?.authenticated
        ? sessData.user
        : null;
      setSession(activeUser);

      if (PROTECTED_PORTALS.has(activePortal) && !activeUser) {
        router.replace("/");
        return;
      }

      if (activeUser?.mustChangePassword && PROTECTED_PORTALS.has(activePortal)) {
        setActiveModal("change_password");
      }

      const resource = PROTECTED_PORTALS.has(activePortal)
        ? "summary"
        : "public_summary";
      const dbRes = await fetch(`/api/simm?resource=${resource}`, {
        cache: "no-store",
      });
      const dbData = await dbRes.json();
      if (!dbRes.ok || !dbData?.ok) {
        if (dbRes.status === 401 && PROTECTED_PORTALS.has(activePortal)) {
          router.replace("/");
          return;
        }
        setLoadError(dbData?.error || "Gagal memuat data portal.");
      } else {
        setDb(dbData as PortalDbSummary);
      }
    } catch {
      setLoadError("Koneksi ke server SIMMS terputus.");
    } finally {
      setLoading(false);
    }
  }, [activePortal, router]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      triggerToast("Input Belum Lengkap", "Isi kata sandi lama dan baru.");
      return;
    }
    if (newPassword.length < 8) {
      triggerToast("Kata Sandi Lemah", "Kata sandi baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      triggerToast("Konfirmasi Tidak Cocok", "Ulangi kata sandi baru dengan benar.");
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        triggerToast("Kata Sandi Diperbarui", "Kata sandi akun Anda berhasil diubah.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setActiveModal(null);
        await loadWorkspaceData();
      } else {
        triggerToast("Gagal Mengubah", data.error || "Periksa kata sandi lama Anda.");
      }
    } catch {
      triggerToast("Error Koneksi", "Tidak dapat menghubungi server.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore network error on logout
    }
    setActiveModal(null);
    setSession(null);
    router.push("/");
  };

  if (loading && !db) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="glass-surface rounded-3xl p-8 shadow-soft max-w-sm w-full text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 animate-pulse flex items-center justify-center text-white font-bold">
            NF
          </div>
          <div className="text-sm font-bold text-slate-800">Memuat Portal SIMMS...</div>
          <div className="text-xs text-slate-500">Menyiapkan ruang kerja native madrasah</div>
        </div>
      </div>
    );
  }

  if (loadError && !db) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="glass-surface rounded-3xl p-8 shadow-soft max-w-md w-full text-center space-y-4">
          <div className="text-base font-bold text-rose-700">Gagal Memuat Portal</div>
          <p className="text-xs text-slate-600">{loadError}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              loadWorkspaceData();
            }}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
          >
            Muat Ulang
          </button>
        </div>
      </div>
    );
  }

  const renderPortal = () => {
    if (!db) return null;
    switch (activePortal) {
      case "publik":
        return (
          <PublikPortal
            db={db}
            session={session}
            onLoginSuccess={loadWorkspaceData}
            triggerToast={triggerToast}
          />
        );
      case "ppdb":
        return <PpdbPortal db={db} triggerToast={triggerToast} />;
      case "admin":
        return (
          <AdminPortal
            db={db}
            session={session}
            onRefresh={loadWorkspaceData}
            onOpenChangePassword={() => setActiveModal("change_password")}
            onRequestLogout={() => setActiveModal("logout_confirm")}
            triggerToast={triggerToast}
          />
        );
      case "tu":
        return (
          <TuPortal
            db={db}
            session={session}
            onRefresh={loadWorkspaceData}
            onOpenChangePassword={() => setActiveModal("change_password")}
            onRequestLogout={() => setActiveModal("logout_confirm")}
            triggerToast={triggerToast}
          />
        );
      case "gtk":
        return (
          <GtkPortal
            db={db}
            session={session}
            onRefresh={loadWorkspaceData}
            onOpenChangePassword={() => setActiveModal("change_password")}
            onRequestLogout={() => setActiveModal("logout_confirm")}
            triggerToast={triggerToast}
          />
        );
      case "siswa":
        return (
          <SiswaPortal
            db={db}
            session={session}
            onOpenChangePassword={() => setActiveModal("change_password")}
            onRequestLogout={() => setActiveModal("logout_confirm")}
          />
        );
      case "ortu":
        return (
          <OrtuPortal
            db={db}
            session={session}
            onOpenChangePassword={() => setActiveModal("change_password")}
            onRequestLogout={() => setActiveModal("logout_confirm")}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      {renderPortal()}

      {/* MODAL UBAH KATA SANDI */}
      {activeModal === "change_password" && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleChangePassword}
            className="glass-modal rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Ubah Kata Sandi</h3>
              {!session?.mustChangePassword && (
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="text-slate-400 hover:text-slate-700 font-bold"
                >
                  ✕
                </button>
              )}
            </div>
            {session?.mustChangePassword && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                Untuk keamanan akun baru Anda, harap segera ganti kata sandi bawaan.
              </div>
            )}
            <div className="space-y-3">
              <input
                type="password"
                placeholder="Kata Sandi Lama"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                required
              />
              <input
                type="password"
                placeholder="Kata Sandi Baru (min. 8 karakter)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                required
              />
              <input
                type="password"
                placeholder="Ulangi Kata Sandi Baru"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              {!session?.mustChangePassword && (
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
                >
                  Batal
                </button>
              )}
              <button
                type="submit"
                disabled={changingPassword}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50"
              >
                {changingPassword ? "Menyimpan..." : "Simpan Kata Sandi"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL KONFIRMASI LOGOUT */}
      {activeModal === "logout_confirm" && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-modal rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-lg">
              !
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Keluar dari Aplikasi?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Sesi Anda sebagai <strong>{session?.name || "Pengguna"}</strong> akan diakhiri.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-[60] max-w-sm w-full sm:w-auto bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-start gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
          <div>
            <div className="text-xs font-bold">{toastMsg.title}</div>
            <div className="text-[11px] text-slate-300 mt-0.5">{toastMsg.sub}</div>
          </div>
        </div>
      )}
    </>
  );
}
