/**
 * Utilitas keamanan output (anti-XSS) untuk SIMMS.
 *
 * Template portal merender data dengan template literal ke `innerHTML`,
 * termasuk di dalam atribut `onclick="fn('${x}')"`. HTML-escape biasa TIDAK cukup
 * untuk konteks JS-di-dalam-atribut karena entitas di-decode kembali oleh browser.
 *
 * Karena itu digunakan "netralisasi": karakter berbahaya diganti dengan padanan
 * Unicode yang tampil hampir sama namun tidak bermakna sintaksis di HTML/JS.
 * Aman di konteks teks HTML, atribut, string JS dalam atribut, maupun textContent.
 */

const NEUTRAL_MAP: Record<string, string> = {
  "<": "\u2039", // ‹
  ">": "\u203A", // ›
  '"': "\u201D", // ”
  "'": "\u2019", // ’
  "`": "\u02CB", // ˋ
  "\\": "\uFF3C", // ＼
};

/** Netralisasi satu string agar aman di semua konteks rendering portal. */
export function neutralizeText(input: string): string {
  return String(input)
    .replace(/[<>"'`\\]/g, (c) => NEUTRAL_MAP[c] || c)
    // `&` hanya berbahaya bila membentuk entitas (&#39; / &quot; / &lt; ...)
    .replace(/&(?=[#a-zA-Z0-9])/g, "&amp;")
    // hapus karakter kontrol (kecuali tab/newline)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029]/g, "");
}

/** Netralisasi rekursif seluruh string di dalam objek/array (Date dibiarkan). */
export function deepNeutralize<T>(value: T): T {
  if (typeof value === "string") return neutralizeText(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => deepNeutralize(v)) as unknown as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
      out[k] = deepNeutralize(v);
    }
    return out as T;
  }
  return value;
}

/** HTML-escape standar (untuk teks yang disisipkan langsung ke markup server-side). */
export function escapeHtml(input: unknown): string {
  return String(input ?? "").replace(
    /[&<>"'`]/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        "`": "&#96;",
      })[c] as string
  );
}

/**
 * Serialisasi JSON yang aman ditanam di dalam tag <script>.
 * Mencegah break-out `</script>`, komentar HTML `<!--`, dan U+2028/2029.
 */
export function safeJsonForScript(value: unknown): string {
  return JSON.stringify(value ?? null)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
