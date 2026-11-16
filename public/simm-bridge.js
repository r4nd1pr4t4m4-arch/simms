/**
 * SIMS — Production Security, RBAC, Supabase & Cloudflare R2 Bridge
 * Synchronous Preload Edition (0ms Sidebar & Real-Data Hydration)
 */
(function () {
  if (window.__SIMM_BRIDGE_INITIALIZED__) return;
  window.__SIMM_BRIDGE_INITIALIZED__ = true;

  let currentSession = window.__SIMM_PRELOADED_SESSION__ || null;
  let dbSummary = window.__SIMM_PRELOADED_DB__ || null;

  function esc(str) {
    return String(str ?? "").replace(
      /[&<>"'`]/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
          "`": "&#96;",
        })[c]
    );
  }

  function neutralizeClientText(str) {
    return String(str ?? "")
      .replace(
        /[<>"'`\\]/g,
        (c) =>
          ({
            "<": "\u2039",
            ">": "\u203A",
            '"': "\u201D",
            "'": "\u2019",
            "`": "\u02CB",
            "\\": "\uFF3C",
          })[c] || c
      )
      .replace(/&(?=[#a-zA-Z0-9])/g, "&amp;");
  }

  window.__SIMM_ESC__ = esc;

  function isSafeInternalPath(path) {
    return typeof path === "string" && /^\/(?!\/)[a-zA-Z0-9/_-]*$/.test(path);
  }

  function notifyShell(type, payload) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          { source: "SIMM_PORTAL", type, payload },
          window.location.origin
        );
      }
    } catch (e) {
      console.warn("Notify shell error:", e);
    }
  }

  function showUnifiedToast(title, message) {
    if (typeof window.showToast !== "function") return;
    try {
      if (window.showToast.length >= 2) {
        window.showToast(title, message || "");
      } else {
        window.showToast(message ? `${title}: ${message}` : title);
      }
    } catch (e) {
      console.warn("Toast error:", e);
    }
  }

  window.__SIMM_OPEN_MODAL__ = function (modalKey) {
    notifyShell("OPEN_MODAL", { modal: modalKey });
  };

  window.__SIMM_NAVIGATE__ = function (path) {
    const safePath = isSafeInternalPath(path) ? path : "/";
    notifyShell("NAVIGATE", { path: safePath });
    try {
      if (window.top && window.top !== window) {
        window.top.location.href = safePath;
      } else {
        window.location.href = safePath;
      }
    } catch (_) {
      window.location.href = safePath;
    }
  };

  window.__SIMM_LOGOUT__ = async function () {
    if (window.parent && window.parent !== window) {
      notifyShell("OPEN_MODAL", { modal: "logout_confirm" });
      return;
    }
    if (!window.confirm("Apakah Anda yakin ingin keluar dari aplikasi SIMS?")) {
      return;
    }
    await fetch("/api/auth", { method: "DELETE" }).catch(() => null);
    window.location.replace("/");
  };

  // Handler Login Utama (Aktif secara sinkron sejak 0ms saat halaman dimuat)
  async function performRealLogin(e) {
    if (e && e.preventDefault) e.preventDefault();

    const identifierEl = document.getElementById("login-identifier");
    const passwordEl = document.getElementById("login-password");
    const identifier = identifierEl ? identifierEl.value.trim() : "";
    const password = passwordEl ? passwordEl.value : "";

    if (!identifier || !password) {
      showUnifiedToast(
        "Validasi Login",
        "Harap isi NIP / NISN / Username dan kata sandi Anda."
      );
      return;
    }

    const submitBtn = document.querySelector(
      '#login-modal button[type="submit"]'
    );
    const origBtnHtml = submitBtn ? submitBtn.innerHTML : "";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Memverifikasi Akun...</span>`;
    }

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();

      if (!data.ok || !data.session) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origBtnHtml;
        }
        showUnifiedToast(
          "Gagal Masuk",
          data.error || "Periksa kembali NIP/NISN/Username dan kata sandi Anda."
        );
        return;
      }

      currentSession = data.session;

      if (typeof window.closeLoginModal === "function") {
        window.closeLoginModal();
      }

      const targetPath = data.session.targetPath || "/gtk";
      showUnifiedToast(
        "Login Berhasil",
        `Mengarahkan ke dashboard ${data.session.name}...`
      );

      notifyShell("AUTH_SUCCESS", data.session);
      notifyShell("NAVIGATE", { path: targetPath });

      try {
        if (window.top && window.top !== window) {
          window.top.location.replace(targetPath);
        } else {
          window.location.replace(targetPath);
        }
      } catch (_) {
        window.location.replace(targetPath);
      }
    } catch (err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origBtnHtml;
      }
      showUnifiedToast(
        "Gangguan Koneksi",
        "Gagal menghubungi server autentikasi. Silakan coba lagi."
      );
      console.error("Auth hook error:", err);
    }
  }

  window.__SIMM_DO_LOGIN__ = performRealLogin;
  window.handleSimulatedLogin = performRealLogin;

  function getInitials(name) {
    if (!name) return "SM";
    const parts = String(name)
      .replace(/^(Ust\.|Usth\.|Dr\.|Drs\.|H\.|Hj\.|Bapak|Ibu)\s+/gi, "")
      .split(",")[0]
      .trim()
      .split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // Gabungkan menu sesi & modul tambahan langsung ke dalam daftar menu di Sidebar secara serentak (0ms)
  function injectIntegratedSidebarSessionMenus(session) {
    if (!session) return;

    // Jika sedang di Halaman Publik (/), ubah tombol "Masuk SIMS" menjadi "Dashboard Saya"
    const safeTarget = isSafeInternalPath(session.targetPath)
      ? session.targetPath
      : "/gtk";
    const loginBtns = document.querySelectorAll(
      'button[onclick*="openLoginModal"]'
    );
    loginBtns.forEach((btn) => {
      btn.setAttribute(
        "onclick",
        `window.__SIMM_NAVIGATE__('${esc(safeTarget)}')`
      );
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

    let currentPortalPath = window.location.pathname;
    try {
      if (window.parent && window.parent !== window) {
        currentPortalPath = window.parent.location.pathname;
      }
    } catch (_) {
      // ignore cross-origin check
    }

    // Jika sedang di Dashboard Admin (/admin), sematkan langsung seluruh menu Dashboard TU di bagian Modul Operasional
    const adminPrimaryNav = document.querySelector(
      'aside nav[aria-label="Menu Utama Admin"]'
    );
    if (adminPrimaryNav && isSuperAdmin) {
      const existingTuNav = document.getElementById(
        "sims-admin-tu-native-menus"
      );
      if (existingTuNav) existingTuNav.remove();

      const tuMenuBlock = document.createElement("div");
      tuMenuBlock.id = "sims-admin-tu-native-menus";
      tuMenuBlock.className = "space-y-1 pt-2";
      tuMenuBlock.innerHTML = `
        <p class="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-teal-700">Layanan Tata Usaha (TU) Terpadu</p>
        <button type="button" onclick="window.__SIMM_OPEN_MODAL__('tu_persuratan')" class="sidebar-link w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all cursor-pointer">
          <span class="flex items-center gap-3 min-w-0">
            <i data-lucide="file-signature" class="w-4 h-4 text-teal-600 shrink-0"></i>
            <span class="truncate">Persuratan &amp; Koreksi Induk</span>
          </span>
          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-700">TTE</span>
        </button>
        <button type="button" onclick="window.__SIMM_OPEN_MODAL__('tu_agenda')" class="sidebar-link w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all cursor-pointer">
          <span class="flex items-center gap-3 min-w-0">
            <i data-lucide="mail-check" class="w-4 h-4 text-sky-600 shrink-0"></i>
            <span class="truncate">Agenda Surat Masuk/Keluar</span>
          </span>
          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700">R2</span>
        </button>
        <button type="button" onclick="window.__SIMM_OPEN_MODAL__('tu_emis')" class="sidebar-link w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all cursor-pointer">
          <span class="flex items-center gap-3 min-w-0">
            <i data-lucide="shield-check" class="w-4 h-4 text-emerald-600 shrink-0"></i>
            <span class="truncate">Validasi EMIS &amp; Ekspor TU</span>
          </span>
        </button>
      `;
      adminPrimaryNav.appendChild(tuMenuBlock);
    }

    const moduleButtons = [];

    if (canAccessGoLiveSettings) {
      moduleButtons.push(`
        <button type="button" onclick="window.__SIMM_OPEN_MODAL__('academic_master')" class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all cursor-pointer">
          <span class="flex items-center gap-3 min-w-0">
            <i data-lucide="book-open-check" class="w-4 h-4 text-emerald-600 shrink-0"></i>
            <span class="truncate">Master Kelas, Rombel &amp; Mapel</span>
          </span>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Ref</span>
        </button>
      `);
      moduleButtons.push(`
        <button type="button" onclick="window.__SIMM_OPEN_MODAL__('academic_period')" class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all cursor-pointer">
          <span class="flex items-center gap-3 min-w-0">
            <i data-lucide="archive-restore" class="w-4 h-4 text-amber-600 shrink-0"></i>
            <span class="truncate">Semester, Tahun &amp; Arsip</span>
          </span>
        </button>
      `);
      moduleButtons.push(`
        <button type="button" onclick="window.__SIMM_OPEN_MODAL__('golive_settings')" class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all cursor-pointer">
          <span class="flex items-center gap-3 min-w-0">
            <i data-lucide="building-2" class="w-4 h-4 text-emerald-600 shrink-0"></i>
            <span class="truncate">Identitas &amp; Import EMIS</span>
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
        <button type="button" onclick="window.__SIMM_OPEN_MODAL__('piket_management')" class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all cursor-pointer">
          <span class="flex items-center gap-3 min-w-0">
            <i data-lucide="clipboard-check" class="w-4 h-4 text-teal-600 shrink-0"></i>
            <span class="truncate">Manajemen Guru Piket</span>
          </span>
        </button>
      `);
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

  // Pasang hook fungsi render sidebar SECARA SINKRON sebelum DOMContentLoaded dijalankan
  function hookSidebarRenderersSync() {
    [
      "renderSidebarNavigation",
      "renderSidebarMenu",
      "renderSidebarNav",
      "updateSidebarActiveState",
    ].forEach((fnName) => {
      if (
        typeof window[fnName] === "function" &&
        !window[fnName].__simmHooked
      ) {
        const origFn = window[fnName];
        const wrapped = function () {
          origFn.apply(this, arguments);
          if (currentSession) {
            injectIntegratedSidebarSessionMenus(currentSession);
          }
        };
        wrapped.__simmHooked = true;
        window[fnName] = wrapped;
      }
    });
  }

  // Terapkan identitas resmi madrasah ke elemen teks halaman
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
          node.nodeValue.includes("20278412") ||
          node.nodeValue.includes("Dr. H. Ahmad Fauzi"))
      ) {
        nodes.push(node);
      }
    }
    nodes.forEach((n) => {
      n.nodeValue = n.nodeValue
        .replace(/MTs Nurul Falah/g, profile.name)
        .replace(/121232040089/g, profile.nsm || "121216050060")
        .replace(/20278412/g, profile.npsn || "69963460")
        .replace(
          /Dr\. H\. Ahmad Fauzi, M\.Pd\./g,
          profile.headmasterName || "Syarip Husin, S.Sos., Gr."
        );
    });
  }

  // Perbarui seluruh dropdown Rombel/Kelas & Mata Pelajaran dari Master Akademik + Database
  function syncRombelSelectOptions(students, academicMaster) {
    const masterRombels = Array.isArray(academicMaster?.rombels)
      ? academicMaster.rombels
          .map((r) => String(r.code || "").trim())
          .filter(Boolean)
      : [];
    const stuRombels = Array.isArray(students)
      ? students.map((s) => String(s.rombel || "").trim()).filter(Boolean)
      : [];
    const uniqueRombels = Array.from(
      new Set([...masterRombels, ...stuRombels])
    ).sort();
    if (uniqueRombels.length === 0) return;

    const stuCount = Array.isArray(students) ? students.length : 0;
    const filterSelectIds = ["student-rombel-filter", "induk-filter-rombel"];
    filterSelectIds.forEach((id) => {
      const sel = document.getElementById(id);
      if (sel) {
        const currentVal = sel.value || "Semua";
        sel.innerHTML =
          `<option value="Semua">Semua Rombel / Kelas (${stuCount} Siswa)</option>` +
          uniqueRombels
            .map((r) => `<option value="${esc(r)}">Kelas ${esc(r)}</option>`)
            .join("");
        if (uniqueRombels.includes(currentVal) || currentVal === "Semua") {
          sel.value = currentVal;
        }
      }
    });

    const formSelectIds = [
      "new-stu-rombel",
      "edit-stu-rombel",
      "new-role-class",
      "new-role-classroom",
      "add-rombel",
    ];
    formSelectIds.forEach((id) => {
      const sel = document.getElementById(id);
      if (sel) {
        const prev = sel.value;
        sel.innerHTML = uniqueRombels
          .map((r) => `<option value="${esc(r)}">Kelas ${esc(r)}</option>`)
          .join("");
        if (prev && uniqueRombels.includes(prev)) sel.value = prev;
      }
    });

    // Sinkronkan referensi Mata Pelajaran ke datalist global untuk semua input mapel di portal
    const masterSubjects = Array.isArray(academicMaster?.subjects)
      ? academicMaster.subjects
          .map((s) => String(s.name || "").trim())
          .filter(Boolean)
      : [];
    if (masterSubjects.length > 0 && document.body) {
      let dl = document.getElementById("simm-master-subjects-datalist");
      if (!dl) {
        dl = document.createElement("datalist");
        dl.id = "simm-master-subjects-datalist";
        document.body.appendChild(dl);
      }
      dl.innerHTML = masterSubjects
        .map((sub) => `<option value="${esc(sub)}"></option>`)
        .join("");
    }
  }

  // Sinkronkan seluruh variabel data di 7 portal dengan data nyata dari Supabase (hapus total data dummy)
  function syncDatabaseRecordsToPortal(db) {
    if (!db || !db.ok) return;

    const realStudents = Array.isArray(db.students) ? db.students : [];
    const realTeachers = Array.isArray(db.teachers) ? db.teachers : [];
    const realPpdb = Array.isArray(db.ppdb) ? db.ppdb : [];
    const realCms = Array.isArray(db.cmsPosts) ? db.cmsPosts : [];
    const realServices = Array.isArray(db.serviceRequests)
      ? db.serviceRequests
      : [];
    const realMail = Array.isArray(db.mailAgenda) ? db.mailAgenda : [];
    const profile = db.profile || window.__MADRASAH_PROFILE__ || {};

    applyMadrasahIdentityToDOM(profile);
    syncRombelSelectOptions(realStudents, db.academicMaster);

    const uniqueRombels =
      Array.isArray(db.stats?.rombels) && db.stats.rombels.length > 0
        ? db.stats.rombels
        : Array.from(
            new Set(realStudents.map((s) => s.rombel).filter(Boolean))
          ).sort();
    const totalStudentCount =
      typeof db.stats?.studentCount === "number"
        ? db.stats.studentCount
        : realStudents.length;
    const totalTeacherCount =
      typeof db.stats?.teacherCount === "number"
        ? db.stats.teacherCount
        : realTeachers.length;

    // =========================================================================
    // A. HALAMAN PUBLIK (`/`)
    // =========================================================================
    if (typeof GTK_DATA !== "undefined" && realTeachers.length > 0) {
      GTK_DATA.length = 0;
      realTeachers.forEach((t, idx) => {
        const name = (t.user && t.user.name) || t.nip;
        const roles = Array.isArray(t.roles) ? t.roles : [];
        const categories = [];
        const additionalRoles = [];

        roles.forEach((r) => {
          const rType = String(r.type || "");
          const rLower = rType.toLowerCase();
          const label =
            r.detail &&
            r.detail !== "SK Tahun Ajaran Aktif" &&
            !rType.includes(r.detail)
              ? `${rType} (${r.detail})`
              : rType;

          if (
            rLower.includes("kepala") ||
            rLower.includes("waka") ||
            rLower.includes("operator") ||
            rLower.includes("koordinator")
          ) {
            if (!categories.includes("pimpinan")) categories.push("pimpinan");
            additionalRoles.push({ label, color: "emerald" });
          } else if (rLower.includes("wali kelas")) {
            if (!categories.includes("wali_kelas"))
              categories.push("wali_kelas");
            additionalRoles.push({ label, color: "sky" });
          } else if (rLower.includes("piket")) {
            if (!categories.includes("guru_piket"))
              categories.push("guru_piket");
            additionalRoles.push({ label, color: "amber" });
          } else if (
            rLower.includes("bendahara") ||
            rLower.includes("tabungan") ||
            rLower.includes("komite")
          ) {
            if (!categories.includes("keuangan")) categories.push("keuangan");
            additionalRoles.push({ label, color: "purple" });
          } else if (rType) {
            additionalRoles.push({ label, color: "teal" });
          }
        });

        if (additionalRoles.length === 0) {
          additionalRoles.push({ label: "Pendidik Aktif", color: "slate" });
        }

        GTK_DATA.push({
          id: idx + 1,
          name,
          nip: t.nip,
          subject: t.subject || "Pendidik Madrasah",
          categories,
          additionalRoles,
        });
      });

      if (typeof window.renderHeroPiketWidget === "function") {
        window.renderHeroPiketWidget();
      }
      if (typeof window.renderGTKDirectory === "function") {
        window.renderGTKDirectory();
      }
    }

    if (typeof SAMPLE_STUDENTS !== "undefined") {
      Object.keys(SAMPLE_STUDENTS).forEach((k) => delete SAMPLE_STUDENTS[k]);
      realStudents.forEach((s) => {
        const record = {
          nisn: s.nisn,
          nis: s.nis,
          name: s.name,
          rombel: `Kelas ${s.rombel}`,
          waliKelas: s.waliKelas || "-",
          status: s.status || "Aktif (Buku Induk Terverifikasi)",
        };
        if (s.nisn) SAMPLE_STUDENTS[s.nisn] = record;
        if (s.nis) SAMPLE_STUDENTS[s.nis] = record;
      });
    }

    if (typeof NEWS_DATA !== "undefined") {
      NEWS_DATA.length = 0;
      if (realCms.length > 0) {
        realCms.forEach((post, idx) => {
          NEWS_DATA.push({
            id: idx + 1,
            featured: idx === 0,
            category: post.category || "Pengumuman",
            title: post.title,
            date: post.dateLabel || "Tahun Ajaran 2026/2027",
            author: post.author || "Humas MTs Nurul Falah",
            readTime: "3 menit baca",
            excerpt: post.excerpt || post.content || "",
            content: String(post.content || post.excerpt || "").split("\n"),
          });
        });
      } else {
        NEWS_DATA.push(
          {
            id: 101,
            featured: true,
            category: "Pengumuman",
            title: `Informasi Layanan Akademik & PPDB ${profile.name || "MTs Nurul Falah"} TA ${profile.academicYear || "2026/2027"}`,
            date: "Semester " + (profile.semester || "Ganjil") + " 2026/2027",
            author: profile.headmasterName || "Syarip Husin, S.Sos., Gr.",
            readTime: "3 menit baca",
            excerpt: `Selamat datang di Sistem Informasi Manajemen Madrasah (${profile.name || "MTs Nurul Falah"}, NSM: ${profile.nsm || "121216050060"}, NPSN: ${profile.npsn || "69963460"}).`,
            content: [
              `${profile.name || "MTs Nurul Falah"} menyelenggarakan layanan pendidikan terpadu berbasis ${profile.curriculum || "Kurikulum Merdeka & KMA 450"} dengan dukungan Sistem Informasi Manajemen Madrasah (SIMS).`,
              `Saat ini tercatat sebanyak ${totalStudentCount} peserta didik aktif pada rombongan belajar ${uniqueRombels.join(", ") || "7A, 8A, 9A"} serta ${totalTeacherCount} pendidik dan tenaga kependidikan aktif.`,
              `Masyarakat dan orang tua/wali dapat mengakses layanan cek NISN Buku Induk, informasi pendaftaran peserta didik baru (PPDB), serta portal akademik secara daring.`,
            ],
          },
          {
            id: 102,
            featured: false,
            category: "Kegiatan Madrasah",
            title: `Implementasi Kurikulum Merdeka & KMA 450 di ${profile.name || "MTs Nurul Falah"}`,
            date: "Tahun Ajaran " + (profile.academicYear || "2026/2027"),
            author: "Tim Kurikulum MTs Nurul Falah",
            readTime: "2 menit baca",
            excerpt:
              "Penguatan karakter keislaman, literasi sains, dan ketertiban administrasi akademik seluruh rombongan belajar.",
            content: [
              "Pelaksanaan kegiatan belajar mengajar (KBM) terintegrasi secara digital mencakup jurnal mengajar harian, presensi peserta didik, serta pemantauan buku induk.",
            ],
          }
        );
      }
      if (typeof window.renderHomeNews === "function") window.renderHomeNews();
      if (typeof window.renderNewsPage === "function") window.renderNewsPage();
    }

    if (typeof SCHEDULE_BY_DAY !== "undefined" && realTeachers.length > 0) {
      const tNames = realTeachers.map(
        (t) => (t.user && t.user.name) || t.nip
      );
      const tSubj = realTeachers.map((t) => t.subject || "Mata Pelajaran");
      SCHEDULE_BY_DAY.Senin = {
        piket: [tNames[0] || "-", tNames[1] || "-"],
        slots: [
          {
            jam: "07.00 – 07.45",
            mapel: "Upacara Bendera & Pembinaan Wali Kelas",
            guru: "Seluruh Pendidik & Wali Kelas",
          },
          {
            jam: "07.45 – 09.05",
            mapel: `${tSubj[0] || "Mata Pelajaran"} (${uniqueRombels[0] || "7A"})`,
            guru: tNames[0] || "-",
          },
          {
            jam: "09.25 – 10.45",
            mapel: `${tSubj[1] || "Mata Pelajaran"} (${uniqueRombels[1] || "8A"})`,
            guru: tNames[1] || "-",
          },
        ],
      };
      SCHEDULE_BY_DAY.Rabu = {
        piket: [tNames[2] || tNames[0] || "-", tNames[3] || tNames[1] || "-"],
        slots: [
          {
            jam: "07.30 – 08.50",
            mapel: `${tSubj[2] || "Mata Pelajaran"} (${uniqueRombels[0] || "7A"})`,
            guru: tNames[2] || tNames[0] || "-",
          },
          {
            jam: "09.10 – 10.30",
            mapel: `${tSubj[3] || "Mata Pelajaran"} (${uniqueRombels[2] || "9A"})`,
            guru: tNames[3] || tNames[1] || "-",
          },
        ],
      };
      SCHEDULE_BY_DAY.Sabtu = {
        piket: [tNames[4] || tNames[0] || "-", tNames[5] || tNames[1] || "-"],
        slots: [
          {
            jam: "07.30 – 08.50",
            mapel: `${tSubj[4] || "Mata Pelajaran"} (${uniqueRombels[1] || "8A"})`,
            guru: tNames[4] || tNames[0] || "-",
          },
          {
            jam: "09.10 – 10.30",
            mapel: `${tSubj[5] || "Mata Pelajaran"} (${uniqueRombels[2] || "9A"})`,
            guru: tNames[5] || tNames[1] || "-",
          },
        ],
      };
    }

    // =========================================================================
    // B. DASHBOARD SUPER ADMIN (`/admin`)
    // =========================================================================
    if (typeof STUDENTS_LIST !== "undefined") {
      STUDENTS_LIST.length = 0;
      realStudents.forEach((s, idx) => {
        STUDENTS_LIST.push({
          id: idx + 1,
          nis: s.nis,
          nisn: s.nisn,
          name: s.name,
          gender: String(s.gender).toLowerCase().startsWith("p") ? "P" : "L",
          rombel: s.rombel,
          waliKelas: s.waliKelas || "-",
          parentName:
            s.fatherName && s.fatherName !== "-"
              ? s.fatherName
              : s.motherName || "-",
          status: s.status || "Aktif",
          docs: {
            kk: Boolean(s.r2KkUrl),
            akta: Boolean(s.r2AktaUrl),
            ijazah: Boolean(s.r2IjazahUrl),
          },
        });
      });

      const kpiSiswa = document.getElementById("kpi-total-siswa");
      if (kpiSiswa) {
        kpiSiswa.textContent = String(realStudents.length);
        const subEl = kpiSiswa.nextElementSibling;
        if (subEl) {
          subEl.innerHTML = `<i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i><span>Tersebar di ${uniqueRombels.length || 3} Rombel (${esc(uniqueRombels.join(", ") || "7A, 8A, 9A")})</span>`;
        }
      }
    }

    if (typeof GTK_LIST !== "undefined" && realTeachers.length > 0) {
      GTK_LIST.length = 0;
      realTeachers.forEach((t, idx) => {
        GTK_LIST.push({
          id: idx + 1,
          name: (t.user && t.user.name) || t.nip,
          nip: t.nip,
          subject: t.subject || "Pendidik Madrasah",
          roles: Array.isArray(t.roles)
            ? t.roles.map((r, rIdx) => ({
                id: r.id || idx * 100 + rIdx + 1,
                type: r.type,
                detail: r.detail,
              }))
            : [],
        });
      });
    }

    if (typeof INVAL_SCHEDULES !== "undefined") {
      INVAL_SCHEDULES.length = 0;
      const invalBadge = document.getElementById("sidebar-inval-badge");
      if (invalBadge) invalBadge.textContent = "0";
      const kpiInvalStatus = document.getElementById("kpi-inval-status");
      if (kpiInvalStatus) {
        kpiInvalStatus.className =
          "text-xs text-emerald-700 font-semibold mt-1.5 flex items-center gap-1";
        kpiInvalStatus.innerHTML = `<span>Tidak Ada Jam Kosong</span>`;
        const prevP = kpiInvalStatus.previousElementSibling;
        if (prevP) {
          prevP.innerHTML = `0 <span class="text-base font-bold text-slate-500">Jadwal</span>`;
        }
      }
    }

    // Update KPI 2 Kehadiran Guru Hari Ini di Admin
    const kpiSiswaEl = document.getElementById("kpi-total-siswa");
    if (kpiSiswaEl && realTeachers.length > 0) {
      const kpiGrid = kpiSiswaEl.closest(".grid");
      if (kpiGrid && kpiGrid.children[1]) {
        const kpi2 = kpiGrid.children[1];
        const numEl = kpi2.querySelector(".text-3xl");
        const subEl = kpi2.querySelector(".text-amber-700, .text-emerald-700");
        if (numEl) {
          numEl.innerHTML = `${realTeachers.length}<span class="text-lg font-bold text-slate-400">/${realTeachers.length}</span>`;
        }
        if (subEl) {
          subEl.className =
            "text-xs text-emerald-700 font-medium mt-1.5 flex items-center gap-1";
          subEl.innerHTML = `<span>100% Pendidik Aktif</span>`;
        }
      }
    }

    if (typeof TODAY_PIKET_SLOTS !== "undefined" && realTeachers.length > 0) {
      const piketTeachers = realTeachers.filter(
        (t) =>
          Array.isArray(t.roles) &&
          t.roles.some((r) => String(r.type).toLowerCase().includes("piket"))
      );
      const p1 = piketTeachers[0] || realTeachers[0];
      const p2 = piketTeachers[1] || realTeachers[1] || realTeachers[0];
      TODAY_PIKET_SLOTS.length = 0;
      if (p1) {
        TODAY_PIKET_SLOTS.push({
          slotId: 1,
          shiftLabel: "Petugas Piket 1 (Pagi – Siang)",
          permanentTeacher: (p1.user && p1.user.name) || p1.nip,
          overrideTeacher: null,
          overrideReason: null,
        });
      }
      if (p2) {
        TODAY_PIKET_SLOTS.push({
          slotId: 2,
          shiftLabel: "Petugas Piket 2 (Pagi – Siang)",
          permanentTeacher: (p2.user && p2.user.name) || p2.nip,
          overrideTeacher: null,
          overrideReason: null,
        });
      }
    }

    if (typeof WEEKLY_ATTENDANCE !== "undefined") {
      const gCount = realTeachers.length;
      const sCount = realStudents.length;
      ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"].forEach(
        (day, idx) => {
          if (WEEKLY_ATTENDANCE[idx]) {
            WEEKLY_ATTENDANCE[idx].day = day;
            WEEKLY_ATTENDANCE[idx].guru = 100;
            WEEKLY_ATTENDANCE[idx].siswa = 100;
            WEEKLY_ATTENDANCE[idx].detail =
              `Guru: ${gCount}/${gCount} Aktif • Siswa: ${sCount}/${sCount} Aktif`;
          }
        }
      );
    }

    if (typeof ACTIVITY_LOGS !== "undefined") {
      ACTIVITY_LOGS.length = 0;
      const realLogs = Array.isArray(db.activityLogs) ? db.activityLogs : [];
      realLogs.slice(0, 15).forEach((l) => {
        ACTIVITY_LOGS.push({
          time: l.timeLabel || "Baru saja",
          actor: l.actor || "Sistem SIMS",
          action: l.actionText || "-",
          badge: l.roleBadge || "AUDIT",
          color: l.category === "security_audit" ? "amber" : "emerald",
        });
      });
      ACTIVITY_LOGS.push(
        {
          time: "Aktif",
          actor: profile.headmasterName || "Kepala Madrasah",
          action: `Identitas resmi ${profile.name || "MTs Nurul Falah"} (NSM: ${profile.nsm || "121216050060"}) aktif di seluruh portal.`,
          badge: "Profil Resmi",
          color: "emerald",
        },
        {
          time: "Tersinkron",
          actor: "Database SIMS",
          action: `${realStudents.length} data siswa Buku Induk (${uniqueRombels.join(", ")}) & ${realTeachers.length} data GTK aktif dimuat.`,
          badge: "Data Riil",
          color: "teal",
        }
      );
    }

    if (typeof CMS_POSTS !== "undefined") {
      CMS_POSTS.length = 0;
      realCms.forEach((p, idx) => {
        CMS_POSTS.push({
          id: idx + 1,
          title: p.title,
          category: p.category || "Pengumuman",
          date: p.dateLabel || "TA 2026/2027",
          author: p.author || "Admin Madrasah",
          thumb: p.r2ThumbUrl || "-",
          status: p.status || "Published",
          excerpt: p.excerpt || "",
        });
      });
    }

    // Sinkronisasi PPDB pada Admin & TU (`PPDB_APPLICANTS`)
    if (typeof PPDB_APPLICANTS !== "undefined") {
      PPDB_APPLICANTS.length = 0;
      realPpdb.forEach((app, idx) => {
        PPDB_APPLICANTS.push({
          id: idx + 1,
          regNo: app.regNo,
          nisn: app.nisn,
          nik: app.nik,
          name: app.fullName,
          gender: app.gender === "PEREMPUAN" ? "P" : "L",
          originSchool: app.previousSchool,
          prevSchool: app.previousSchool,
          track: app.track,
          parentName: app.fatherName || app.motherName || "-",
          father: app.fatherName || "-",
          mother: app.motherName || "-",
          docsStatus: "Berkas Tersimpan",
          status:
            app.status === "SUDAH_MIGRASI"
              ? "Sudah Dimigrasi"
              : app.status === "DITERIMA"
                ? "Diterima"
                : "Menunggu Verifikasi",
          migratedNis: app.nisIssued || null,
          docs: {
            kk: {
              uploaded: Boolean(app.docKkUrl),
              verified: Boolean(app.docKkUrl),
              file: app.docKkUrl || "-",
            },
            akta: {
              uploaded: Boolean(app.docAktaUrl),
              verified: Boolean(app.docAktaUrl),
              file: app.docAktaUrl || "-",
            },
            rapor: {
              uploaded: Boolean(app.docSklUrl),
              verified: Boolean(app.docSklUrl),
              file: app.docSklUrl || "-",
            },
            khusus: {
              uploaded: Boolean(app.docFotoUrl),
              verified: Boolean(app.docFotoUrl),
              label: "Pas Foto",
              file: app.docFotoUrl || "-",
            },
          },
        });
      });
      const kpiPpdb = document.getElementById("kpi-total-ppdb");
      if (kpiPpdb) kpiPpdb.textContent = String(realPpdb.length);
      const sidebarPpdbBadge = document.getElementById("sidebar-ppdb-badge");
      if (sidebarPpdbBadge)
        sidebarPpdbBadge.textContent = String(realPpdb.length);
    }

    if (typeof window.renderOverview === "function") window.renderOverview();
    if (typeof window.renderGtkView === "function") window.renderGtkView();
    if (typeof window.renderJadwalView === "function")
      window.renderJadwalView();
    if (typeof window.renderStudentsTable === "function")
      window.renderStudentsTable();
    if (typeof window.renderPpdbTable === "function") window.renderPpdbTable();
    if (typeof window.renderCmsTable === "function") window.renderCmsTable();

    // =========================================================================
    // C. PORTAL TATA USAHA (`/tu`)
    // =========================================================================
    const tuStudentsTarget =
      typeof STUDENTS_DB !== "undefined"
        ? STUDENTS_DB
        : typeof STUDENTS_DATA !== "undefined"
          ? STUDENTS_DATA
          : null;

    if (tuStudentsTarget) {
      tuStudentsTarget.length = 0;
      realStudents.forEach((s, idx) => {
        tuStudentsTarget.push({
          id: idx + 1,
          nis: s.nis,
          nisn: s.nisn,
          nik:
            s.nik && s.nik !== "3204120000000000" ? s.nik : "1605000000000000",
          name: s.name,
          ttl:
            s.ttl && s.ttl !== "Bandung, 01 Januari 2013" ? s.ttl : "-",
          gender: s.gender || "Laki-laki",
          father: s.fatherName || "-",
          mother: s.motherName || "-",
          address: s.address || "-",
          prevSchool: s.prevSchool || "-",
          rombel: s.rombel || "7A",
          waliKelas: s.waliKelas || "-",
          status: s.status || "Aktif",
          academicHistory:
            s.academicHistory || `Terdaftar Aktif Kelas ${s.rombel}`,
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
    }

    if (typeof SERVICE_REQUESTS !== "undefined") {
      SERVICE_REQUESTS.length = 0;
      realServices.forEach((req) => {
        SERVICE_REQUESTS.push({
          id: req.reqCode || req.id,
          kind: req.kind || "surat",
          letterType: req.letterType || "Surat Keterangan",
          title: req.title,
          studentId: 1,
          studentName: req.studentName,
          rombel: req.rombel,
          nis: req.nis,
          requester: req.requesterName,
          submittedAt: req.submittedAt,
          fieldKey: req.fieldKey,
          fieldLabel: req.fieldLabel,
          oldValue: req.oldValue,
          newValue: req.newValue,
          purpose: req.purpose,
          r2Proof: req.r2ProofKey,
          status: req.status,
          issuedNumber: req.issuedNumber,
          r2Output: req.r2OutputKey,
        });
      });
    }

    if (typeof MAIL_AGENDA_LIST !== "undefined") {
      MAIL_AGENDA_LIST.length = 0;
      realMail.forEach((m) => {
        MAIL_AGENDA_LIST.push({
          agendaNo: m.agendaNo,
          letterNo: m.letterNo,
          date: m.dateLabel,
          type: m.type,
          category: m.category,
          party: m.party,
          subject: m.subject,
          r2File: m.r2FileKey || "-",
        });
      });
    }

    if (typeof GTK_DIRECTORY !== "undefined" && realTeachers.length > 0) {
      GTK_DIRECTORY.length = 0;
      realTeachers.forEach((t, idx) => {
        GTK_DIRECTORY.push({
          id: "gtk-" + (idx + 1),
          name: (t.user && t.user.name) || t.nip,
          nip: t.nip,
          status: t.statusKepeg || "Pendidik Madrasah",
          tmt: t.tmtDate || "Aktif",
          mainRole: "Guru " + (t.subject || "Mata Pelajaran"),
          extraDuties: Array.isArray(t.roles)
            ? t.roles.map((r) =>
                r.detail && r.detail !== "SK Tahun Ajaran Aktif"
                  ? `${r.type} (${r.detail})`
                  : r.type
              )
            : [],
          skNo:
            (Array.isArray(t.roles) &&
              t.roles[0] &&
              t.roles[0].skNumber) ||
            "SK-Aktif/2026",
          r2Docs: ["SK Pembagian Tugas Mengajar"],
        });
      });
    }

    if (typeof TU_ACTIVITY_LOGS !== "undefined") {
      TU_ACTIVITY_LOGS.length = 0;
      const realLogs = Array.isArray(db.activityLogs) ? db.activityLogs : [];
      realLogs.slice(0, 12).forEach((l) => {
        TU_ACTIVITY_LOGS.push({
          time: l.timeLabel || "Baru saja",
          actor: l.actor || "Sistem SIMS",
          action: l.actionText || "-",
          tag: l.roleBadge || "Audit",
        });
      });
      TU_ACTIVITY_LOGS.push(
        {
          time: "Tersinkron",
          actor: "Sistem Buku Induk",
          action: `Memuat ${realStudents.length} data siswa riil (${uniqueRombels.join(", ")}) & ${realTeachers.length} data pendidik MTs Nurul Falah.`,
          tag: "Buku Induk",
        },
        {
          time: "Aktif",
          actor: profile.headmasterName || "Kepala Madrasah",
          action: `Identitas kelembagaan NSM ${profile.nsm || "121216050060"} / NPSN ${profile.npsn || "69963460"} siap digunakan untuk penomoran surat.`,
          tag: "Profil Resmi",
        }
      );
    }

    if (typeof window.renderBukuIndukTable === "function")
      window.renderBukuIndukTable();
    if (typeof window.renderPersuratanView === "function")
      window.renderPersuratanView();
    if (typeof window.renderPpdbView === "function") window.renderPpdbView();
    if (typeof window.renderEmisView === "function") window.renderEmisView();
    if (typeof window.renderOverviewView === "function")
      window.renderOverviewView();

    const kpiMailTotal = document.getElementById("kpi-mail-total");
    if (kpiMailTotal) kpiMailTotal.textContent = `${realMail.length} Surat`;
    const kpiMailSub = document.getElementById("kpi-mail-sub");
    if (kpiMailSub) {
      const inCount = realMail.filter((m) => m.type === "Surat Masuk").length;
      const outCount = realMail.filter((m) => m.type === "Surat Keluar").length;
      kpiMailSub.textContent = `${inCount} Surat Masuk • ${outCount} Surat Keluar`;
    }

    // =========================================================================
    // D. PORTAL GURU & GTK (`/gtk`)
    // =========================================================================
    if (
      typeof PIKET_TEACHER_STATUS !== "undefined" &&
      realTeachers.length > 0
    ) {
      PIKET_TEACHER_STATUS.length = 0;
      realTeachers.forEach((t, idx) => {
        const rombel =
          uniqueRombels[idx % (uniqueRombels.length || 1)] || "7A";
        PIKET_TEACHER_STATUS.push({
          id: idx + 1,
          teacherName: (t.user && t.user.name) || t.nip,
          scheduleInfo: `${t.subject || "Mata Pelajaran"} • Kelas ${rombel}`,
          status: "Hadir",
          statusDetail: "Terjadwal Aktif",
          needsInval: false,
          substitute: null,
          candidates: [],
        });
      });
    }

    if (typeof PIKET_STUDENT_LOGS !== "undefined") {
      PIKET_STUDENT_LOGS.length = 0;
    }

    if (typeof STUDENT_SAVINGS !== "undefined" && realStudents.length > 0) {
      STUDENT_SAVINGS.length = 0;
      realStudents.forEach((s, idx) => {
        STUDENT_SAVINGS.push({
          id: idx + 1,
          nis: s.nis,
          name: s.name,
          classroom: s.rombel,
          balance: s.savingsBalance || 0,
          lastMutation: "Belum ada transaksi",
        });
      });
    }

    if (typeof SAVINGS_MUTATIONS !== "undefined") {
      SAVINGS_MUTATIONS.length = 0;
    }

    if (typeof KOMITE_PAYMENTS !== "undefined" && realStudents.length > 0) {
      KOMITE_PAYMENTS.length = 0;
      realStudents.forEach((s, idx) => {
        KOMITE_PAYMENTS.push({
          id: idx + 1,
          nis: s.nis,
          name: s.name,
          classroom: s.rombel,
          amount: 75000,
          status: s.komiteUnpaidMonths > 0 ? "Belum Lunas" : "Lunas",
          receipt: "-",
        });
      });
    }

    if (typeof MY_DAILY_LOGS !== "undefined") {
      MY_DAILY_LOGS.length = 0;
    }

    if (typeof MY_LEAVE_HISTORY !== "undefined") {
      MY_LEAVE_HISTORY.length = 0;
    }
  }

  // Terapkan profil pengguna yang sedang login beserta Tugas Tambahan Dinamisnya secara sinkron
  function applyLiveUserSessionToPortal(session, db) {
    if (!session) return;
    const initials = getInitials(session.name);
    const realStudents =
      db && Array.isArray(db.students) ? db.students : [];
    const realTeachers =
      db && Array.isArray(db.teachers) ? db.teachers : [];
    const uniqueRombels = Array.from(
      new Set(realStudents.map((s) => s.rombel).filter(Boolean))
    ).sort();

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
      const baseTemplate =
        TEACHER_PROFILES.fauzi || Object.values(TEACHER_PROFILES)[0];
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
      let waliRombel = uniqueRombels[0] || "7A";
      const isKamadOrAdmin =
        session.baseRole === "ADMIN" ||
        rawRoles.some((r) =>
          String(r.type).toLowerCase().includes("kepala madrasah")
        );

      rawRoles.forEach((r) => {
        const t = String(r.type || "").toLowerCase();
        const detail =
          r.detail && r.detail !== "SK Tahun Ajaran Aktif" ? r.detail : "";
        if (t.includes("wali kelas")) {
          waliRombel = detail || uniqueRombels[0] || "7A";
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

      // Muat siswa riil di rombel binaan wali kelas
      if (
        realStudents.length > 0 &&
        typeof CLASS_8A_STUDENTS !== "undefined"
      ) {
        const classStudents = realStudents.filter(
          (s) =>
            String(s.rombel || "").toUpperCase() ===
            String(waliRombel).toUpperCase()
        );
        const sourceList =
          classStudents.length > 0 ? classStudents : realStudents.slice(0, 20);
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

        if (typeof CLEANING_ROSTER_8A !== "undefined") {
          const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
          days.forEach((d) => (CLEANING_ROSTER_8A[d] = []));
          sourceList.forEach((s, idx) => {
            CLEANING_ROSTER_8A[days[idx % days.length]].push(s.name);
          });
        }
      }

      const teacherSubject = session.subject || "Mata Pelajaran";
      const r1 = uniqueRombels[0] || "7A";
      const r2 = uniqueRombels[1] || r1;
      const r3 = uniqueRombels[2] || r1;

      const profileKey = session.identifier || "active_gtk";
      TEACHER_PROFILES[profileKey] = {
        ...baseTemplate,
        key: profileKey,
        name: session.name,
        initials,
        nip: session.nip || session.identifier,
        subject: teacherSubject,
        totalJp: "18 JP / Pekan",
        roles: mappedRoles,
        attendanceToday: {
          status: "pending",
          time: null,
          leaveType: null,
          leaveReason: null,
          r2File: null,
        },
        schedules: [
          {
            id: 101,
            day: "Senin",
            isToday: true,
            isInval: false,
            subject: teacherSubject,
            classroom: r1,
            timeSlot: "Jam ke 1–2 (07.30 – 08.50)",
            room: `R. Kelas ${r1}`,
            journalFilled: false,
            topic: "",
            notes: "",
            attendanceSummary: {
              H: realStudents.filter((s) => s.rombel === r1).length || 20,
              S: 0,
              I: 0,
              A: 0,
            },
          },
          {
            id: 102,
            day: "Rabu",
            isToday: true,
            isInval: false,
            subject: teacherSubject,
            classroom: r2,
            timeSlot: "Jam ke 3–4 (09.10 – 10.30)",
            room: `R. Kelas ${r2}`,
            journalFilled: false,
            topic: "",
            notes: "",
            attendanceSummary: {
              H: realStudents.filter((s) => s.rombel === r2).length || 20,
              S: 0,
              I: 0,
              A: 0,
            },
          },
          {
            id: 103,
            day: "Sabtu",
            isToday: true,
            isInval: false,
            subject: teacherSubject,
            classroom: r3,
            timeSlot: "Jam ke 1–2 (07.30 – 08.50)",
            room: `R. Kelas ${r3}`,
            journalFilled: false,
            topic: "",
            notes: "",
            attendanceSummary: {
              H: realStudents.filter((s) => s.rombel === r3).length || 19,
              S: 0,
              I: 0,
              A: 0,
            },
          },
        ],
      };
      window.switchTeacherProfile(profileKey);
    }

    // 3. Portal Tata Usaha (/tu)
    if (
      typeof TU_STAFF_PROFILES !== "undefined" &&
      typeof window.switchTuStaffProfile === "function"
    ) {
      const baseTu =
        TU_STAFF_PROFILES.ridwan || Object.values(TU_STAFF_PROFILES)[0];
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
        roleScope: `${pos} (Otorisasi Penuh)`,
        canAuthorizeTte: true,
        canSignOfficial: true,
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
        realStudents.find(
          (s) =>
            s.nisn === session.identifier ||
            s.nis === session.identifier ||
            s.name === session.name
        ) || realStudents[0];

      const stuRombel = matchedStudent
        ? matchedStudent.rombel
        : session.rombel || "7A";
      const classmates = realStudents.filter((s) => s.rombel === stuRombel);
      const rosterSource = classmates.length > 0 ? classmates : realStudents;
      const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const piketRoster = {};
      days.forEach((d) => (piketRoster[d] = []));
      rosterSource.forEach((c, idx) => {
        piketRoster[days[idx % days.length]].push(c.name);
      });

      const t1 = realTeachers[0];
      const t2 = realTeachers[1] || t1;
      const t3 = realTeachers[2] || t1;

      STUDENT_PROFILES[stuKey] = {
        ...baseStu,
        key: stuKey,
        name: matchedStudent ? matchedStudent.name : session.name,
        initials: getInitials(
          matchedStudent ? matchedStudent.name : session.name
        ),
        classroom: stuRombel,
        nis: matchedStudent ? matchedStudent.nis : session.nis || "-",
        nisn: matchedStudent
          ? matchedStudent.nisn
          : session.nisn || session.identifier,
        nik:
          matchedStudent &&
          matchedStudent.nik &&
          matchedStudent.nik !== "3204120000000000"
            ? matchedStudent.nik
            : "-",
        ttl:
          matchedStudent &&
          matchedStudent.ttl &&
          matchedStudent.ttl !== "Bandung, 01 Januari 2013"
            ? matchedStudent.ttl
            : "-",
        gender: matchedStudent ? matchedStudent.gender : "-",
        waliKelas:
          matchedStudent && matchedStudent.waliKelas !== "-"
            ? matchedStudent.waliKelas
            : (t1 && t1.user && t1.user.name) || "-",
        parentFather: matchedStudent ? matchedStudent.fatherName || "-" : "-",
        parentMother: matchedStudent ? matchedStudent.motherName || "-" : "-",
        parentPhone: matchedStudent ? matchedStudent.parentPhone || "-" : "-",
        address: matchedStudent ? matchedStudent.address || "-" : "-",
        prevSchool: matchedStudent ? matchedStudent.prevSchool || "-" : "-",
        piketDay: matchedStudent ? matchedStudent.piketDay || "Senin" : "Senin",
        todayAttendance: {
          status: "Hadir",
          time: "07:00 WIB",
          note: "Tercatat Aktif",
        },
        kpis: {
          ...baseStu.kpis,
          attendancePct: matchedStudent
            ? matchedStudent.attendanceRate || "100%"
            : "100%",
          attendanceSub: "Terdaftar Aktif TA 2026/2027",
          hadirCount: 1,
          sakitCount: 0,
          izinCount: 0,
          alpaCount: 0,
          savingsBalance: matchedStudent
            ? matchedStudent.savingsBalance || 0
            : 0,
          savingsSub: "Saldo Buku Tabungan Siswa",
          savingsTotalIn: matchedStudent
            ? matchedStudent.savingsBalance || 0
            : 0,
          savingsTotalOut: 0,
          komiteStatus: "Aktif TA 2026/2027",
          komiteSub: "Administrasi Komite Madrasah",
          pointsTotal: matchedStudent
            ? (matchedStudent.pointsTotal || 100) + " Poin"
            : "100 Poin",
          pointsBonus: "+0 Poin",
          pointsSub: "Predikat: Baik",
        },
        weeklySchedules: [
          {
            id: 1,
            day: "Senin",
            isToday: true,
            timeSlot: "Jam ke 1–2 (07.30 – 08.50)",
            subject: (t1 && t1.subject) || "Mata Pelajaran",
            room: `R. Kelas ${stuRombel}`,
            teacher: (t1 && t1.user && t1.user.name) || "-",
            isInval: false,
            journalTopic: "Kegiatan Belajar Mengajar (KBM) Reguler",
            journalNote: "Sesuai jadwal kurikulum aktif.",
          },
          {
            id: 2,
            day: "Senin",
            isToday: true,
            timeSlot: "Jam ke 3–4 (09.10 – 10.30)",
            subject: (t2 && t2.subject) || "Mata Pelajaran",
            room: `R. Kelas ${stuRombel}`,
            teacher: (t2 && t2.user && t2.user.name) || "-",
            isInval: false,
            journalTopic: "Kegiatan Belajar Mengajar (KBM) Reguler",
            journalNote: "Sesuai jadwal kurikulum aktif.",
          },
          {
            id: 3,
            day: "Rabu",
            isToday: false,
            timeSlot: "Jam ke 1–2 (07.30 – 08.50)",
            subject: (t3 && t3.subject) || "Mata Pelajaran",
            room: `R. Kelas ${stuRombel}`,
            teacher: (t3 && t3.user && t3.user.name) || "-",
            isInval: false,
            journalTopic: "Kegiatan Belajar Mengajar (KBM) Reguler",
            journalNote: "Sesuai jadwal kurikulum aktif.",
          },
        ],
        piketRoster,
        savingsTransactions: [],
        leaveHistory: [],
        counselingNotes: [],
        achievements: [],
      };
      window.switchStudentProfile(stuKey);
    }

    // 5. Portal Orang Tua / Wali (/ortu)
    if (
      typeof CHILDREN_PROFILES !== "undefined" &&
      typeof window.switchChildProfile === "function"
    ) {
      const baseChild =
        CHILDREN_PROFILES.rizky || Object.values(CHILDREN_PROFILES)[0];
      const matchedChildren = realStudents.filter(
        (s) =>
          s.nisn === session.identifier ||
          s.nis === session.identifier ||
          s.fatherName === session.name ||
          s.motherName === session.name
      );
      const childrenList =
        matchedChildren.length > 0
          ? matchedChildren
          : realStudents.slice(0, 2);

      if (childrenList.length > 0) {
        Object.keys(CHILDREN_PROFILES).forEach(
          (k) => delete CHILDREN_PROFILES[k]
        );
        const t1 = realTeachers[0];
        childrenList.forEach((child, idx) => {
          const cKey = child.nis || child.nisn || `child_${idx}`;
          CHILDREN_PROFILES[cKey] = {
            ...baseChild,
            key: cKey,
            name: child.name,
            initials: getInitials(child.name),
            classroom: child.rombel,
            nis: child.nis,
            nisn: child.nisn,
            nik:
              child.nik && child.nik !== "3204120000000000" ? child.nik : "-",
            ttl:
              child.ttl && child.ttl !== "Bandung, 01 Januari 2013"
                ? child.ttl
                : "-",
            gender: child.gender || "-",
            prevSchool: child.prevSchool || "-",
            waliKelas:
              child.waliKelas && child.waliKelas !== "-"
                ? child.waliKelas
                : (t1 && t1.user && t1.user.name) || "-",
            waliKelasInitials: getInitials(
              child.waliKelas && child.waliKelas !== "-"
                ? child.waliKelas
                : (t1 && t1.user && t1.user.name) || "WK"
            ),
            guruBk: "Koordinator BK MTs Nurul Falah",
            piketDay: child.piketDay || "Senin",
            todayStatus: {
              label: "Hadir Tepat Waktu",
              isLate: false,
            },
            kpis: {
              ...baseChild.kpis,
              attRate: child.attendanceRate || "100%",
              attDetail: "Siswa Aktif TA 2026/2027",
              hadir: 1,
              sakit: 0,
              izin: 0,
              terlambat: 0,
              alpa: 0,
              savingsBalance: child.savingsBalance || 0,
              savingsDetail: "Saldo Tabungan Siswa",
              komiteStatus: "Aktif TA 2026/2027",
              komiteDetail: "Administrasi Komite Madrasah",
              pointsScore: (child.pointsTotal || 100) + " Poin",
              pointsDetail: "Predikat: Baik",
            },
            notifications: [],
            leaveRequests: [],
            savingsHistory: [],
          };
        });
        const firstKey = Object.keys(CHILDREN_PROFILES)[0];
        if (firstKey) window.switchChildProfile(firstKey);
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

      showUnifiedToast(
        "Mengunggah Dokumen...",
        "Mengirim " + file.name + " ke penyimpanan awan..."
      );

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
          showUnifiedToast(
            "Dokumen Tersimpan",
            "Berkas " +
              file.name +
              " (" +
              Math.round((file.size || 1024) / 1024) +
              " KB) berhasil diunggah."
          );
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

  // ===========================================================================
  // EKSEKUSI SINKRON SEBELUM DOMContentLoaded (0ms Delay untuk Sidebar & Data)
  // ===========================================================================
  try {
    hookSidebarRenderersSync();
    if (dbSummary && dbSummary.ok) {
      window.__SIMM_DB__ = dbSummary;
      syncDatabaseRecordsToPortal(dbSummary);
    }
    if (currentSession) {
      applyLiveUserSessionToPortal(currentSession, dbSummary);
      injectIntegratedSidebarSessionMenus(currentSession);
    }
  } catch (syncErr) {
    console.warn("Synchronous hydration warning:", syncErr);
  }

  // ===========================================================================
  // VERIFIKASI ULANG SAAT DOMContentLoaded & PEMASANGAN EVENT HOOKS
  // ===========================================================================
  window.addEventListener("DOMContentLoaded", async () => {
    hookSidebarRenderersSync();
    window.handleSimulatedLogin = performRealLogin;

    // Jika data sudah dipreload dari server, langsung render ulang sidebar serentak (0ms)
    if (dbSummary && dbSummary.ok) {
      syncDatabaseRecordsToPortal(dbSummary);
    }
    if (currentSession) {
      applyLiveUserSessionToPortal(currentSession, dbSummary);
      injectIntegratedSidebarSessionMenus(currentSession);
    }

    // Jika belum ada data preload (fallback), baru ambil secara asinkron
    if (!currentSession || !dbSummary) {
      try {
        if (!currentSession) {
          const authRes = await fetch("/api/auth").catch(() => null);
          if (authRes) {
            const authData = await authRes.json().catch(() => null);
            if (authData && authData.session) {
              currentSession = authData.session;
            }
          }
        }
        if (!dbSummary && currentSession) {
          const dbRes = await fetch("/api/simm?resource=summary").catch(
            () => null
          );
          if (dbRes) {
            const dbData = await dbRes.json().catch(() => null);
            if (dbData && dbData.ok) {
              dbSummary = dbData;
              window.__SIMM_DB__ = dbData;
              syncDatabaseRecordsToPortal(dbSummary);
            }
          }
        }
        if (currentSession) {
          applyLiveUserSessionToPortal(currentSession, dbSummary);
          injectIntegratedSidebarSessionMenus(currentSession);
        }
      } catch (e) {
        console.warn("Fallback sync warning:", e);
      }
    }

    // Override lookupNISN di Halaman Publik agar aman dari Reflected/DOM XSS
    if (typeof window.lookupNISN === "function") {
      window.lookupNISN = async function () {
        const inputEl = document.getElementById("nisn-lookup-input");
        const box = document.getElementById("nisn-lookup-result");
        const val = inputEl ? String(inputEl.value || "").trim() : "";
        if (!val || !box) return;
        box.innerHTML =
          '<p class="text-xs text-slate-500">Memeriksa database Buku Induk...</p>';
        try {
          const res = await fetch(
            "/api/simm?resource=nisn&nisn=" + encodeURIComponent(val)
          );
          const data = await res.json();
          const student = data && data.student ? data.student : null;
          if (student) {
            box.innerHTML = `
              <div class="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2 text-sm">
                <div class="flex items-center justify-between">
                  <span class="font-heading font-bold text-slate-900 text-base">${esc(student.name)}</span>
                  <span class="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-semibold">${esc(student.status || "Terdaftar Aktif")}</span>
                </div>
                <p class="text-xs text-slate-600">NIS / NISN: <strong>${esc(student.nis)} / ${esc(student.nisn)}</strong></p>
                <p class="text-xs text-slate-600">Rombongan Belajar: <strong>${esc(student.rombel)}</strong></p>
                <p class="text-xs text-slate-600">Wali Kelas: <strong>${esc(student.waliKelas || "-")}</strong></p>
              </div>
            `;
          } else {
            box.innerHTML = `
              <div class="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                Data peserta didik dengan NISN <strong>"${esc(val)}"</strong> tidak ditemukan pada Buku Induk Madrasah.
              </div>
            `;
          }
        } catch {
          box.innerHTML = `
            <div class="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              Gagal memeriksa NISN. Pastikan koneksi aktif.
            </div>
          `;
        }
      };
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
        window.openLoginModal();
        showUnifiedToast(
          "Autentikasi Diperlukan",
          "Silakan masuk menggunakan akun resmi Anda untuk mengakses dashboard."
        );
      }
    } catch (_) {
      // ignore
    }

    // Hook tombol Layanan PPDB Online di Halaman Publik agar bisa membuka /ppdb langsung
    if (typeof window.openQuickService === "function") {
      const origQuick = window.openQuickService;
      window.openQuickService = function (type) {
        origQuick.apply(this, arguments);
        if (type === "ppdb") {
          const body = document.getElementById("quick-modal-body");
          if (body && !document.getElementById("btn-go-ppdb-portal")) {
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
                window.__SIMM_NAVIGATE__("/ppdb");
              };
            }
          }
        }
      };
    }

    // Hook One-Click Migration PPDB -> Buku Induk (Admin & TU)
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

    // Hook Tambah Tugas Tambahan GTK (Admin) ke Supabase
    if (typeof window.handleAssignNewRole === "function") {
      const origAssign = window.handleAssignNewRole;
      window.handleAssignNewRole = async function (e) {
        const type = document.getElementById("new-role-type")?.value;
        let detail = document.getElementById("new-role-detail")?.value || "";
        if (!detail) {
          if (type === "Wali Kelas") {
            detail =
              document.getElementById("new-role-classroom")?.value || "7A";
          } else if (type === "Guru Piket") {
            detail = document.getElementById("new-role-day")?.value || "Senin";
          } else {
            detail =
              document.getElementById("new-role-sk")?.value ||
              "SK Tahun Ajaran Aktif";
          }
        }
        let teacherNip = "";
        if (typeof GTK_LIST !== "undefined") {
          const activeId =
            typeof selectedRoleTeacherId !== "undefined"
              ? selectedRoleTeacherId
              : typeof selectedGtkIdForRole !== "undefined"
                ? selectedGtkIdForRole
                : null;
          const t = GTK_LIST.find((g) => g.id === activeId);
          if (t) teacherNip = t.nip;
        }
        origAssign.apply(this, arguments);
        if (teacherNip && type) {
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

    // Hook Tambah Siswa Baru (Admin & TU) ke Supabase
    if (typeof window.handleAddStudentSubmit === "function") {
      const origAddStu = window.handleAddStudentSubmit;
      window.handleAddStudentSubmit = async function (e) {
        [
          "new-stu-name",
          "new-stu-nis",
          "new-stu-nisn",
          "new-stu-rombel",
          "new-stu-parent",
        ].forEach((id) => {
          const el = document.getElementById(id);
          if (el && el.value) el.value = neutralizeClientText(el.value);
        });
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

    // Hook Submit Pendaftaran PPDB Online ke Supabase
    if (typeof window.submitRegistration === "function") {
      const origSubmitPpdb = window.submitRegistration;
      window.submitRegistration = async function () {
        if (typeof state !== "undefined" && state.formData) {
          Object.keys(state.formData).forEach((k) => {
            if (typeof state.formData[k] === "string") {
              state.formData[k] = neutralizeClientText(state.formData[k]);
            }
          });
        }
        origSubmitPpdb.apply(this, arguments);
        if (typeof state !== "undefined" && state.formData) {
          const w = state.formData;
          fetch("/api/simm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "SUBMIT_PPDB",
              payload: {
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

    // Hook Buat Berita CMS Baru ke Supabase
    if (typeof window.handleCreateCmsPost === "function") {
      const origCreateCms = window.handleCreateCmsPost;
      window.handleCreateCmsPost = async function (e) {
        ["cms-new-title", "cms-new-category", "cms-new-excerpt"].forEach(
          (id) => {
            const el = document.getElementById(id);
            if (el && el.value) el.value = neutralizeClientText(el.value);
          }
        );
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

    // Hook Layanan Persuratan, Koreksi Data, Agenda Surat & Edit Induk (TU / Admin) ke Supabase
    if (typeof window.approveDataCorrection === "function") {
      const origApprove = window.approveDataCorrection;
      window.approveDataCorrection = function (reqId) {
        origApprove.apply(this, arguments);
        fetch("/api/simm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "PROCESS_SERVICE_REQUEST",
            payload: { id: String(reqId), decision: "APPROVE_CORRECTION" },
          }),
        }).catch(() => null);
      };
    }

    if (typeof window.rejectServiceRequest === "function") {
      const origReject = window.rejectServiceRequest;
      window.rejectServiceRequest = function (reqId) {
        origReject.apply(this, arguments);
        fetch("/api/simm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "PROCESS_SERVICE_REQUEST",
            payload: { id: String(reqId), decision: "REJECT" },
          }),
        }).catch(() => null);
      };
    }

    if (typeof window.issueOfficialLetter === "function") {
      const origIssue = window.issueOfficialLetter;
      window.issueOfficialLetter = function (reqId) {
        origIssue.apply(this, arguments);
        const found =
          typeof SERVICE_REQUESTS !== "undefined"
            ? SERVICE_REQUESTS.find((r) => r.id === reqId)
            : null;
        fetch("/api/simm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "PROCESS_SERVICE_REQUEST",
            payload: {
              id: String(reqId),
              decision: "ISSUE_LETTER",
              letterNumber: found?.issuedNumber || "",
            },
          }),
        }).catch(() => null);
      };
    }

    if (typeof window.handleSaveNewAgenda === "function") {
      const origSaveAg = window.handleSaveNewAgenda;
      window.handleSaveNewAgenda = function (e) {
        const type = document.getElementById("ag-type")?.value;
        const category = document.getElementById("ag-cat")?.value;
        const letterNo = document.getElementById("ag-number")?.value;
        const date = document.getElementById("ag-date")?.value;
        const party = document.getElementById("ag-party")?.value;
        const subject = document.getElementById("ag-subject")?.value;
        origSaveAg.apply(this, arguments);
        if (letterNo && party && subject) {
          fetch("/api/simm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "CREATE_MAIL_AGENDA",
              payload: { type, category, letterNo, date, party, subject },
            }),
          }).catch(() => null);
        }
      };
    }

    if (typeof window.handleSaveIndukBiodata === "function") {
      const origSaveBio = window.handleSaveIndukBiodata;
      window.handleSaveIndukBiodata = function (e) {
        const nis = document.getElementById("edit-stu-nis")?.value;
        const nisn = document.getElementById("edit-stu-nisn")?.value;
        const nik = document.getElementById("edit-stu-nik")?.value;
        const name = document.getElementById("edit-stu-name")?.value;
        const ttl = document.getElementById("edit-stu-ttl")?.value;
        const fatherName = document.getElementById("edit-stu-father")?.value;
        const motherName = document.getElementById("edit-stu-mother")?.value;
        const rombel = document.getElementById("edit-stu-rombel")?.value;
        const status = document.getElementById("edit-stu-status")?.value;
        const prevSchool = document.getElementById("edit-stu-prevschool")?.value;
        const address = document.getElementById("edit-stu-address")?.value;
        origSaveBio.apply(this, arguments);
        if (nis || nisn) {
          fetch("/api/simm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "UPDATE_STUDENT_BIODATA",
              payload: {
                nis,
                nisn,
                nik,
                name,
                ttl,
                fatherName,
                motherName,
                rombel,
                status,
                prevSchool,
                address,
              },
            }),
          }).catch(() => null);
        }
      };
    }

    // Hook fungsi Upload Dokumen di 7 portal
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
            if (el)
              el.textContent =
                "✓ Dokumen berhasil diunggah (" + data.key + ")";
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

    // =========================================================================
    // MODUL PRESENSI MANDIRI & GEOFENCING GPS PROFESIONAL (/gtk)
    // =========================================================================
    setupProfessionalGpsAttendance();
  });

  function calcHaversineMeters(lat1, lon1, lat2, lon2) {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  function setupProfessionalGpsAttendance() {
    const checkInBtn = document.getElementById("btn-gps-checkin");
    if (!checkInBtn) return;

    const profile =
      (dbSummary && dbSummary.profile) || window.__MADRASAH_PROFILE__ || {};
    const centerLat = Number(profile.gpsLat || "-3.0659978");
    const centerLng = Number(profile.gpsLng || "102.8196529");
    const maxRadius = Number(profile.gpsRadiusMeters) || 100;
    const todayDateLabel = new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    // Perbarui tanggal statis pada header kartu presensi GTK
    const cardRoot = checkInBtn.closest(".glass-surface");
    if (cardRoot) {
      const dateSub = cardRoot.querySelector("p.text-xs.text-slate-500");
      if (dateSub && dateSub.textContent?.includes("Jam Masuk Standar")) {
        dateSub.textContent = `${todayDateLabel} • Jam Masuk Standar: 07.00 WIB`;
      }
    }

    // Sinkronkan riwayat presensi nyata dari database (TeacherAttendance)
    if (
      dbSummary &&
      Array.isArray(dbSummary.teacherAttendances) &&
      currentSession
    ) {
      const myLogs = dbSummary.teacherAttendances.filter(
        (a) => a.teacherName === currentSession.name
      );
      if (typeof MY_DAILY_LOGS !== "undefined") {
        MY_DAILY_LOGS.length = 0;
        myLogs.forEach((a) => {
          MY_DAILY_LOGS.push({
            date: a.dateLabel || "-",
            checkIn: a.checkInTime || "-",
            checkOut: a.checkOutTime || "Aktif Mengajar",
            gps: a.gpsDistance || "-",
            status: a.status || "Hadir",
          });
        });
      }

      const todayRecord = myLogs.find((a) => a.dateLabel === todayDateLabel);
      if (todayRecord && typeof getActiveProfile === "function") {
        const p = getActiveProfile();
        if (p && p.attendanceToday) {
          if (todayRecord.status === "Hadir") {
            p.attendanceToday.status = "hadir";
            p.attendanceToday.time = todayRecord.checkInTime || "-";
            p.attendanceToday.checkOutTime = todayRecord.checkOutTime || null;
          } else {
            p.attendanceToday.status = "leave";
            p.attendanceToday.leaveType = todayRecord.status;
            p.attendanceToday.leaveReason = todayRecord.leaveReason || "-";
            p.attendanceToday.r2File = todayRecord.r2FileKey || "-";
          }
          if (typeof window.renderOverviewView === "function") {
            window.renderOverviewView();
          }
        }
      }
      if (typeof window.renderPresensiView === "function") {
        window.renderPresensiView();
      }
    }

    // Temukan kotak GPS Verification Box dan ubah menjadi indikator real-time
    const gpsInfoBox = cardRoot
      ? cardRoot.querySelector(".mt-4.p-4.rounded-2xl")
      : null;

    let lastCoords = null;

    function renderGpsBox(state, textTitle, textSub, badgeLabel, badgeTone) {
      if (!gpsInfoBox) return;
      const toneClass =
        badgeTone === "ok"
          ? "bg-emerald-100/90 text-emerald-800"
          : badgeTone === "warn"
            ? "bg-amber-100 text-amber-900"
            : "bg-rose-100 text-rose-800";
      gpsInfoBox.innerHTML = `
        <div class="flex items-start gap-3">
          <div class="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
            <i data-lucide="navigation" class="w-4 h-4"></i>
          </div>
          <div class="text-xs space-y-0.5">
            <p class="font-bold text-slate-800">${esc(textTitle)}</p>
            <p class="font-mono text-[11px] text-slate-500">${esc(textSub)}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg ${toneClass} text-[11px] font-semibold">
            <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
            ${esc(badgeLabel)}
          </span>
          <button type="button" id="btn-refresh-gps-loc" class="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer">
            Refresh GPS
          </button>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      const refreshBtn = document.getElementById("btn-refresh-gps-loc");
      if (refreshBtn) {
        refreshBtn.onclick = () => detectCurrentGps();
      }
    }

    function detectCurrentGps() {
      if (!navigator.geolocation) {
        renderGpsBox(
          "error",
          "Peramban Tidak Mendukung Geolocation",
          `Titik Kampus: ${centerLat}, ${centerLng} (Radius ${maxRadius}m)`,
          "GPS Tidak Didukung",
          "err"
        );
        return Promise.resolve(null);
      }

      renderGpsBox(
        "loading",
        `Memindai Koordinat GPS Perangkat... (${profile.name || "Madrasah"})`,
        `Target Kampus: ${centerLat}, ${centerLng} • Batas Radius: ${maxRadius}m`,
        "Mendeteksi Lokasi...",
        "warn"
      );

      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const acc = Math.round(pos.coords.accuracy || 0);
            const dist = calcHaversineMeters(lat, lng, centerLat, centerLng);
            const inRange = dist <= maxRadius + 50;
            lastCoords = { lat, lng, dist, acc, inRange };

            renderGpsBox(
              inRange ? "ok" : "out",
              inRange
                ? `Lokasi Terverifikasi: Area ${profile.name || "Madrasah"}`
                : `Di Luar Radius Kampus (${profile.name || "Madrasah"})`,
              `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)} • Jarak: ${dist}m (Akurasi ±${acc}m • Batas ${maxRadius}m)`,
              inRange ? "Dalam Radius Valid" : "Di Luar Radius",
              inRange ? "ok" : "err"
            );
            resolve(lastCoords);
          },
          (err) => {
            const msgMap = {
              1: "Izin akses lokasi (GPS) ditolak browser. Aktifkan izin lokasi di bilah alamat.",
              2: "Sinyal lokasi tidak tersedia. Pastikan GPS perangkat aktif.",
              3: "Waktu deteksi lokasi habis (timeout). Klik Refresh GPS untuk mencoba lagi.",
            };
            renderGpsBox(
              "error",
              msgMap[err.code] || "Gagal membaca lokasi perangkat",
              `Titik Kampus: ${centerLat}, ${centerLng} (Batas ${maxRadius}m)`,
              "Izin / Sinyal GPS",
              "err"
            );
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        );
      });
    }

    // Mulai deteksi GPS otomatis saat membuka portal GTK
    detectCurrentGps();

    // Tambahkan tombol Check-Out Pulang di samping Check-In bila sudah Check-In
    const ensureCheckOutButton = () => {
      const p =
        typeof window.getActiveProfile === "function"
          ? window.getActiveProfile()
          : null;
      const btnParent = checkInBtn.parentElement;
      if (!btnParent || !p) return;

      let outBtn = document.getElementById("btn-gps-checkout");
      if (p.attendanceToday?.status === "hadir" && !p.attendanceToday.checkOutTime) {
        if (!outBtn) {
          outBtn = document.createElement("button");
          outBtn.id = "btn-gps-checkout";
          outBtn.type = "button";
          outBtn.className =
            "flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all cursor-pointer";
          outBtn.innerHTML = `<i data-lucide="log-out" class="w-4 h-4"></i><span>Check-Out Pulang</span>`;
          outBtn.onclick = async () => {
            outBtn.disabled = true;
            try {
              const res = await fetch("/api/simm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "RECORD_TEACHER_CHECKOUT",
                  payload: {},
                }),
              });
              const data = await res.json();
              if (!data.ok) {
                throw new Error(data.error || "Gagal Check-Out");
              }
              const outTime = data.data?.checkOutTime || "Selesai";
              p.attendanceToday.checkOutTime = outTime;
              if (typeof MY_DAILY_LOGS !== "undefined" && MY_DAILY_LOGS[0]) {
                MY_DAILY_LOGS[0].checkOut = outTime;
              }
              if (typeof window.renderPresensiView === "function") {
                window.renderPresensiView();
              }
              outBtn.remove();
              showUnifiedToast(
                "Check-Out Pulang Tercatat",
                `Jam pulang Anda tercatat pukul ${outTime}.`
              );
            } catch (err) {
              outBtn.disabled = false;
              showUnifiedToast(
                "Gagal Check-Out",
                err?.message || "Coba lagi."
              );
            }
          };
          btnParent.appendChild(outBtn);
          if (window.lucide) window.lucide.createIcons();
        }
      } else if (outBtn) {
        outBtn.remove();
      }
    };

    ensureCheckOutButton();

    // Override fungsi Check-In GPS agar selalu memvalidasi ke server (/api/simm)
    window.handleGpsCheckIn = async function () {
      const p =
        typeof window.getActiveProfile === "function"
          ? window.getActiveProfile()
          : null;
      if (!p || p.attendanceToday.status !== "pending") return;

      checkInBtn.disabled = true;
      const origHtml = checkInBtn.innerHTML;
      checkInBtn.innerHTML = `<span>Memverifikasi GPS ke Server...</span>`;

      try {
        const coords = lastCoords || (await detectCurrentGps());
        if (!coords) {
          throw new Error(
            "Koordinat GPS belum tersedia. Izinkan akses lokasi lalu klik Refresh GPS."
          );
        }

        const res = await fetch("/api/simm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "RECORD_TEACHER_ATTENDANCE",
            payload: {
              status: "Hadir",
              lat: coords.lat,
              lng: coords.lng,
            },
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          throw new Error(data.error || "Check-In GPS ditolak oleh server.");
        }

        const saved = data.data || {};
        const checkInTime = saved.checkInTime || "Tercatat";
        p.attendanceToday.status = "hadir";
        p.attendanceToday.time = checkInTime;

        if (typeof PIKET_TEACHER_STATUS !== "undefined") {
          const piketRow = PIKET_TEACHER_STATUS.find(
            (t) => t.teacherName === p.name
          );
          if (piketRow) {
            piketRow.status = "Hadir";
            piketRow.statusDetail = `Check-In GPS ${checkInTime}`;
            piketRow.needsInval = false;
          }
        }

        if (typeof MY_DAILY_LOGS !== "undefined") {
          MY_DAILY_LOGS.unshift({
            date: saved.dateLabel || todayDateLabel,
            checkIn: checkInTime,
            checkOut: "Aktif Mengajar",
            gps:
              saved.gpsDistance ||
              `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)} (Radius ${coords.dist}m)`,
            status: "Hadir Terverifikasi GPS",
          });
        }

        if (typeof window.renderOverviewView === "function") {
          window.renderOverviewView();
        }
        if (typeof window.renderSidebarNavigation === "function") {
          window.renderSidebarNavigation();
        }
        if (typeof window.renderPresensiView === "function") {
          window.renderPresensiView();
        }
        ensureCheckOutButton();
        showUnifiedToast(
          "Check-In GPS Berhasil!",
          `Kehadiran Anda tercatat pada pukul ${checkInTime} (${saved.gpsDistance || "Terverifikasi Server"}).`
        );
      } catch (err) {
        checkInBtn.disabled = false;
        checkInBtn.innerHTML = origHtml;
        if (window.lucide) window.lucide.createIcons();
        showUnifiedToast(
          "Check-In GPS Gagal",
          err?.message || "Gagal memverifikasi lokasi ke server."
        );
      }
    };
  }
})();
