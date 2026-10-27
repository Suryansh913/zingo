import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { api, token, setUnauthorizedHandler } from "./api";
import type { Profile } from "./types";
interface Ctx { user: Profile | null; loading: boolean; login(t: string): Promise<void>; logout(): Promise<void>; refresh(): Promise<void>; }
const A = createContext<Ctx>(null!);
export const useAuth = () => useContext(A);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null); const [loading, setLoading] = useState(!!token.get());
  const refresh = useCallback(async () => { try { setUser(await api<Profile>("/api/me/")); } catch { setUser(null); } finally { setLoading(false); } }, []);
  useEffect(() => { setUnauthorizedHandler(() => setUser(null)); if (token.get()) refresh(); }, [refresh]);
  const login = async (t: string) => { token.set(t); setLoading(true); await refresh(); };
  const logout = async () => { try { await api("/api/auth/logout/", { method: "POST" }); } catch {} token.clear(); setUser(null); };
  return <A.Provider value={{ user, loading, login, logout, refresh }}>{children}</A.Provider>;
}
