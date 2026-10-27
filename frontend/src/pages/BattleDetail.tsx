import { useCallback, useEffect, useState } from "react"; import { Link, useNavigate, useParams } from "react-router-dom"; import { api, mediaUrl, ApiError } from "../lib/api";
import ZVideo from "../components/ZVideo"; import type { BEntry, Battle } from "../lib/types"; import { useCountdown } from "../lib/useCountdown"; import VideoPicker from "../components/VideoPicker";
export default function BattleDetail() {
  const { id } = useParams(); const nav = useNavigate(); const [b, setB] = useState<Battle | null>(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [video, setVideo] = useState<number | null>(null);
  const load = useCallback(() => api<Battle>(`/api/battles/${id}/`).then(x => { setB(x); setErr(""); }).catch(e => setErr(e.status === 404 ? "This battle isn't available." : e.message)), [id]);
  useEffect(() => { setB(null); load(); }, [load]);
  const live = b && ["open", "pending", "active"].includes(b.status);
  useEffect(() => { if (!live) return; const t = setInterval(load, 10000); return () => clearInterval(t); }, [live, load]);  // polling; no WebSocket yet
  const cd = useCountdown(b ? (b.status === "active" ? b.ends_at : live ? b.challenge_expires_at : null) : null);
  useEffect(() => { if (cd.done && live) load(); }, [cd.done]);
  const act = async (path: string, body?: any, goto?: boolean) => { setBusy(true); setErr("");
    try { const r = await api<Battle>(`/api/battles/${id}/${path}/`, { method: "POST", body }); if (goto) nav(`/battle/${r.id}`); else setB(r); }
    catch (e) { setErr(e instanceof ApiError ? e.message : "Failed."); load(); } finally { setBusy(false); } };
  if (!b) return <p className={err ? "p-8 text-center text-ink/80" : "p-8 text-center text-mute"} role={err ? "alert" : undefined}>{err || "Loading…"}</p>;
  const v = b.viewer; const finished = b.status === "finished";
  const names = b.revealed ? <>@<Link className="text-zpink" to={`/u/${b.creator}`}>{b.creator}</Link> vs {b.opponent ? <>@<Link className="text-zpink" to={`/u/${b.opponent}`}>{b.opponent}</Link></> : "open slot"}</> : "Creators are hidden until voting ends";
  const renderEntry = (e: BEntry) => (<div key={e.id} className={`rounded-2xl bg-white border border-line p-3 ${b.winner_entry === e.id ? "ring-4 ring-zpink" : ""}`}>
    <div className="mb-2 flex justify-between text-sm"><b>Entry {e.label} {b.winner_entry === e.id && "🏆"}</b>{e.is_mine && <span className="text-zpink">yours</span>}</div>
    {e.available && e.video ? <div className="relative overflow-hidden rounded-xl bg-gray-100"><ZVideo src={mediaUrl(e.video.file)} refresh={() => api<Battle>(`/api/battles/${id}/`).then(b => b.entries.find(x => x.id === e.id)?.video?.file)} poster={mediaUrl(e.video.thumbnail)} controls playsInline preload="metadata" className="max-h-[55dvh] w-full" /></div> : <div className="grid h-48 place-items-center rounded-xl bg-soft text-mute">Video unavailable</div>}
    {e.user && <p className="mt-2 text-sm">by <Link className="text-zpink" to={`/u/${e.user}`}>@{e.user}</Link>{e.video?.id && <> · <Link className="text-zblue" to={`/video/${e.video.id}`}>view video</Link></>}</p>}
    {e.video?.caption && <p className="text-sm text-ink/80">{e.video.caption}</p>}
    {e.percent !== null && <div className="mt-2"><div className="h-3 overflow-hidden rounded-full bg-soft"><div className="h-full grad transition-all text-white" style={{ width: e.percent + "%" }} /></div><p className="text-sm">{e.votes} votes · {e.percent}%</p></div>}
    {v.can_vote && <button className="btn mt-2 w-full" disabled={busy} onClick={() => act("vote", { entry: e.id })}>Vote {e.label}</button>}
    {b.my_vote === e.id && <p className="mt-2 text-sm text-green-600">✓ Your vote</p>}</div>);
  const banner = finished ? (b.result === "tie" ? "🤝 It's a tie — no winner." : b.result === "void" ? "Battle voided: both videos became unavailable." : b.result === "forfeit" ? `🏆 @${b.winner ?? "winner"} wins by forfeit.` : `🏆 @${b.winner} wins!`)
    : ({ declined: "This challenge was declined.", cancelled: "This challenge was cancelled.", expired: "This challenge expired." } as Record<string, string>)[b.status];
  return (<div className="mx-auto max-w-4xl space-y-4 p-4"><div><h1 className="text-2xl font-bold">{b.title || "Battle"} {b.blind && <span className="text-base text-zpink">🕶 blind</span>}</h1><p className="text-sm text-ink/80">{names}</p></div>
    {banner && <p className="rounded-2xl grad p-4 text-center text-lg font-bold text-white" role="status">{banner}</p>}
    {live && cd.text && <p className="text-sm text-ink/80" role="timer">{b.status === "active" ? "Voting ends in " : "Challenge expires in "}<b>{cd.text}</b> · {b.total_votes} votes</p>}
    {b.status === "active" && b.counts_hidden && <p className="text-xs text-mute">Vote counts are revealed when voting closes.</p>}
    {b.status === "active" && !v.is_participant && !v.can_vote && b.my_vote === null && <p className="text-sm text-mute">You can't vote in this battle.</p>}
    <div className="grid gap-4 md:grid-cols-2">{b.entries.map(renderEntry)}
      {b.entries.length < 2 && <div className="grid min-h-48 place-items-center rounded-2xl border-2 border-dashed border-line p-6 text-center text-mute">Waiting for an opponent…</div>}</div>
    {err && <p role="alert" className="text-red-600">{err}</p>}
    {v.can_accept && <div className="space-y-2 rounded-2xl bg-white border border-line p-4"><h2 className="font-semibold">{b.status === "pending" ? "You've been challenged!" : "Join this challenge"}</h2><p className="text-sm text-mute">Choose your video. Voting runs for {b.voting_hours}h once you accept.</p>
      <VideoPicker value={video} onChange={setVideo} /><div className="flex gap-2"><button className="btn" disabled={busy || !video} onClick={() => act("accept", { video })}>Accept</button>{v.can_decline && <button className="btn2" disabled={busy} onClick={() => act("decline")}>Decline</button>}</div></div>}
    {v.can_rematch && <div className="space-y-2 rounded-2xl bg-white border border-line p-4"><h2 className="font-semibold">Rematch</h2><VideoPicker value={video} onChange={setVideo} />
      <button className="btn" disabled={busy || !video} onClick={() => act("rematch", { video }, true)}>Challenge to a rematch</button></div>}
    {v.can_withdraw && <button className="btn2" disabled={busy} onClick={() => { if (confirm(b.status === "active" ? "Withdrawing forfeits the battle. Continue?" : "Cancel this challenge?")) act("withdraw"); }}>{b.status === "active" ? "Withdraw (forfeit)" : "Cancel challenge"}</button>}
    {b.rematch_of && <p className="text-sm"><Link className="text-zblue" to={`/battle/${b.rematch_of}`}>← Original battle</Link></p>}</div>);
}
