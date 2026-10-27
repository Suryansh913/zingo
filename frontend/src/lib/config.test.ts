import { describe, expect, it } from "vitest";
import { joinUrl, normalizeApiBase, toMediaUrl } from "./config";
const prod = { prod: true, pageProtocol: "https:", pageHost: "zingo-frontend.onrender.com" };
describe("normalizeApiBase", () => {
  it("accepts a clean origin", () => expect(normalizeApiBase("https://zingo-backend-o11v.onrender.com", prod)).toEqual({ base: "https://zingo-backend-o11v.onrender.com", error: null }));
  it("removes trailing slashes (they cause //api/... 404s)", () => expect(normalizeApiBase("https://x.onrender.com///", prod).base).toBe("https://x.onrender.com"));
  it("removes a /api suffix (it causes /api/api/... 404s)", () => { expect(normalizeApiBase("https://x.onrender.com/api", prod).base).toBe("https://x.onrender.com"); expect(normalizeApiBase("https://x.onrender.com/api/", prod).base).toBe("https://x.onrender.com"); });
  it("trims whitespace", () => expect(normalizeApiBase("  https://x.onrender.com \n", prod).base).toBe("https://x.onrender.com"));
  it("fails loudly in production when unset", () => { const r = normalizeApiBase(undefined, prod); expect(r.base).toBe(""); expect(r.error).toMatch(/VITE_API_URL is not set/); });
  it("defaults to localhost only in development", () => expect(normalizeApiBase("", { prod: false })).toEqual({ base: "http://localhost:8000", error: null }));
  it("rejects values without a scheme", () => expect(normalizeApiBase("zingo-backend.onrender.com", prod).error).toMatch(/must start with http/));
  it("rejects localhost in a deployed production build", () => expect(normalizeApiBase("http://localhost:8000", prod).error).toMatch(/localhost/));
  it("allows localhost when previewing a production build locally", () => expect(normalizeApiBase("http://localhost:8000", { prod: true, pageProtocol: "http:", pageHost: "localhost" }).error).toBeNull());
  it("rejects http backend from an https page (mixed content)", () => expect(normalizeApiBase("http://api.example.com", prod).error).toMatch(/mixed content/));
});
describe("urls", () => {
  it("joins without double slashes", () => { expect(joinUrl("https://x.com", "/api/me/")).toBe("https://x.com/api/me/"); expect(joinUrl("https://x.com", "api/me/")).toBe("https://x.com/api/me/"); });
  it("keeps absolute media URLs (S3/R2 signed URLs) untouched", () => expect(toMediaUrl("https://x.com", "https://bucket.r2.dev/v.mp4?X-Amz-Signature=abc")).toBe("https://bucket.r2.dev/v.mp4?X-Amz-Signature=abc"));
  it("prefixes relative media paths with the backend", () => expect(toMediaUrl("https://x.com", "/media/videos/a.mp4")).toBe("https://x.com/media/videos/a.mp4"));
  it("returns empty for missing media", () => expect(toMediaUrl("https://x.com", null)).toBe(""));
});
