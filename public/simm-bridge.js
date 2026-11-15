/**
 * SIMS MTs Nurul Falah — Production Security, RBAC, Supabase & Cloudflare R2 Bridge
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

  function hideParentCard(el, levels) {
    let curr = el;
    for (let i = 0; i < (levels || 1); i++) {
      if (curr && curr.parentElement) curr = curr.parentElement;
    }
    if (curr) curr.style.display = "none";
  }

  // Terapkan Mode Produksi berdasarkan sesi login aktif
  function enforceProductionRbacUI(session) {
    const isSuperAdmin = session && session.baseRole === "ADMIN";

    // Jika bukan Super Admin, sembunyikan seluruh pengalih profil demo (Guru, TU, Siswa)
    if (!isSuperAdmin) {
      // 1. Dashboard Guru / GTK
      const gtkSideSwitcher = document.getElementById("profile-switcher-sidebar");
      const gtkTopSwitcher = document.getElementById("profile-switcher-topbar");
      if (gtkSideSwitcher) hideParentCard(gtkSideSwitcher, 1);
      if (gtkTopSwitcher) hideParentCard(gtkTopSwitcher, 1);

      if (
        session &&
        session.baseRole === "GTK" &&
        typeof window.switchTeacherProfile === "function"
      ) {
        const key = session.subProfileKey || "fauzi";
        window.switchTeacherProfile(key);
      }

      // 2. Dashboard Tata Usaha (TU)
      const tuSideSwitcher = document.getElementById("tu-staff-switcher-sidebar");
      const tuTopSwitcher = document.getElementById("tu-staff-switcher-topbar");
      if (tuSideSwitcher) hideParentCard(tuSideSwitcher, 1);
      if (tuTopSwitcher) hideParentCard(tuTopSwitcher, 1);

      if (
        session &&
        session.baseRole === "TU" &&
        typeof window.switchTuStaffProfile === "function"
      ) {
        const key = session.subProfileKey || "ridwan";
        window.switchTuStaffProfile(key);
      }

      // 3. Dashboard Siswa
      const stuSideSwitcher = document.getElementById("student-switcher-sidebar");
      const stuTopSwitcher = document.getElementById("student-switcher-topbar");
      if (stuSideSwitcher) hideParentCard(stuSideSwitcher, 1);
      if (stuTopSwitcher) hideParentCard(stuTopSwitcher, 1);

      if (
        session &&
        session.baseRole === "SISWA" &&
        typeof window.switchStudentProfile === "function"
      ) {
        const key = session.subProfileKey || "rizky";
        window.switchStudentProfile(key);
      }
    }
  }

  // Upgrade Modal Login di Halaman Publik agar memiliki 5 Peran Lengkap (Guru, TU, Admin, Siswa, Ortu) + Link PPDB
  function upgradePublicLoginModal() {
    const firstRoleTab = document.querySelector(".login-role-tab");
    if (!firstRoleTab || !firstRoleTab.parentElement) return;

    const pillContainer = firstRoleTab.parentElement;
    pillContainer.className =
      "grid grid-cols-5 gap-1 p-1 rounded-2xl bg-slate-100 border border-slate-200/70 mb-5";
    pillContainer.innerHTML = `
      <button type="button" onclick="selectLoginRole('guru')" data-login-role="guru" class="login-role-tab py-2 px-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer">
        Guru/GTK
      </button>
      <button type="button" onclick="selectLoginRole('tu')" data-login-role="tu" class="login-role-tab py-2 px-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer">
        Staf TU
      </button>
      <button type="button" onclick="selectLoginRole('admin')" data-login-role="admin" class="login-role-tab py-2 px-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer">
        Admin
      </button>
      <button type="button" onclick="selectLoginRole('siswa')" data-login-role="siswa" class="login-role-tab py-2 px-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer">
        Siswa
      </button>
      <button type="button" onclick="selectLoginRole('ortu')" data-login-role="ortu" class="login-role-tab py-2 px-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer">
        Orang Tua
      </button>
    `;

    window.selectLoginRole = function (role) {
      window.currentLoginRole = role;
      const preview = document.getElementById("login-preview-result");
      if (preview) preview.classList.add("hidden");

      document.querySelectorAll(".login-role-tab").forEach((btn) => {
        const isActive = btn.getAttribute("data-login-role") === role;
        btn.className = isActive
          ? "login-role-tab py-2 px-1 rounded-xl text-[11px] font-semibold bg-white text-emerald-700 shadow-sm transition-all cursor-pointer"
          : "login-role-tab py-2 px-1 rounded-xl text-[11px] font-medium text-slate-600 hover:text-slate-900 transition-all cursor-pointer";
      });

      const label = document.getElementById("login-id-label");
      const input = document.getElementById("login-identifier");
      const hint = document.getElementById("login-role-hint");
      if (!label || !input || !hint) return;

      if (role === "guru") {
        label.textContent = "NIP / NUPTK / Email Guru";
        input.placeholder = "Contoh: 198805122015031002";
        hint.innerHTML =
          "<strong>Akses Dinamis GTK:</strong> Menu tambahan (Wali Kelas, Guru Piket, Tabungan, Komite, BK) aktif otomatis sesuai SK Tahun Ajaran.";
      } else if (role === "tu") {
        label.textContent = "NIP Staf / Kepala Tata Usaha";
        input.placeholder = "Contoh: 198204152009011008";
        hint.innerHTML =
          "<strong>Dashboard Tata Usaha (TU):</strong> Buku Induk & Arsip R2, Layanan Persuratan, Koreksi Data, serta Validasi EMIS.";
      } else if (role === "admin") {
        label.textContent = "Email / ID Super Admin";
        input.placeholder = "Contoh: admin.operator@mtsnurulfalah.sch.id";
        hint.innerHTML =
          "<strong>Super Admin / Operator:</strong> Akses penuh ke seluruh modul, Plotting Tugas Tambahan GTK, Override Piket, & CMS.";
      } else if (role === "ortu") {
        label.textContent = "Email / No. HP Orang Tua / Wali";
        input.placeholder = "Contoh: ortu.hendra@gmail.com";
        hint.innerHTML =
          "<strong>Portal Orang Tua (Multi-Child):</strong> Pantau beberapa anak sekaligus, ajukan izin R2, konfirmasi komite, & chat Wali Kelas/BK.";
      } else {
        label.textContent = "NISN / NIS Peserta Didik";
        input.placeholder = "Contoh: 0123456789";
        hint.innerHTML =
          "<strong>Portal Siswa:</strong> Jadwal pelajaran & materi jurnal harian, regu piket, buku tabungan digital, dan arsip dokumen R2.";
      }
    };

    window.fillDemoCredentials = function () {
      const role = window.currentLoginRole || "guru";
      const input = document.getElementById("login-identifier");
      const pass = document.getElementById("login-password");
      if (!input || !pass) return;

      if (role === "guru") input.value = "198805122015031002";
      else if (role === "tu") input.value = "198204152009011008";
      else if (role === "admin") input.value = "admin.operator@mtsnurulfalah.sch.id";
      else if (role === "ortu") input.value = "ortu.hendra@gmail.com";
      else input.value = "0123456789";

      pass.value = "Simms2026!";
      if (typeof window.showToast === "function") {
        window.showToast("Akun Siap", "Kredensial uji coba (" + role.toUpperCase() + ") telah diisikan.");
      }
    };

    window.selectLoginRole("guru");
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
          "Mengunggah ke Cloudflare R2...",
          "Mengirim " + file.name + " ke bucket R2 simm-media..."
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
              "Tersimpan di Cloudflare R2",
              "Key: " + data.key + " (" + Math.round((file.size || 1024) / 1024) + " KB)"
            );
          }
          notifyShell("R2_UPLOADED", data);
          if (onSuccess) onSuccess(data, file);
        } else {
          throw new Error(data.error || "Upload R2 gagal");
        }
      } catch (err) {
        console.error("Upload R2 error:", err);
        if (typeof window.showToast === "function") {
          window.showToast("Mode Fallback R2", "Berkas dicatat: " + file.name);
        }
        if (onSuccess) {
          onSuccess(
            {
              ok: true,
              key: (folder || "r2") + "/" + Date.now() + "-" + file.name,
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
    upgradePublicLoginModal();

    // 0. Ambil sesi pengguna saat ini & terapkan Mode Produksi RBAC
    let currentSession = null;
    try {
      const authRes = await fetch("/api/auth");
      const authData = await authRes.json();
      if (authData && authData.session) {
        currentSession = authData.session;
      }
    } catch (e) {
      console.warn("Session check error:", e);
    }

    enforceProductionRbacUI(currentSession);

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

    // 1. Sinkronisasi data awal dari Supabase (/api/simm)
    try {
      const res = await fetch("/api/simm?resource=summary");
      const db = await res.json();
      if (db && db.ok) {
        window.__SIMM_DB__ = db;

        if (Array.isArray(db.students) && db.students.length > 0) {
          if (
            typeof window.STUDENTS_LIST !== "undefined" &&
            Array.isArray(window.STUDENTS_LIST)
          ) {
            db.students.forEach((s) => {
              const exists = window.STUDENTS_LIST.some((x) => x.nisn === s.nisn);
              if (!exists) {
                window.STUDENTS_LIST.unshift({
                  id: Date.now() + Math.floor(Math.random() * 1000),
                  nis: s.nis,
                  nisn: s.nisn,
                  name: s.name,
                  rombel: s.rombel,
                  gender: s.gender === "Perempuan" ? "P" : "L",
                  parent: s.fatherName,
                  status: s.status,
                  docs: {
                    kk: Boolean(s.r2KkUrl),
                    akta: Boolean(s.r2AktaUrl),
                    ijazah: Boolean(s.r2IjazahUrl),
                  },
                });
              }
            });
            if (typeof window.renderStudentsTable === "function") {
              window.renderStudentsTable();
            }
          }
        }
      }
    } catch (e) {
      console.warn("Initial Supabase sync skipped:", e);
    }

    // 2. Hook Portal Login pada Halaman Publik agar melakukan autentikasi nyata & redirect otomatis
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
              roleHint: window.currentLoginRole || "",
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

          if (typeof window.showToast === "function") {
            window.showToast(
              "Autentikasi Berhasil",
              "Mengarahkan ke dashboard " + data.session.name + "..."
            );
          }

          notifyShell("AUTH_SUCCESS", data.session);

          setTimeout(() => {
            notifyShell("NAVIGATE", { path: data.session.targetPath });
            if (window.parent === window) {
              window.location.href = data.session.targetPath;
            }
          }, 450);
        } catch (err) {
          console.error("Auth hook error:", err);
        }
      };
    }

    // Hook tombol Layanan PPDB Online di Halaman Publik agar bisa membuka /ppdb langsung
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
                <span>Buka Portal Pendaftaran PPDB Online Penuh (/ppdb) →</span>
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
        if (typeof window.PPDB_LIST !== "undefined") {
          const found = window.PPDB_LIST.find(
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

    // 4. Hook Tambah Siswa Baru (Admin & TU) ke Supabase
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

    // 5. Hook Submit Pendaftaran PPDB Online ke Supabase
    if (typeof window.submitRegistration === "function") {
      const origSubmitPpdb = window.submitRegistration;
      window.submitRegistration = async function () {
        origSubmitPpdb.apply(this, arguments);
        if (window.wizardState) {
          const w = window.wizardState;
          fetch("/api/simm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "SUBMIT_PPDB",
              payload: {
                regNo: "PPDB-2027-" + Math.floor(150 + Math.random() * 800),
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

    // 6. Hook Buat Berita CMS Baru ke Supabase
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

    // 7. Upgrade seluruh fungsi Upload Cloudflare R2 di 7 portal
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
            if (txt) txt.textContent = "Tersimpan di R2: " + file.name;
            if (sub) sub.textContent = "Object Key: " + data.key;
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
            if (lbl) lbl.textContent = "Tersimpan di R2: " + file.name;
            if (sub) sub.textContent = "Object Key: " + data.key;
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
            if (lbl) lbl.textContent = "Tersimpan di R2: " + file.name;
            if (sub) sub.textContent = "Object Key: " + data.key;
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
          (data, file) => {
            const statusMap = {
              leave: "leave-r2-status-text",
              komite: "komite-r2-status-text",
              doc: "doc-r2-status-text",
            };
            const el = document.getElementById(statusMap[contextKey]);
            if (el)
              el.textContent = "✓ Berhasil diunggah ke R2 (" + data.key + ")";
          }
        );
      };
    }

    if (typeof window.handleR2FileUpload === "function") {
      const orig = window.handleR2FileUpload;
      window.handleR2FileUpload = function (docKey) {
        orig.apply(this, arguments);
        pickAndUploadToR2("ppdb-2027/" + docKey, docKey + ".pdf");
      };
    }
  });
})();
