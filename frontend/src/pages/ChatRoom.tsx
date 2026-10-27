import { useCallback, useEffect, useRef, useState } from "react"; import { Link, useNavigate, useParams } from "react-router-dom"; import { api, mediaUrl, ApiError } from "../lib/api";
import type { ChatMsg, ConvDetail, CursorPage } from "../lib/types"; import { useRealtime } from "../lib/realtime"; import { clock, uid } from "../lib/time";
const order = (a: ChatMsg, b: ChatMsg) => (a.id > 0 ? a.id : Infinity) - (b.id > 0 ? b.id : Infinity);
function merge(list: ChatMsg[], m: ChatMsg): ChatMsg[] {  // dedupe by id or client_id (reconnect/echo/REST can all deliver the same message)
  const i = list.findIndex(x => x.id === m.id || (m.client_id && x.client_id === m.client_id));
  const out = i >= 0 ? list.map((x, j) => j === i ? { ...m, status: undefined } : x) : [...list, m]; return out.sort(order);
}
export default function ChatRoom() {
  const { id } = useParams(); const cid = Number(id); const nav = useNavigate(); const { send, subscribe, status, refreshCounts } = useRealtime();
  const [conv, setConv] = useState<ConvDetail | null>(null); const [msgs, setMsgs] = useState<ChatMsg[]>([]); const [older, setOlder] = useState<string | null>(null);
  const [err, setErr] = useState(""); const [loading, setLoading] = useState(true); const [text, setText] = useState(""); const [menu, setMenu] = useState(false);
  const bottom = useRef<HTMLDivElement>(null); const timers = useRef<Record<string, number>>({});
  const markRead = useCallback(() => { api(`/api/conversations/${cid}/read/`, { method: "POST" }).then(refreshCounts).catch(() => {}); }, [cid, refreshCounts]);
  const loadDetail = useCallback(() => api<ConvDetail>(`/api/conversations/${cid}/`).then(setConv), [cid]);
  const loadLatest = useCallback(async () => { try { const [d, p] = await Promise.all([loadDetail(), api<CursorPage<ChatMsg>>(`/api/conversations/${cid}/messages/`)]);
      setMsgs(cur => { let out = cur.filter(m => m.status); for (const m of [...cur.filter(m => !m.status), ...p.results.slice().reverse()]) out = merge(out, m); return out; });
      setOlder(o => o ?? p.next); setErr(""); markRead(); } catch (e) { setErr(e instanceof ApiError && e.status === 404 ? "This conversation isn't available." : (e as Error).message); } finally { setLoading(false); } }, [cid, loadDetail, markRead]);
  useEffect(() => { setLoading(true); setMsgs([]); setOlder(null); loadLatest(); }, [cid]);
  useEffect(() => subscribe(e => {
    if (e.type === "open") loadLatest();      // after a reconnect, refetch anything missed
    else if (e.type === "message" && e.message.conversation === cid) { setMsgs(c => merge(c, e.message)); markRead(); loadDetail().catch(() => {}); }
    else if (e.type === "error" && e.client_id) { window.clearTimeout(timers.current[e.client_id]); setMsgs(c => c.map(m => m.client_id === e.client_id ? { ...m, status: "failed", error: e.detail } : m)); }
  }), [subscribe, cid, loadLatest, markRead, loadDetail]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [msgs.length]);
  const viaRest = async (m: ChatMsg) => { try { const r = await api<ChatMsg>(`/api/conversations/${cid}/messages/`, { method: "POST", body: { text: m.text, client_id: m.client_id } }); setMsgs(c => merge(c, r)); }
    catch (e) { setMsgs(c => c.map(x => x.client_id === m.client_id ? { ...x, status: "failed", error: e instanceof ApiError ? e.message : "Couldn't send." } : x)); } };
  const deliver = (m: ChatMsg) => { setMsgs(c => merge(c, m));
    if (send({ type: "send", conversation: cid, text: m.text, client_id: m.client_id })) {
      timers.current[m.client_id] = window.setTimeout(() => viaRest(m), 6000);   // no echo in 6s -> REST fallback (same client_id => server dedupes)
    } else viaRest(m); };
  useEffect(() => subscribe(e => { if (e.type === "message" && e.message.client_id) window.clearTimeout(timers.current[e.message.client_id]); }), [subscribe]);
  const submit = () => { const t = text.trim(); if (!t || !conv?.can_message) return; setText(""); deliver({ id: -Date.now(), conversation: cid, sender: "me", kind: "text", text: t, created: new Date().toISOString(), client_id: uid(), video: null, status: "sending" }); };
  const retry = (m: ChatMsg) => { setMsgs(c => c.map(x => x.client_id === m.client_id ? { ...x, status: "sending", error: undefined } : x)); viaRest(m); };
  const loadOlder = async () => { if (!older) return; const p = await api<CursorPage<ChatMsg>>(older); setMsgs(c => p.results.reduce(merge, c)); setOlder(p.next); };
  const block = async () => { if (!conv || !confirm(`Block @${conv.other.username}? You won't be able to message each other.`)) return; try { await api(`/api/users/${conv.other.username}/block/`, { method: "POST" }); refreshCounts(); nav("/chat"); } catch (e) { setErr((e as Error).message); } };
  const report = async (body: object, label: string) => { const reason = prompt(`Why are you reporting ${label}?`); if (!reason) return; try { await api("/api/report/", { method: "POST", body: { ...body, reason } }); alert("Report sent. Thank you."); } catch (e) { alert((e as Error).message); } };
  if (loading) return <p className="p-8 text-center text-mute">Loading…</p>;
  if (err && !conv) return <div className="p-8 text-center"><p role="alert" className="text-ink/80">{err}</p><Link className="text-zpink" to="/chat">Back to chat</Link></div>;
  const mine = conv ? msgs.filter(m => m.sender !== conv.other.username && m.id > 0) : []; const lastSeen = mine.filter(m => m.id <= (conv?.other_last_read_id ?? 0)).pop()?.id;
  return (<div className="mx-auto flex h-[calc(100dvh-4rem)] max-w-xl flex-col md:h-dvh">
    <header className="flex items-center gap-3 border-b border-line p-3"><Link to="/chat" aria-label="Back" className="text-xl">←</Link>
      <Link to={`/u/${conv!.other.username}`} className="flex flex-1 items-center gap-2 font-bold"><span className="grid h-9 w-9 place-items-center rounded-full grad text-white">{conv!.other.username[0].toUpperCase()}</span>@{conv!.other.username}</Link>
      <div className="relative"><button className="btn2 !px-3" aria-label="More" onClick={() => setMenu(!menu)}>⋯</button>{menu && <div className="absolute right-0 z-10 w-44 rounded-xl bg-white border border-line p-1 shadow-xl">
        <button className="block w-full rounded-lg p-2 text-left hover:bg-gray-100" onClick={() => { setMenu(false); report({ user: conv!.other.id }, "this user"); }}>Report user</button>
        <button className="block w-full rounded-lg p-2 text-left text-red-600 hover:bg-gray-100" onClick={() => { setMenu(false); block(); }}>Block user</button></div>}</div></header>
    {status !== "open" && <p className="bg-soft px-3 py-1 text-center text-xs text-mute" role="status">{status === "reconnecting" || status === "connecting" ? "Reconnecting… messages still send over the standard connection." : "Live updates off — messages still send."}</p>}
    <div className="flex-1 space-y-2 overflow-y-auto p-3">
      {older && <button className="btn2 mx-auto block !py-1 text-sm" onClick={loadOlder}>Load older messages</button>}
      {msgs.length === 0 && <p className="py-12 text-center text-mute">No messages yet. Say hi 👋</p>}
      {msgs.map(m => { const me = m.sender !== conv!.other.username; return (<div key={m.client_id || m.id} className={`flex ${me ? "justify-end" : "justify-start"}`}><div className="group max-w-[80%]">
        <div className={`rounded-2xl px-3 py-2 ${me ? "grad rounded-br-sm" : "bg-white border border-line rounded-bl-sm"} ${m.status === "failed" ? "opacity-60" : ""} text-white`}>
          {m.video && ("unavailable" in m.video ? <p className="text-sm italic text-ink/80">🎬 Video unavailable</p> :
            <Link to={`/video/${m.video.id}`} className="block w-44 overflow-hidden rounded-xl bg-soft">
              {m.video.thumbnail ? <img src={mediaUrl(m.video.thumbnail)} alt="" className="aspect-[9/16] w-full object-cover" /> : <video src={mediaUrl(m.video.file) + "#t=0.5"} preload="metadata" className="aspect-[9/16] w-full object-cover" />}
              <p className="p-2 text-xs">🎬 @{m.video.owner}{m.video.caption && ` — ${m.video.caption}`}</p></Link>)}
          {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}</div>
        <p className={`mt-0.5 flex items-center gap-2 text-[11px] text-mute ${me ? "justify-end" : ""}`}>{m.status === "sending" ? "Sending…" : clock(m.created)}{me && m.id === lastSeen && <span>· Seen</span>}
          {!me && m.id > 0 && <button className="hidden group-hover:inline" aria-label="Report message" onClick={() => report({ message: m.id }, "this message")}>⚑</button>}</p>
        {m.status === "failed" && <p role="alert" className="text-right text-xs text-red-600">{m.error || "Not delivered."} <button className="underline" onClick={() => retry(m)}>Retry</button></p>}</div></div>); })}
      <div ref={bottom} /></div>
    {conv && !conv.can_message ? <p className="border-t border-line p-3 text-center text-sm text-mute" role="status">{conv.reason}</p> :
      <form className="flex gap-2 border-t border-line p-3" onSubmit={e => { e.preventDefault(); submit(); }}>
        <input className="inp" value={text} maxLength={1000} onChange={e => setText(e.target.value)} placeholder="Message…" aria-label="Message" /><button className="btn" disabled={!text.trim()}>Send</button></form>}</div>);
}
