/** Pure helpers (no import.meta) so they can be unit-tested. The backend origin must be an absolute http(s) URL WITHOUT a trailing slash and WITHOUT "/api". */
export interface ApiBase { base: string; error: string | null; }
export interface Env { prod: boolean; pageProtocol?: string; pageHost?: string; }
export function normalizeApiBase(raw: string | undefined, env: Env): ApiBase {
  let v = (raw ?? "").trim();
  if (!v) return env.prod ? { base: "", error: "VITE_API_URL is not set for this build. Set it to your backend origin (e.g. https://zingo-backend-o11v.onrender.com) and rebuild the frontend." } : { base: "http://localhost:8000", error: null };
  const given = v;
  v = v.replace(/\/+$/, "").replace(/\/api$/i, "").replace(/\/+$/, "");   // "https://x.com/" and "https://x.com/api" would otherwise produce //api/... or /api/api/... (both 404)
  if (!/^https?:\/\//i.test(v)) return { base: "", error: `VITE_API_URL must start with http:// or https:// (got "${given}").` };
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(v);
  if (env.prod && local && env.pageHost && !/^(localhost|127\.0\.0\.1)$/.test(env.pageHost)) return { base: "", error: `VITE_API_URL points to ${v}, which is localhost, but this site is served from ${env.pageHost}. Rebuild with your deployed backend URL.` };
  if (env.pageProtocol === "https:" && v.startsWith("http://") && !local) return { base: "", error: "VITE_API_URL uses http:// but this site is https://. Browsers block that (mixed content). Use https://." };
  return { base: v, error: null };
}
export const joinUrl = (base: string, path: string) => base + (path.startsWith("/") ? path : "/" + path);
export const toMediaUrl = (base: string, u?: string | null) => !u ? "" : /^(https?:|data:|blob:)/i.test(u) ? u : joinUrl(base, u);
