import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { API, api, token } from "./api"; import { useAuth } from "./auth";
export type WsStatus = "connecting" | "open" | "reconnecting" | "offline";
type Handler = (e: any) => void;
interface Ctx { status: WsStatus; send(p: object): boolean; subscribe(h: Handler): () => void; chatUnread: number; notifUnread: number; refreshCounts(): void; }
const R = createContext<Ctx>({ status: "offline", send: () => false, subscribe: () => () => {}, chatUnread: 0, notifUnread: 0, refreshCounts: () => {} });
export const useRealtime = () => useContext(R);
const WS_URL = API.replace(/^http/, "ws") + "/ws/chat/";

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth(); const [status, setStatus] = useState<WsStatus>("offline"); const [chatUnread, setChat] = useState(0); const [notifUnread, setNotif] = useState(0);
  const ws = useRef<WebSocket | null>(null); const subs = useRef(new Set<Handler>()); const ready = useRef(false);
  const emit = (e: any) => subs.current.forEach(h => h(e));
  const refreshCounts = useCallback(() => {
    api<{ count: number }>("/api/conversations/unread-count/").then(r => setChat(r.count)).catch(() => {});
    api<{ count: number }>("/api/notifications/unread-count/").then(r => setNotif(r.count)).catch(() => {});
  }, []);
  useEffect(() => { if (!user) { setChat(0); setNotif(0); return; } refreshCounts(); const t = setInterval(refreshCounts, 30000); return () => clearInterval(t); }, [user?.id, refreshCounts]);

  useEffect(() => {
    if (!user) { setStatus("offline"); return; }
    let closed = false, attempt = 0, timer: number | undefined;
    const connect = () => {
      setStatus(attempt === 0 ? "connecting" : "reconnecting"); ready.current = false;
      const s = new WebSocket(WS_URL); ws.current = s;
      s.onopen = () => s.send(JSON.stringify({ type: "auth", token: token.get() }));  // token sent in a message, never in the URL
      s.onmessage = ev => { let d: any; try { d = JSON.parse(ev.data); } catch { return; }
        if (d.type === "ready") { ready.current = true; attempt = 0; setStatus("open"); emit({ type: "open" }); refreshCounts(); }
        else { emit(d); if (d.type === "message") refreshCounts(); } };
      s.onclose = ev => { ready.current = false; if (closed) return;
        if (ev.code === 4401) { setStatus("offline"); return; }   // bad token: don't loop
        setStatus("reconnecting"); attempt++; timer = window.setTimeout(connect, Math.min(1000 * 2 ** attempt, 15000)); };
      s.onerror = () => s.close();
    };
    connect();
    return () => { closed = true; window.clearTimeout(timer); ws.current?.close(); ws.current = null; setStatus("offline"); };
  }, [user?.id, refreshCounts]);

  const send = useCallback((p: object) => { const s = ws.current; if (s && s.readyState === WebSocket.OPEN && ready.current) { s.send(JSON.stringify(p)); return true; } return false; }, []);
  const subscribe = useCallback((h: Handler) => { subs.current.add(h); return () => { subs.current.delete(h); }; }, []);
  return <R.Provider value={{ status, send, subscribe, chatUnread, notifUnread, refreshCounts }}>{children}</R.Provider>;
}
