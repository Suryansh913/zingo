import { useEffect, useState } from "react"; import { api, ApiError } from "../lib/api"; import type { Comment } from "../lib/types";
export default function Comments({ videoId, onClose, onAdded }: { videoId: number; onClose: () => void; onAdded: () => void }) {
  const [list, setList] = useState<Comment[] | null>(null); const [err, setErr] = useState(""); const [text, setText] = useState("");
  const [reply, setReply] = useState<Comment | null>(null); const [busy, setBusy] = useState(false);
  const load = () => { setErr(""); api<Comment[]>(`/api/videos/${videoId}/comments/`).then(setList).catch(e => setErr(e.message)); };
  useEffect(load, [videoId]);
  const send = async () => { if (!text.trim()) return; setBusy(true); setErr("");
    try { await api(`/api/videos/${videoId}/comments/`, { method: "POST", body: { text, parent: reply?.id ?? null } }); setText(""); setReply(null); onAdded(); load(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : "Failed."); } finally { setBusy(false); } };
  const top = (list || []).filter(c => !c.parent);
  const row = (c: Comment, child?: boolean): JSX.Element => (<div key={c.id} className={child ? "ml-8" : ""}><p className="text-sm"><b>{c.user}</b> {c.text}</p>
    {!child && <button className="text-xs text-mute" onClick={() => setReply(c)}>Reply</button>}
    {(list || []).filter(r => r.parent === c.id).map(r => row(r, true))}</div>);
  return (<div className="absolute inset-x-0 bottom-0 z-20 flex max-h-[70%] flex-col rounded-t-3xl bg-white border border-line p-4" role="dialog" aria-label="Comments">
    <div className="mb-2 flex justify-between"><b>Comments</b><button onClick={onClose} aria-label="Close comments">✕</button></div>
    <div className="flex-1 space-y-3 overflow-y-auto">{list === null && !err && <p className="text-mute">Loading…</p>}
      {list?.length === 0 && <p className="text-mute">No comments yet. Start the conversation.</p>}{top.map(c => row(c))}</div>
    {err && <p role="alert" className="text-sm text-red-600">{err} <button className="underline" onClick={load}>Retry</button></p>}
    {reply && <p className="mt-2 text-xs text-mute">Replying to {reply.user} <button onClick={() => setReply(null)}>✕</button></p>}
    <div className="mt-2 flex gap-2"><input className="inp" value={text} maxLength={500} onChange={e => setText(e.target.value)} placeholder="Add a comment…" aria-label="Comment" /><button className="btn" disabled={busy} onClick={send}>Send</button></div></div>);
}
