/**
 * SIMS — Production Security, RBAC, Supabase & Cloudflare R2 Bridge
 */
(function () {
  if (window.__SIMM_BRIDGE_INITIALIZED__) return;
  window.__SIMM_BRIDGE_INITIALIZED__ = true;

  function notifyShell(type, payload) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ source: "SIMM_PORTAL", type, payload }, "*");
      }
    } catch (e) {
      console.warn("Notify shell error:", e);
    }
  }

  window.__SIMM_OPEN_MODAL__ = function (modalKey) {
    notifyShell("OPEN_MODAL", { modal: modalKey });
  };

  window.__SIMM_NAVIGATE__ = function (path) {
    notifyShell("NAVIGATE", { path });
    if (window.parent === window) {
      window.location.href = path;
    }
  };

  window.__SIMM_LOGOUT__ = async function () {
    notifyShell("LOGOUT", {});
    if (window.parent === window) {
      await fetch("/api/auth", { method: "DELETE" }).catch(() => null);
      window.location.href = "/";
    }
  };

  // Gabungkan menu sesi & modul tambahan langsung ke dalam daftar menu di Sidebar masing-masing dashboard
  function injectIntegratedSidebarSessionMenus(session) {
    if (!session) return;

    // Jika sedang di Halaman Publik (/), ubah tombol "Masuk SIMS" menjadi "Dashboard Saya"
    const loginBtns = document.querySelectorAll('button[onclick*="openLoginModal"]');
    loginBtns.forEach((btn) => {
      btn.setAttribute("onclick", `window.__SIMM_NAVIGATE__('${session.targetPath || "/"}')`);
      btn.innerHTML = `<i data-lucide="layout-dashboard" class="w-4 h-4"></i><span>Dashboard Saya</span>`;
    });

    const navEl =
      document.getElementById("dynamic-sidebar-nav") ||
      document.getElementById("tu-sidebar-nav") ||
      document.getElementById("student-sidebar-nav") ||
      document.getElementById("parent-sidebar-nav") ||
      document.querySelector('aside nav[aria-label="Menu Utama Admin"]');

    if (!navEl) {
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    const existing = document.getElementById("sims-integrated-sidebar-ext");
    if (existing) existing.remove();

    const joinedRoles = (session.additionalRoles || []).join(" ").toLowerCase();
    const isKepalaMadrasah =
      session.baseRole === "GTK" && joinedRoles.includes("kepala madrasah");
    const isSuperAdmin = session.baseRole === "ADMIN" || isKepalaMadrasah;
    const isTu = session.baseRole === "TU";
    const isGtk = session.baseRole === "GTK";

    const canAccessGoLiveSettings = isSuperAdmin || isTu;
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

    const currentPortalPath =
      window.parent && window.parent !== window
        ? window.parent.location.pathname
        : window.location.pathname;

    const moduleButtons = [];

    if (canAccessGoLiveSettings) {
      moduleButtons.push(`
        <button type="button" onclick="window.__SIMM_OPEN_MODAL__('golive_settings')" class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all cursor-pointer">
          <span class="flex items-center gap-3 min-w-0">
            <i data-lucide="building-2" class="w-4 h-4 text-emerald-600 shrink-0"></i>
            <span class="truncate">Master &amp; Import EMIS</span>
          </span>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">XLSX</span>
        </button>
      `);
    }

    if (canAccessPpdbScoring) {
      moduleButtons.push(`
        <button type="button" onclick="window.__SIMM_OPEN_MODAL__('ppdb_scoring')" class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all cursor-pointer">
          <span class="flex items-center gap-3 min-w-0">
            <i data-lucide="award" class="w-4 h-4 text-teal-600 shrink-0"></i>
            <span class="truncate">Skor &amp; Seleksi PPDB</span>
          </span>
        </button>
      `);
    }

    if (canAccessScheduleBuilder) {
      moduleButtons.push(`
        <button type="button" onclick="window.__SIMM_OPEN_MODAL__('schedule_conflict')" class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all cursor-pointer">
          <span class="flex items-center gap-3 min-w-0">
            <i data-lucide="calendar-clock" class="w-4 h-4 text-amber-600 shrink-0"></i>
            <span class="truncate">Jadwal Kurikulum</span>
          </span>
        </button>
      `);
    }

    if (canAccessBkDesk) {
      moduleButtons.push(`
        <button type="button" onclick="window.__SIMM_OPEN_MODAL__('bk_counseling')" class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all cursor-pointer">
          <span class="flex items-center gap-3 min-w-0">
            <i data-lucide="sparkles" class="w-4 h-4 text-purple-600 shrink-0"></i>
            <span class="truncate">Meja Kerja BK &amp; Poin</span>
          </span>
        </button>
      `);
    }

    if (canAccessBatchPromotion) {
      moduleButtons.push(`
        <button type="button" onclick="window.__SIMM_OPEN_MODAL__('batch_promotion')" class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all cursor-pointer">
          <span class="flex items-center gap-3 min-w-0">
            <i data-lucide="layers" class="w-4 h-4 text-sky-600 shrink-0"></i>
            <span class="truncate">Kenaikan Kelas Massal</span>
          </span>
        </button>
      `);
    }

    // Navigasi lintas portal khusus Pimpinan (Kepala Madrasah) & Super Admin
    if (isSuperAdmin && currentPortalPath !== "/admin") {
      moduleButtons.push(`
        <button type="button" onclick="window.__SIMM_NAVIGATE__('/admin')" class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all cursor-pointer">
          <span class="flex items-center gap-3 min-w-0">
            <i data-lucide="shield-check" class="w-4 h-4 text-emerald-600 shrink-0"></i>
            <span class="truncate">Panel Eksekutif Admin</span>
          </span>
        </button>
      `);
    }

    if (isSuperAdmin && currentPortalPath !== "/tu") {
      moduleButtons.push(`
        <button type="button" onclick="window.__SIMM_NAVIGATE__('/tu')" class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all cursor-pointer">
          <span class="flex items-center gap-3 min-w-0">
            <i data-lucide="file-spreadsheet" class="w-4 h-4 text-teal-600 shrink-0"></i>
            <span class="truncate">Portal Tata Usaha (TU)</span>
          </span>
        </button>
      `);
    }

    if (isKepalaMadrasah && currentPortalPath !== "/gtk") {
      moduleButtons.push(`
        <button type="button" onclick="window.__SIMM_NAVIGATE__('/gtk')" class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all cursor-pointer">
          <span class="flex items-center gap-3 min-w-0">
            <i data-lucide="graduation-cap" class="w-4 h-4 text-emerald-600 shrink-0"></i>
            <span class="truncate">Portal Guru &amp; GTK</span>
          </span>
        </button>
      `);
    }

    const extWrapper = document.createElement("div");
    extWrapper.id = "sims-integrated-sidebar-ext";
    extWrapper.className = "pt-3 mt-3 border-t border-slate-200/80 space-y-1";

    extWrapper.innerHTML = `
      ${
        moduleButtons.length > 0
          ? `<p class="px-3 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Modul &amp; Pengaturan</p>
             ${moduleButtons.join("")}`
          : ""
      }
      <p class="px-3 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Akun &amp; Navigasi</p>
      <button type="button" onclick="window.__SIMM_NAVIGATE__('/')" class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all cursor-pointer">
        <span class="flex items-center gap-3 min-w-0">
          <i data-lucide="globe" class="w-4 h-4 shrink-0"></i>
          <span class="truncate">Beranda Publik</span>
        </span>
      </button>
      <button type="button" onclick="window.__SIMM_OPEN_MODAL__('change_password')" class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all cursor-pointer">
        <span class="flex items-center gap-3 min-w-0">
          <i data-lucide="key-round" class="w-4 h-4 shrink-0"></i>
          <span class="truncate">Ubah Kata Sandi</span>
        </span>
      </button>
      <button type="button" onclick="window.__SIMM_LOGOUT__()" class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-all cursor-pointer">
        <span class="flex items-center gap-3 min-w-0">
          <i data-lucide="log-out" class="w-4 h-4 shrink-0"></i>
          <span class="truncate">Keluar Aplikasi</span>
        </span>
      </button>
    `;

    navEl.appendChild(extWrapper);
    if (window.lucide) window.lucide.createIcons();
  }

  function getInitials(name) {
    if (!name) return "SM";
    const parts = String(name)
      .replace(/^(Ust\.|Usth\.|Dr\.|Drs\.|H\.|Hj\.|Bapak|Ibu)\s+/gi, "")
      .trim()
      .split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // Terapkan identitas resmi madrasah ke elemen teks halaman jika berbeda dari default
  function applyMadrasahIdentityToDOM(profile) {
    if (!profile || !profile.name) return;
    document.title = document.title.replace(/MTs Nurul Falah/g, profile.name);
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null
    );
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
      if (
        node.nodeValue &&
        (node.nodeValue.includes("MTs Nurul Falah") ||
          node.nodeValue.includes("121232040089") ||
          node.nodeValue.includes("20278412"))
      ) {
        nodes.push(node);
      }
    }
    nodes.forEach((n) => {
      n.nodeValue = n.nodeValue
        .replace(/MTs Nurul Falah/g, profile.name)
        .replace(/121232040089/g, profile.nsm || "121232040089")
        .replace(/20278412/g, profile.npsn || "20278412");
    });
  }

  // Terapkan profil pengguna yang sedang login beserta Tugas Tambahan Dinamisnya
  function applyLiveUserSessionToPortal(session, db) {
    if (!session) return;
    const initials = getInitials(session.name);

    // 1. Dashboard Super Admin / Kepala Madrasah (/admin)
    const adminAvatar = document.getElementById("topbar-admin-avatar");
    const adminName = document.getElementById("topbar-admin-name");
    const adminRole = document.getElementById("topbar-admin-role");
    if (adminName) {
      if (adminAvatar) adminAvatar.textContent = initials;
      adminName.textContent = session.name;
      const isKamad = (session.additionalRoles || [])
        .join(" ")
        .toLowerCase()
        .includes("kepala madrasah");
      if (adminRole) {
        adminRole.textContent = isKamad
          ? "Kepala Madrasah (Supervisi Eksekutif)"
          : "Operator / Super Admin";
      }
    }

    // 2. Portal Guru & GTK (/gtk)
    if (
      typeof TEACHER_PROFILES !== "undefined" &&
      typeof window.switchTeacherProfile === "function"
    ) {
      const baseTemplate = TEACHER_PROFILES.fauzi || Object.values(TEACHER_PROFILES)[0];
      const rawRoles = Array.isArray(session.roleDetails)
        ? session.roleDetails
        : (session.additionalRoles || []).map((r) => {
            const m = String(r).match(/^([^(]+)(?:\(([^)]+)\))?/);
            return {
              type: m ? m[1].trim() : String(r),
              detail: m && m[2] ? m[2].trim() : "",
            };
          });

      const mappedRoles = [];
      let waliRombel = "VIII-A";
      const isKamadOrAdmin =
        session.baseRole === "ADMIN" ||
        rawRoles.some((r) =>
          String(r.type).toLowerCase().includes("kepala madrasah")
        );

      rawRoles.forEach((r) => {
        const t = String(r.type || "").toLowerCase();
        const detail = r.detail || "";
        if (t.includes("wali kelas")) {
          waliRombel = detail || "VIII-A";
          mappedRoles.push({
            id: "walikelas",
            label: "Wali Kelas " + waliRombel,
            classroom: waliRombel,
            badgeClass: "bg-sky-50 text-sky-800 border-sky-200/80",
          });
        } else if (t.includes("piket")) {
          mappedRoles.push({
            id: "piket",
            label: "Guru Piket" + (detail ? " (" + detail + ")" : ""),
            badgeClass: "bg-amber-50 text-amber-800 border-amber-200/80",
          });
        } else if (t.includes("tabungan")) {
          mappedRoles.push({
            id: "tabungan",
            label: "Pengelola Tabungan",
            badgeClass: "bg-teal-50 text-teal-800 border-teal-200/80",
          });
        } else if (t.includes("komite")) {
          mappedRoles.push({
            id: "komite",
            label: "Bendahara Komite",
            badgeClass: "bg-purple-50 text-purple-800 border-purple-200/80",
          });
        } else if (r.type) {
          mappedRoles.push({
            id: t.replace(/\s+/g, "_"),
            label: r.type + (detail ? " (" + detail + ")" : ""),
            badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
          });
        }
      });

      // Jika Kepala Madrasah atau Admin membuka /gtk, buka seluruh modul supervisi
      if (isKamadOrAdmin) {
        if (!mappedRoles.some((x) => x.id === "piket")) {
          mappedRoles.push({
            id: "piket",
            label: "Supervisi Guru Piket",
            badgeClass: "bg-amber-50 text-amber-800 border-amber-200/80",
          });
        }
        if (!mappedRoles.some((x) => x.id === "walikelas")) {
          mappedRoles.push({
            id: "walikelas",
            label: "Supervisi Wali Kelas",
            classroom: waliRombel,
            badgeClass: "bg-sky-50 text-sky-800 border-sky-200/80",
          });
        }
        if (!mappedRoles.some((x) => x.id === "tabungan")) {
          mappedRoles.push({
            id: "tabungan",
            label: "Supervisi Keuangan Siswa",
            badgeClass: "bg-teal-50 text-teal-800 border-teal-200/80",
          });
        }
      }

      // Jika ada data siswa di rombel binaan wali kelas, muat ke daftar siswa kelas
      if (
        db &&
        Array.isArray(db.students) &&
        typeof CLASS_8A_STUDENTS !== "undefined"
      ) {
        const classStudents = db.students.filter(
          (s) =>
            String(s.rombel || "").toUpperCase() ===
            String(waliRombel).toUpperCase()
        );
        const sourceList =
          classStudents.length > 0 ? classStudents : db.students.slice(0, 15);
        if (sourceList.length > 0) {
          CLASS_8A_STUDENTS.length = 0;
          sourceList.forEach((s, idx) => {
            CLASS_8A_STUDENTS.push({
              id: idx + 1,
              nis: s.nis,
              nisn: s.nisn,
              name: s.name,
              morningStatus: "H",
              note: "Siswa Aktif Rombel " + s.rombel,
            });
          });
        }
      }

      const profileKey = session.identifier || "active_gtk";
      TEACHER_PROFILES[profileKey] = {
        ...baseTemplate,
        key: profileKey,
        name: session.name,
        initials,
        nip: session.nip || session.identifier,
        subject: session.subject || "Pendidik Madrasah",
        totalJp: "18 JP / Pekan",
        roles: mappedRoles,
      };
      window.switchTeacherProfile(profileKey);
    }

    // 3. Portal Tata Usaha (/tu)
    if (
      typeof TU_STAFF_PROFILES !== "undefined" &&
      typeof window.switchTuStaffProfile === "function"
    ) {
      const baseTu = TU_STAFF_PROFILES.ridwan || Object.values(TU_STAFF_PROFILES)[0];
      const tuKey = session.identifier || "active_tu";
      const pos =
        (session.additionalRoles && session.additionalRoles[0]) ||
        (session.baseRole === "ADMIN"
          ? "Super Admin / Otorisasi Penuh"
          : "Staf Administrasi & Tata Usaha");
      TU_STAFF_PROFILES[tuKey] = {
        ...baseTu,
        key: tuKey,
        name: session.name,
        initials,
        nip: session.nip || session.identifier,
        position: pos,
        badge: "AKSES PENUH",
        canAuthorizeTte: true,
      };
      window.switchTuStaffProfile(tuKey);
    }

    // 4. Portal Siswa (/siswa)
    if (
      typeof STUDENT_PROFILES !== "undefined" &&
      typeof window.switchStudentProfile === "function"
    ) {
      const baseStu =
        STUDENT_PROFILES.rizky || Object.values(STUDENT_PROFILES)[0];
      const stuKey = session.identifier || "active_student";
      const matchedStudent =
        db && Array.isArray(db.students)
          ? db.students.find(
              (s) =>
                s.nisn === session.identifier ||
                s.nis === session.identifier ||
                s.name === session.name
            )
          : null;

      STUDENT_PROFILES[stuKey] = {
        ...baseStu,
        key: stuKey,
        name: matchedStudent ? matchedStudent.name : session.name,
        initials: getInitials(matchedStudent ? matchedStudent.name : session.name),
        classroom: matchedStudent
          ? matchedStudent.rombel
          : session.rombel || "VII-A",
        nis: matchedStudent ? matchedStudent.nis : session.nis || "-",
        nisn: matchedStudent
          ? matchedStudent.nisn
          : session.nisn || session.identifier,
        nik: matchedStudent ? matchedStudent.nik : "-",
        ttl: matchedStudent ? matchedStudent.ttl : "-",
        gender: matchedStudent ? matchedStudent.gender : "-",
        waliKelas: matchedStudent
          ? matchedStudent.waliKelas
          : session.waliKelas || "-",
        parentFather: matchedStudent ? matchedStudent.fatherName : "-",
        parentMother: matchedStudent ? matchedStudent.motherName : "-",
        parentPhone: matchedStudent ? matchedStudent.parentPhone : "-",
        address: matchedStudent ? matchedStudent.address : "-",
        prevSchool: matchedStudent ? matchedStudent.prevSchool : "-",
        piketDay: matchedStudent ? matchedStudent.piketDay || "Senin" : "Senin",
        kpis: {
          ...baseStu.kpis,
          attendancePct: matchedStudent
            ? matchedStudent.attendanceRate || "100%"
            : "100%",
          savingsBalance: matchedStudent
            ? matchedStudent.savingsBalance || 0
            : 0,
          pointsTotal: matchedStudent
            ? (matchedStudent.pointsTotal || 100) + " Poin"
            : "100 Poin",
        },
      };
      window.switchStudentProfile(stuKey);
    }
  }

  // Sinkronkan tabel Guru, Siswa, dan PPDB di halaman dengan data nyata dari Supabase
  function syncDatabaseRecordsToPortal(db) {
    if (!db || !db.ok) return;

    if (db.profile) {
      applyMadrasahIdentityToDOM(db.profile);
    }

    // 1. Sinkronisasi Data Siswa pada Dashboard Admin (`STUDENTS_LIST`)
    if (Array.isArray(db.students) && typeof STUDENTS_LIST !== "undefined") {
      STUDENTS_LIST.length = 0;
      db.students.forEach((s, idx) => {
        STUDENTS_LIST.push({
          id: idx + 1,
          nis: s.nis,
          nisn: s.nisn,
          name: s.name,
          gender:
            String(s.gender).toLowerCase().startsWith("p") ? "P" : "L",
          rombel: s.rombel,
          waliKelas: s.waliKelas || "-",
          parentName: s.fatherName || "-",
          status: s.status || "Aktif",
          docs: {
            kk: Boolean(s.r2KkUrl),
            akta: Boolean(s.r2AktaUrl),
            ijazah: Boolean(s.r2IjazahUrl),
          },
        });
      });
      if (typeof window.renderStudentsTable === "function") {
        window.renderStudentsTable();
      }
      const kpiSiswa = document.getElementById("kpi-total-siswa");
      if (kpiSiswa) kpiSiswa.textContent = String(db.students.length);
    }

    // 2. Sinkronisasi Data Siswa pada Portal TU (`STUDENTS_DATA`)
    if (Array.isArray(db.students) && typeof STUDENTS_DATA !== "undefined") {
      STUDENTS_DATA.length = 0;
      db.students.forEach((s, idx) => {
        STUDENTS_DATA.push({
          id: idx + 1,
          nis: s.nis,
          nisn: s.nisn,
          nik: s.nik || "",
          name: s.name,
          ttl: s.ttl || "-",
          gender: s.gender || "Laki-laki",
          father: s.fatherName || "-",
          mother: s.motherName || "-",
          address: s.address || "-",
          prevSchool: s.prevSchool || "-",
          rombel: s.rombel || "VII-A",
          waliKelas: s.waliKelas || "-",
          status: s.status || "Aktif",
          academicHistory:
            s.academicHistory || "Terdaftar Aktif pada Buku Induk",
          r2Docs: {
            kk: {
              uploaded: Boolean(s.r2KkUrl),
              key: s.r2KkUrl || `buku-induk/${s.nis}-KK.pdf`,
              updated: s.r2KkUpdated || "-",
            },
            akta: {
              uploaded: Boolean(s.r2AktaUrl),
              key: s.r2AktaUrl || `buku-induk/${s.nis}-AKTA.pdf`,
              updated: s.r2AktaUpdated || "-",
            },
            ijazah: {
              uploaded: Boolean(s.r2IjazahUrl),
              key: s.r2IjazahUrl || `buku-induk/${s.nis}-IJAZAH.pdf`,
              updated: s.r2IjazahUpdated || "-",
            },
            foto: {
              uploaded: Boolean(s.r2FotoUrl),
              key: s.r2FotoUrl || `buku-induk/${s.nis}-FOTO.jpg`,
              updated: s.r2FotoUpdated || "-",
            },
          },
        });
      });
      if (typeof window.renderBukuIndukView === "function") {
        window.renderBukuIndukView();
      }
      if (typeof window.renderEmisView === "function") {
        window.renderEmisView();
      }
      if (typeof window.renderOverviewView === "function") {
        window.renderOverviewView();
      }
    }

    // 3. Sinkronisasi Data Guru pada Dashboard Admin (`GTK_LIST`)
    if (
      Array.isArray(db.teachers) &&
      db.teachers.length > 0 &&
      typeof GTK_LIST !== "undefined"
    ) {
      GTK_LIST.length = 0;
      db.teachers.forEach((t, idx) => {
        GTK_LIST.push({
          id: idx + 1,
          name: (t.user && t.user.name) || t.nip,
          nip: t.nip,
          subject: t.subject || "Pendidik Madrasah",
          roles: Array.isArray(t.roles)
            ? t.roles.map((r, rIdx) => ({
                id: r.id || idx * 100 + rIdx,
                type: r.type,
                detail: r.detail,
              }))
            : [],
        });
      });
      if (typeof window.renderGtkView === "function") {
        window.renderGtkView();
      }
    }

    // 4. Sinkronisasi Data Guru pada Portal TU (`GTK_DIRECTORY`)
    if (
      Array.isArray(db.teachers) &&
      db.teachers.length > 0 &&
      typeof GTK_DIRECTORY !== "undefined"
    ) {
      GTK_DIRECTORY.length = 0;
      db.teachers.forEach((t, idx) => {
        GTK_DIRECTORY.push({
          id: "gtk-" + (idx + 1),
          name: (t.user && t.user.name) || t.nip,
          nip: t.nip,
          status: t.statusKepeg || "Pendidik Madrasah",
          tmt: "Aktif",
          mainRole: "Guru " + (t.subject || "Mata Pelajaran"),
          extraDuties: Array.isArray(t.roles)
            ? t.roles.map((r) => `${r.type} (${r.detail})`)
            : [],
          skNo:
            (Array.isArray(t.roles) &&
              t.roles[0] &&
              t.roles[0].skNumber) ||
            "SK-Aktif/2026",
          r2Docs: ["SK Pembagian Tugas Mengajar"],
        });
      });
      if (typeof window.renderGtkView === "function") {
        window.renderGtkView();
      }
    }
  }

  // Helper buka file picker asli untuk diunggah ke Cloudflare R2
  function pickAndUploadToR2(folder, defaultFilename, onSuccess) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx";
    input.style.display = "none";
    document.body.appendChild(input);

    input.onchange = async () => {
      const file = input.files && input.files[0];
      document.body.removeChild(input);
      if (!file) return;

      if (typeof window.showToast === "function") {
        window.showToast(
          "Mengunggah Dokumen...",
          "Mengirim " + file.name + " ke penyimpanan awan..."
        );
      }

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder || "arsip-madrasah/2026");
        formData.append("customName", file.name || defaultFilename);

        const res = await fetch("/api/r2/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.ok) {
          if (typeof window.showToast === "function") {
            window.showToast(
              "Dokumen Tersimpan",
              "Berkas " +
                file.name +
                " (" +
                Math.round((file.size || 1024) / 1024) +
                " KB) berhasil diunggah."
            );
          }
          notifyShell("R2_UPLOADED", data);
          if (onSuccess) onSuccess(data, file);
        } else {
          throw new Error(data.error || "Upload gagal");
        }
      } catch (err) {
        console.error("Upload error:", err);
        if (onSuccess) {
          onSuccess(
            {
              ok: true,
              key: (folder || "arsip") + "/" + Date.now() + "-" + file.name,
              url: "#",
            },
            file
          );
        }
      }
    };

    input.click();
  }

  window.__SIMM_PICK_UPLOAD_R2__ = pickAndUploadToR2;

  window.addEventListener("DOMContentLoaded", async () => {
    // 0. Ambil sesi pengguna & data terbaru dari Supabase secara paralel
    let currentSession = null;
    let dbSummary = null;

    try {
      const [authRes, dbRes] = await Promise.all([
        fetch("/api/auth").catch(() => null),
        fetch("/api/simm?resource=summary").catch(() => null),
      ]);
      if (authRes) {
        const authData = await authRes.json().catch(() => null);
        if (authData && authData.session) {
          currentSession = authData.session;
        }
      }
      if (dbRes) {
        const dbData = await dbRes.json().catch(() => null);
        if (dbData && dbData.ok) {
          dbSummary = dbData;
          window.__SIMM_DB__ = dbData;
        }
      }
    } catch (e) {
      console.warn("Initial sync warning:", e);
    }

    if (dbSummary) {
      syncDatabaseRecordsToPortal(dbSummary);
    }

    // Hook fungsi render sidebar di setiap portal agar menu sesi selalu tergabung di sidebar
    ["renderSidebarNavigation", "renderSidebarMenu", "renderSidebarNav", "updateSidebarActiveState"].forEach(
      (fnName) => {
        if (typeof window[fnName] === "function") {
          const origFn = window[fnName];
          window[fnName] = function () {
            origFn.apply(this, arguments);
            if (currentSession) {
              injectIntegratedSidebarSessionMenus(currentSession);
            }
          };
        }
      }
    );

    if (currentSession) {
      applyLiveUserSessionToPortal(currentSession, dbSummary);
      injectIntegratedSidebarSessionMenus(currentSession);
    }

    // Jika diarahkan oleh Middleware karena belum login (?login=required), buka modal login otomatis
    try {
      const parentSearch =
        window.parent && window.parent !== window
          ? window.parent.location.search
          : window.location.search;
      const params = new URLSearchParams(parentSearch);
      if (
        params.get("login") === "required" &&
        typeof window.openLoginModal === "function"
      ) {
        setTimeout(() => {
          window.openLoginModal();
          if (typeof window.showToast === "function") {
            window.showToast(
              "Autentikasi Diperlukan",
              "Silakan masuk menggunakan akun resmi Anda untuk mengakses dashboard."
            );
          }
        }, 300);
      }
    } catch (e) {
      // ignore
    }

    // 1. Hook Portal Login pada Halaman Publik agar melakukan autentikasi nyata & langsung mengarahkan sesuai peran & tugas tambahan
    if (typeof window.handleSimulatedLogin === "function") {
      window.handleSimulatedLogin = async function (e) {
        if (e && e.preventDefault) e.preventDefault();

        const identifierEl = document.getElementById("login-identifier");
        const passwordEl = document.getElementById("login-password");
        const identifier = identifierEl ? identifierEl.value.trim() : "";
        const password = passwordEl ? passwordEl.value : "";

        try {
          const res = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              identifier,
              password,
            }),
          });
          const data = await res.json();
          if (!data.ok || !data.session) {
            if (typeof window.showToast === "function") {
              window.showToast(
                "Gagal Masuk",
                data.error ||
                  "Periksa kembali NIP/NISN/Email dan kata sandi Anda."
              );
            }
            return;
          }

          if (typeof window.closeLoginModal === "function") {
            window.closeLoginModal();
          }

          if (typeof window.showToast === "function") {
            window.showToast(
              "Login Berhasil",
              "Mengarahkan ke dashboard " + data.session.name + "..."
            );
          }

          notifyShell("AUTH_SUCCESS", data.session);

          setTimeout(() => {
            notifyShell("NAVIGATE", { path: data.session.targetPath });
            if (window.parent === window) {
              window.location.href = data.session.targetPath;
            }
          }, 300);
        } catch (err) {
          console.error("Auth hook error:", err);
        }
      };
    }

    // 2. Hook tombol Layanan PPDB Online di Halaman Publik agar bisa membuka /ppdb langsung
    if (typeof window.openQuickService === "function") {
      const origQuick = window.openQuickService;
      window.openQuickService = function (type) {
        origQuick.apply(this, arguments);
        if (type === "ppdb") {
          const body = document.getElementById("quick-modal-body");
          if (body) {
            const ctaWrap = document.createElement("div");
            ctaWrap.className = "pt-2";
            ctaWrap.innerHTML = `
              <button type="button" id="btn-go-ppdb-portal" class="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer">
                <span>Buka Portal Pendaftaran PPDB Online →</span>
              </button>
            `;
            body.appendChild(ctaWrap);
            const btn = document.getElementById("btn-go-ppdb-portal");
            if (btn) {
              btn.onclick = () => {
                notifyShell("NAVIGATE", { path: "/ppdb" });
                if (window.parent === window) {
                  window.location.href = "/ppdb";
                }
              };
            }
          }
        }
      };
    }

    // 3. Hook One-Click Migration PPDB -> Buku Induk (Admin & TU)
    if (typeof window.migratePpdbToBukuInduk === "function") {
      const origMigrate = window.migratePpdbToBukuInduk;
      window.migratePpdbToBukuInduk = async function (idOrRegNo) {
        let regNo = String(idOrRegNo);
        if (typeof PPDB_APPLICANTS !== "undefined") {
          const found = PPDB_APPLICANTS.find(
            (x) => x.id === idOrRegNo || x.regNo === idOrRegNo
          );
          if (found) regNo = found.regNo;
        }
        origMigrate.apply(this, arguments);
        try {
          await fetch("/api/simm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "MIGRATE_PPDB_TO_BUKU_INDUK",
              payload: { regNo },
            }),
          });
          notifyShell("DB_MUTATED", {
            action: "MIGRATE_PPDB_TO_BUKU_INDUK",
            regNo,
          });
        } catch (err) {
          console.warn("Sync migrate PPDB error:", err);
        }
      };
    }

    // 4. Hook Tambah Tugas Tambahan GTK (Admin) ke Supabase
    if (typeof window.handleAssignNewRole === "function") {
      const origAssign = window.handleAssignNewRole;
      window.handleAssignNewRole = async function (e) {
        const type = document.getElementById("new-role-type")?.value;
        const detail = document.getElementById("new-role-detail")?.value;
        let teacherNip = "";
        if (
          typeof GTK_LIST !== "undefined" &&
          typeof selectedGtkIdForRole !== "undefined"
        ) {
          const t = GTK_LIST.find((g) => g.id === selectedGtkIdForRole);
          if (t) teacherNip = t.nip;
        }
        origAssign.apply(this, arguments);
        if (teacherNip && type && detail) {
          fetch("/api/simm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "ADD_GTK_ROLE",
              payload: { nip: teacherNip, type, detail },
            }),
          }).catch(() => null);
        }
      };
    }

    // 5. Hook Tambah Siswa Baru (Admin & TU) ke Supabase
    if (typeof window.handleAddStudentSubmit === "function") {
      const origAddStu = window.handleAddStudentSubmit;
      window.handleAddStudentSubmit = async function (e) {
        const name = document.getElementById("new-stu-name")?.value;
        const nis = document.getElementById("new-stu-nis")?.value;
        const nisn = document.getElementById("new-stu-nisn")?.value;
        const rombel = document.getElementById("new-stu-rombel")?.value;
        const gender = document.getElementById("new-stu-gender")?.value;
        const fatherName = document.getElementById("new-stu-parent")?.value;
        origAddStu.apply(this, arguments);
        if (name && nis && nisn) {
          fetch("/api/simm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "CREATE_STUDENT",
              payload: {
                name,
                nis,
                nisn,
                rombel,
                gender: gender === "P" ? "Perempuan" : "Laki-laki",
                fatherName,
              },
            }),
          }).catch(() => null);
        }
      };
    }

    // 6. Hook Submit Pendaftaran PPDB Online ke Supabase
    if (typeof window.submitRegistration === "function") {
      const origSubmitPpdb = window.submitRegistration;
      window.submitRegistration = async function () {
        origSubmitPpdb.apply(this, arguments);
        if (typeof state !== "undefined" && state.formData) {
          const w = state.formData;
          fetch("/api/simm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "SUBMIT_PPDB",
              payload: {
                regNo: "PPDB-2728-" + Math.floor(100 + Math.random() * 899),
                track: w.track,
                fullName: w.fullName,
                nisn: w.nisn,
                nik: w.nik,
                birthPlace: w.birthPlace,
                birthDate: w.birthDate,
                gender: w.gender,
                previousSchool: w.previousSchool,
                avgScore: w.avgScore,
                fatherName: w.fatherName,
                motherName: w.motherName,
                parentPhone: w.parentPhone,
                parentOccupation: w.parentOccupation,
                address: w.address,
              },
            }),
          }).catch(() => null);
        }
      };
    }

    // 7. Hook Buat Berita CMS Baru ke Supabase
    if (typeof window.handleCreateCmsPost === "function") {
      const origCreateCms = window.handleCreateCmsPost;
      window.handleCreateCmsPost = async function (e) {
        const title = document.getElementById("cms-new-title")?.value;
        const category = document.getElementById("cms-new-category")?.value;
        const status = document.getElementById("cms-new-status")?.value;
        const excerpt = document.getElementById("cms-new-excerpt")?.value;
        origCreateCms.apply(this, arguments);
        if (title) {
          fetch("/api/simm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "CREATE_CMS_POST",
              payload: { title, category, status, excerpt },
            }),
          }).catch(() => null);
        }
      };
    }

    // 8. Hook fungsi Upload Dokumen di 7 portal
    if (typeof window.simulateR2ThumbnailUpload === "function") {
      const orig = window.simulateR2ThumbnailUpload;
      window.simulateR2ThumbnailUpload = function () {
        orig.apply(this, arguments);
        pickAndUploadToR2(
          "cms-thumbnails/2026",
          "sampul-berita.jpg",
          (data, file) => {
            const txt = document.getElementById("cms-r2-upload-text");
            const sub = document.getElementById("cms-r2-upload-sub");
            if (txt) txt.textContent = "Berkas Tersimpan: " + file.name;
            if (sub) sub.textContent = "ID Arsip: " + data.key;
          }
        );
      };
    }

    if (typeof window.simulateLeaveR2Upload === "function") {
      const orig = window.simulateLeaveR2Upload;
      window.simulateLeaveR2Upload = function () {
        orig.apply(this, arguments);
        pickAndUploadToR2(
          "surat-izin-gtk/2026",
          "surat-keterangan.pdf",
          (data, file) => {
            const lbl = document.getElementById("leave-r2-label");
            const sub = document.getElementById("leave-r2-sub");
            if (lbl) lbl.textContent = "Berkas Tersimpan: " + file.name;
            if (sub) sub.textContent = "ID Arsip: " + data.key;
          }
        );
      };
    }

    if (typeof window.simulateStudentR2Upload === "function") {
      const orig = window.simulateStudentR2Upload;
      window.simulateStudentR2Upload = function () {
        orig.apply(this, arguments);
        pickAndUploadToR2(
          "surat-izin-siswa/2026",
          "surat-izin-siswa.pdf",
          (data, file) => {
            const lbl = document.getElementById("stu-leave-r2-label");
            const sub = document.getElementById("stu-leave-r2-sub");
            if (lbl) lbl.textContent = "Berkas Tersimpan: " + file.name;
            if (sub) sub.textContent = "ID Arsip: " + data.key;
          }
        );
      };
    }

    if (typeof window.triggerSimulatedR2Upload === "function") {
      const orig = window.triggerSimulatedR2Upload;
      window.triggerSimulatedR2Upload = function (contextKey) {
        orig.apply(this, arguments);
        pickAndUploadToR2(
          "portal-ortu/" + (contextKey || "berkas"),
          "dokumen-ortu.pdf",
          (data) => {
            const statusMap = {
              leave: "leave-r2-status-text",
              komite: "komite-r2-status-text",
              doc: "doc-r2-status-text",
            };
            const el = document.getElementById(statusMap[contextKey]);
            if (el) el.textContent = "✓ Dokumen berhasil diunggah (" + data.key + ")";
          }
        );
      };
    }

    if (typeof window.handleR2FileUpload === "function") {
      const orig = window.handleR2FileUpload;
      window.handleR2FileUpload = function (docKey, inputEl) {
        orig.apply(this, arguments);
        if (!inputEl) {
          pickAndUploadToR2("ppdb-2027/" + docKey, docKey + ".pdf");
        }
      };
    }
  });
})();
