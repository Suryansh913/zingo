import { useCallback, useEffect, useState, FormEvent } from "react"; import { Link, useNavigate } from "react-router-dom"; import { api, ApiError } from "../lib/api";
import type { Conv, CursorPage } from "../lib/types"; import { useRealtime } from "../lib/realtime"; import { ago } from "../lib/time";
export default function ChatInbox() {
  const nav = useNavigate(); const { subscribe, status } = useRealtime(); const [items, setItems] = useState<Conv[] | null>(null); const [next, setNext] = useState<string | null>(null);
  const [err, setErr] = useState(""); const [name, setName] = useState(""); const [startErr, setStartErr] = useState("");
  const load = useCallback((url: string, reset: boolean) => api<CursorPage<Conv>>(url).then(r => { setItems(p => reset ? r.results : [...(p || []), ...r.results]); setNext(r.next); setErr(""); }).catch(e => { setErr(e.message); setItems(p => p ?? []); }), []);
  useEffect(() => { load("/api/conversations/", true); }, [load]);
  useEffect(() => subscribe(e => { if (e.type === "message" || e.type === "open") load("/api/conversations/", true); }), [subscribe, load]);
  const start = async (e: FormEvent) => { e.preventDefault(); setStartErr("");
    try { const r = await api<{ id: number }>("/api/conversations/", { method: "POST", body: { username: name.trim().replace(/^@/, "") } }); nav(`/chat/${r.id}`); }
    catch (x) { setStartErr(x instanceof ApiError ? x.message : "Failed."); } };
  return (<div className="mx-auto max-w-xl p-4"><h1 className="mb-3 text-2xl font-bold">💬 Chat</h1>
    {status !== "open" && <p className="mb-2 text-xs text-mute" role="status">{status === "reconnecting" ? "Reconnecting to live updates…" : status === "connecting" ? "Connecting…" : "Live updates off — pull to refresh."}</p>}
    <form onSubmit={start} className="mb-4 flex gap-2"><input className="inp" placeholder="Start a chat — username" aria-label="Username" value={name} onChange={e => setName(e.target.value)} /><button className="btn" disabled={!name.trim()}>Chat</button></form>
    {startErr && <p role="alert" className="mb-2 text-sm text-red-600">{startErr}</p>}
    {items === null && [1, 2, 3].map(i => <div key={i} className="mb-2 h-16 animate-pulse rounded-2xl bg-soft" />)}
    {err && <p role="alert" className="text-red-600">{err} <button className="underline" onClick={() => load("/api/conversations/", true)}>Retry</button></p>}
    {items?.length === 0 && !err && <p className="py-12 text-center text-mute">No conversations yet. Visit a profile and tap Message, or start one above.</p>}
    <ul className="space-y-2">{items?.map(c => (<li key={c.id}><Link to={`/chat/${c.id}`} className="flex items-center gap-3 rounded-2xl bg-white border border-line p-3 hover:bg-gray-100">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-lg grad text-white">{c.other.username[0].toUpperCase()}</span>
      <div className="min-w-0 flex-1"><div className="flex justify-between"><b className={c.unread ? "text-ink" : "text-ink/80"}>@{c.other.username}</b><span className="text-xs text-mute">{c.last_message ? ago(c.last_message.created) : ""}</span></div>
        <p className={`truncate text-sm ${c.unread ? "font-semibold text-ink" : "text-mute"}`}>{c.last_message ? (c.last_message.sender === c.other.username ? "" : "You: ") + (c.last_message.kind === "video" ? "🎬 Shared a video" : c.last_message.text) : "No messages yet"}</p></div>
      {c.unread > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-zpink px-1 text-xs font-bold" aria-label={`${c.unread} unread`}>{c.unread}</span>}</Link></li>))}</ul>
    {next && <button className="btn2 mx-auto mt-4 block" onClick={() => load(next, false)}>Load more</button>}</div>);
}
