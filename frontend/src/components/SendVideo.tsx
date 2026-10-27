import { useEffect, useState } from "react"; import { api, ApiError } from "../lib/api"; import type { ChatMsg, Conv, CursorPage } from "../lib/types"; import { uid } from "../lib/time";
export default function SendVideo({ videoId, onClose }: { videoId: number; onClose: () => void }) {
  const [convs, setConvs] = useState<Conv[] | null>(null); const [name, setName] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  useEffect(() => { api<CursorPage<Conv>>("/api/conversations/").then(r => setConvs(r.results)).catch(e => setMsg(e.message)); }, []);
  const sendTo = async (convId: number) => { setBusy(true); setMsg("");
    try { await api<ChatMsg>(`/api/conversations/${convId}/messages/`, { method: "POST", body: { video: videoId, client_id: uid() } }); setDone(true); } catch (e) { setMsg(e instanceof ApiError ? e.message : "Failed."); } finally { setBusy(false); } };
  const startNew = async () => { setBusy(true); setMsg(""); try { const c = await api<{ id: number }>("/api/conversations/", { method: "POST", body: { username: name.trim().replace(/^@/, "") } }); await sendTo(c.id); } catch (e) { setMsg(e instanceof ApiError ? e.message : "Failed."); setBusy(false); } };
  return (<div className="absolute inset-x-0 bottom-0 z-20 max-h-[70%] overflow-y-auto rounded-t-3xl bg-white border border-line p-4" role="dialog" aria-label="Send to a friend">
    <div className="mb-2 flex justify-between"><b>Send to a friend</b><button onClick={onClose} aria-label="Close">✕</button></div>
    {done ? <p role="status" className="py-6 text-center text-green-600">Sent ✓</p> : <>
      {convs === null && !msg && <p className="text-mute">Loading…</p>}
      <ul className="space-y-1">{convs?.map(c => <li key={c.id}><button disabled={busy} className="w-full rounded-xl p-2 text-left hover:bg-gray-100" onClick={() => sendTo(c.id)}>@{c.other.username}</button></li>)}</ul>
      <div className="mt-2 flex gap-2"><input className="inp" placeholder="Or a username" value={name} onChange={e => setName(e.target.value)} /><button className="btn" disabled={busy || !name.trim()} onClick={startNew}>Send</button></div></>}
    {msg && <p role="alert" className="mt-2 text-sm text-red-600">{msg}</p>}</div>);
}
