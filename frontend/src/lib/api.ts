import { joinUrl, normalizeApiBase, toMediaUrl } from "./config";
const cfg = normalizeApiBase(import.meta.env.VITE_API_URL as string | undefined, { prod: import.meta.env.PROD, pageProtocol: typeof location !== "undefined" ? location.protocol : undefined, pageHost: typeof location !== "undefined" ? location.hostname : undefined });
export const API = cfg.base;
export const API_CONFIG_ERROR = cfg.error;   // shown as a banner by the app; requests fail fast with the same message instead of silently hitting the wrong host
export class ApiError extends Error { constructor(public status: number, msg: string, public data?: any, public url?: string) { super(msg); } }
const KEY = "zingo_token";
export const token = { get: () => localStorage.getItem(KEY), set: (t: string) => localStorage.setItem(KEY, t), clear: () => localStorage.removeItem(KEY) };
let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (f: () => void) => { onUnauthorized = f; };

function msg(d: any): string {
  if (!d) return "Request failed.";
  if (typeof d === "string") return d;
  if (d.detail) return d.detail;
  return Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : v}`).join(" | ");
}
export async function api<T = any>(path: string, opts: { method?: string; body?: any } = {}): Promise<T> {
  if (API_CONFIG_ERROR) throw new ApiError(0, API_CONFIG_ERROR);
  const method = opts.method || "GET"; const url = path.startsWith("http") ? path : joinUrl(API, path);
  const headers: Record<string, string> = {}; const t = token.get(); if (t) headers.Authorization = `Token ${t}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  let res: Response;
  try { res = await fetch(url, { method, headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined }); }
  catch { console.warn(`[api] network error: ${method} ${url}`); throw new ApiError(0, "Can't reach the server. Check your connection (if this keeps happening the site owner should open /status).", undefined, url); }
  if (res.status === 204) return undefined as T;
  let data: any = null; let notJson = false; try { data = await res.json(); } catch { notJson = true; }
  if (res.status === 401 && t) { token.clear(); onUnauthorized(); }
  if (!res.ok) {
    if (res.status === 404 || res.status >= 500 || notJson) console.warn(`[api] ${res.status} ${method} ${url}`);   // exact failing URL in the browser console
    const m = notJson ? (res.status === 404 ? `Not found: ${method} ${new URL(url).pathname} (the server has no such route - check VITE_API_URL and that the backend is up to date).` : `The server returned an unexpected response (HTTP ${res.status}).`) : msg(data);
    throw new ApiError(res.status, m, data, url);
  }
  if (notJson) throw new ApiError(res.status, "The server returned a non-JSON response. Check that VITE_API_URL points to the API backend, not to the frontend.", undefined, url);
  return data as T;
}
// multipart upload with progress (fetch has no upload progress events)
export function upload(path: string, form: FormData, onProgress: (p: number) => void): Promise<any> {
  return new Promise((resolve, reject) => {
    if (API_CONFIG_ERROR) return reject(new ApiError(0, API_CONFIG_ERROR));
    const url = joinUrl(API, path); const x = new XMLHttpRequest(); x.open("POST", url);
    const t = token.get(); if (t) x.setRequestHeader("Authorization", `Token ${t}`);
    x.upload.onprogress = e => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    x.onload = () => { let d: any = null; try { d = JSON.parse(x.responseText); } catch {}
      if (x.status < 300) return resolve(d);
      if (x.status === 401) { token.clear(); onUnauthorized(); }
      if (x.status === 413) return reject(new ApiError(413, "The file is too large for the server.", d, url));
      if (x.status === 404 || x.status >= 500) console.warn(`[api] ${x.status} POST ${url}`);
      reject(new ApiError(x.status, d ? msg(d) : `Upload failed (HTTP ${x.status}).`, d, url)); };
    x.onerror = () => reject(new ApiError(0, "Network error during upload. Check your connection and try again.", undefined, url));
    x.ontimeout = () => reject(new ApiError(0, "The upload timed out. Try a smaller video or a better connection.", undefined, url));
    x.send(form);
  });
}
export const mediaUrl = (u?: string | null) => toMediaUrl(API, u);
