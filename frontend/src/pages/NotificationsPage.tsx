import { useCallback, useEffect, useState } from "react"; import { useNavigate } from "react-router-dom"; import { api } from "../lib/api"; import type { CursorPage, Notif } from "../lib/types";
import { useRealtime } from "../lib/realtime"; import { ago } from "../lib/time";
const text = (n: Notif) => { const a = n.actor ? `@${n.actor} ` : ""; switch (n.kind) {
  case "follow": return a + "started following you"; case "like": return a + "liked your video"; case "comment": return a + "commented on your video";
  case "reply": return a + "replied to your comment"; case "mention": return a + "mentioned you in a comment"; case "dm": return a + "sent you a message";
  case "story_result": return "WHATNEXT voting has ended — see the result"; case "date_match": return a + "matched with you on ZINGO Date ❤️"; case "battle_invite": return a + "challenged you to a battle"; case "battle_result": return "Your battle has ended — see the result"; default: return "New activity"; } };
const target = (n: Notif) => n.kind === "follow" ? `/u/${n.actor}` : n.conversation ? `/chat/${n.conversation}` : n.battle ? `/battle/${n.battle}` : n.story_node ? `/story/${n.story_node}` : n.video ? `/video/${n.video}` : "/";
export default function NotificationsPage() {
  const nav = useNavigate(); const { refreshCounts } = useRealtime(); const [items, setItems] = useState<Notif[] | null>(null); const [next, setNext] = useState<string | null>(null); const [err, setErr] = useState("");
  const load = useCallback((url: string, reset: boolean) => api<CursorPage<Notif>>(url).then(r => { setItems(p => reset ? r.results : [...(p || []), ...r.results]); setNext(r.next); setErr(""); }).catch(e => { setErr(e.message); setItems(p => p ?? []); }), []);
  useEffect(() => { load("/api/notifications/", true); }, [load]);
  const open = async (n: Notif) => { try { if (!n.read) { await api(`/api/notifications/${n.id}/read/`, { method: "POST" }); setItems(p => p!.map(x => x.id === n.id ? { ...x, read: true } : x)); refreshCounts(); } } catch {} nav(target(n)); };
  const all = async () => { try { await api("/api/notifications/read-all/", { method: "POST" }); setItems(p => p!.map(x => ({ ...x, read: true }))); refreshCounts(); } catch (e) { setErr((e as Error).message); } };
  return (<div className="mx-auto max-w-xl p-4"><div className="mb-3 flex items-center justify-between"><h1 className="text-2xl font-bold">🔔 Notifications</h1>
    <button className="btn2" disabled={!items?.some(n => !n.read)} onClick={all}>Mark all read</button></div>
    {items === null && [1, 2, 3].map(i => <div key={i} className="mb-2 h-14 animate-pulse rounded-2xl bg-soft" />)}
    {err && <p role="alert" className="text-red-600">{err} <button className="underline" onClick={() => load("/api/notifications/", true)}>Retry</button></p>}
    {items?.length === 0 && !err && <p className="py-12 text-center text-mute">You're all caught up. Likes, follows, comments and battle updates will show here.</p>}
    <ul className="space-y-2">{items?.map(n => <li key={n.id}><button onClick={() => open(n)} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-gray-100 ${n.read ? "bg-white border border-line" : "bg-white border border-line ring-1 ring-zpurple"}`}>
      {!n.read && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-zpink" aria-label="unread" />}<span className="flex-1">{text(n)}</span><span className="text-xs text-mute">{ago(n.created)}</span></button></li>)}</ul>
    {next && <button className="btn2 mx-auto mt-4 block" onClick={() => load(next, false)}>Load more</button>}</div>);
}
