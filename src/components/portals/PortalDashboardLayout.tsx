"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Globe,
  KeyRound,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { ActiveSession, MadrasahProfile, getInitials } from "./types";

export interface NavItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeTone?: "emerald" | "amber" | "sky" | "teal" | "slate";
}

export interface NavGroup {
  title: string;
  titleColor?: string;
  items: NavItem[];
}

interface PortalDashboardLayoutProps {
  portalBadge: string;
  portalSubtitle: string;
  profile: MadrasahProfile;
  session: ActiveSession | null;
  navGroups: NavGroup[];
  activeView: string;
  onSelectView: (key: string) => void;
  pageMeta: { breadcrumb: string; title: string };
  onOpenChangePassword: () => void;
  onRequestLogout: () => void;
  topLeftExtra?: React.ReactNode;
  sidebarExtra?: React.ReactNode;
  children: React.ReactNode;
}

const BADGE_CLASSES: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  sky: "bg-sky-50 text-sky-700",
  teal: "bg-teal-50 text-teal-700",
  slate: "bg-slate-100 text-slate-600",
};

export default function PortalDashboardLayout({
  portalBadge,
  portalSubtitle,
  profile,
  session,
  navGroups,
  activeView,
  onSelectView,
  pageMeta,
  onOpenChangePassword,
  onRequestLogout,
  topLeftExtra,
  sidebarExtra,
  children,
}: PortalDashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const initials = getInitials(session?.name || "SIMS");
  const joinedRoles = (session?.additionalRoles || []).join(" ").toLowerCase();
  const isKamad =
    session?.baseRole === "GTK" && joinedRoles.includes("kepala madrasah");

  const roleLabel = isKamad
    ? "Kepala Madrasah (Supervisi Eksekutif)"
    : session?.additionalRoles && session.additionalRoles.length > 0
      ? session.additionalRoles[0]
      : session?.baseRole || "Pengguna SIMS";

  const handleNavClick = (key: string) => {
    onSelectView(key);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* ===================================================================
          LEFT SIDEBAR NAVIGATION
      =================================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white/95 backdrop-blur-md border-r border-slate-200/80 flex flex-col transition-transform duration-200 ease-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 px-5 border-b border-slate-200/75 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-700 to-teal-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-extrabold text-sm text-slate-900 truncate">
                  {profile.name}
                </span>
              </div>
              <p className="text-[11px] font-semibold text-emerald-700 truncate">
                {portalBadge} • {portalSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
            aria-label="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {sidebarExtra}

          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <p
                className={`px-3 pb-1 text-[10px] font-bold uppercase tracking-wider ${
                  group.titleColor || "text-slate-400"
                }`}
              >
                {group.title}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleNavClick(item.key)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                      isActive
                        ? "font-semibold bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                        : "font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badge !== undefined && item.badge !== "" && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isActive
                            ? "bg-white/20 text-white"
                            : BADGE_CLASSES[item.badgeTone || "slate"]
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Account & Navigation Footer */}
          <div className="pt-3 mt-3 border-t border-slate-200/80 space-y-1">
            <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Akun &amp; Navigasi
            </p>
            <Link
              href="/"
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all"
            >
              <span className="flex items-center gap-3 min-w-0">
                <Globe className="w-4 h-4 shrink-0" />
                <span className="truncate">Beranda Publik</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setSidebarOpen(false);
                onOpenChangePassword();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all cursor-pointer"
            >
              <span className="flex items-center gap-3 min-w-0">
                <KeyRound className="w-4 h-4 shrink-0" />
                <span className="truncate">Ubah Kata Sandi</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSidebarOpen(false);
                onRequestLogout();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-all cursor-pointer"
            >
              <span className="flex items-center gap-3 min-w-0">
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="truncate">Keluar Aplikasi</span>
              </span>
            </button>
          </div>
        </nav>

        {/* Bottom Status Indicator */}
        <div className="p-4 border-t border-slate-200/75 bg-slate-50/70 shrink-0">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sistem Aktif
            </span>
            <span className="font-mono text-[10px] text-emerald-700 font-bold">
              TA {profile.academicYear}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Semester {profile.semester} • NSM {profile.nsm}
          </p>
        </div>
      </aside>

      {/* ===================================================================
          MAIN CONTENT SHELL
      =================================================================== */}
      <div className="lg:pl-72 flex-1 min-w-0 min-h-screen flex flex-col">
        {/* TOP STICKY HEADER */}
        <header className="sticky top-0 z-30 h-20 glass-surface border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Buka Navigasi"
              className="lg:hidden p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span>{portalBadge}</span>
                <span>/</span>
                <span className="text-emerald-700 font-semibold truncate">
                  {pageMeta.breadcrumb}
                </span>
              </div>
              <h1 className="font-heading font-bold text-base sm:text-xl text-slate-900 truncate">
                {pageMeta.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {topLeftExtra}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs font-semibold text-emerald-800">
              <span>TA {profile.academicYear}</span>
              <span>•</span>
              <span>{profile.semester}</span>
            </div>

            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200/80">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-heading font-bold text-xs flex items-center justify-center shadow-2xs">
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-900 leading-tight max-w-[160px] truncate">
                  {session?.name || "Pengguna SIMS"}
                </p>
                <p className="text-[11px] text-emerald-700 font-medium leading-tight max-w-[160px] truncate">
                  {roleLabel}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
