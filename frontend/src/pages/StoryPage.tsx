import { useCallback, useEffect, useState } from "react"; import { Link, useParams } from "react-router-dom"; import { api, mediaUrl, ApiError } from "../lib/api"; import ZVideo from "../components/ZVideo"; import type { NodeState, Tree, Video } from "../lib/types";
export default function StoryPage() {
  const { nodeId } = useParams(); const [n, setN] = useState<NodeState | null>(null); const [v, setV] = useState<Video | null>(null); const [tree, setTree] = useState<Tree | null>(null);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [left, setLeft] = useState("");
  const load = useCallback(() => api<NodeState>(`/api/nodes/${nodeId}/`).then(setN).catch(e => setErr(e.message)), [nodeId]);
  useEffect(() => { setN(null); setV(null); setErr(""); load(); }, [load]);
  useEffect(() => { if (!n) return; if (n.video) api<Video>(`/api/videos/${n.video}/`).then(setV).catch(() => setV(null)); api<Tree>(`/api/stories/${n.story}/tree/`).then(setTree).catch(() => {}); }, [n?.node, n?.story]);
  useEffect(() => { if (!n?.open) return; const t = setInterval(load, 5000); return () => clearInterval(t); }, [n?.open, load]); // polling only: no WebSocket yet
  useEffect(() => { if (!n?.closes_at) return setLeft(""); const tick = () => { const s = Math.max(0, Math.floor((new Date(n.closes_at!).getTime() - Date.now()) / 1000));
      setLeft(s ? `${Math.floor(s / 3600)}h ${Math.floor(s % 3600 / 60)}m ${s % 60}s left` : "Voting closed"); }; tick(); const t = setInterval(tick, 1000); return () => clearInterval(t); }, [n?.closes_at]);
  const vote = async (id: number) => { if (busy) return; setBusy(true); setErr(""); try { setN(await api<NodeState>(`/api/nodes/${nodeId}/vote/`, { method: "POST", body: { option: id } })); }
    catch (e) { setErr(e instanceof ApiError ? e.message : "Failed."); load(); } finally { setBusy(false); } };
  if (!n) return <p className={err ? "p-8 text-center text-red-600" : "p-8 text-center text-mute"}>{err || "Loading…"}</p>;
  const voted = n.my_vote !== null; const canVote = n.open && !voted;
  return (<div className="mx-auto max-w-xl space-y-4 p-4"><h1 className="text-2xl font-bold">WHATNEXT</h1>
    {n.video_available && v ? <div className="relative overflow-hidden rounded-2xl bg-gray-100"><ZVideo src={mediaUrl(v.file)} refresh={() => api<Video>(`/api/videos/${v.id}/`).then(x => x.file)} controls playsInline className="max-h-[60dvh] w-full" /></div> : <p className="rounded-2xl bg-white border border-line p-6 text-center text-mute">This video is unavailable.</p>}
    {v && <p className="text-sm text-ink/80">by <Link className="text-zpink" to={`/u/${v.owner}`}>@{v.owner}</Link> — {v.caption}</p>}
    {n.prompt && <p className="text-lg font-semibold">{n.prompt}</p>}<p className="text-sm text-mute">{n.total_votes} votes {left && `· ${left}`}{!n.open && " · Closed"}</p>
    <div className="space-y-2">{n.options.map(o => (<div key={o.id} className="relative overflow-hidden rounded-2xl bg-white border border-line">
      <div className="absolute inset-y-0 left-0 grad opacity-40 transition-all text-white" style={{ width: o.percent + "%" }} />
      <button disabled={!canVote || busy} onClick={() => vote(o.id)} className="relative flex w-full justify-between p-4 text-left disabled:cursor-default">
        <span>{o.label} {n.my_vote === o.id && "✓ your vote"} {n.winner === o.id && "🏆"}</span><span>{o.percent}% · {o.votes}</span></button>
      {o.next_node && (voted || !n.open) && <Link to={`/story/${o.next_node}`} className="relative block px-4 pb-3 text-sm text-zpink">Watch this branch →</Link>}</div>))}</div>
    {err && <p role="alert" className="text-red-600">{err}</p>}{voted && n.open && <p className="text-sm text-mute">Vote recorded. Results refresh every 5 seconds.</p>}
    {tree && <div className="rounded-2xl bg-white border border-line p-4"><h2 className="mb-2 font-semibold">Story map — {tree.title}</h2><ul className="space-y-1 text-sm">{tree.nodes.map(x => (<li key={x.id}>
      <Link className={x.id === n.node ? "font-bold text-zpink" : "text-ink/80"} to={`/story/${x.id}`}>{x.root ? "Start" : `Part #${x.id}`}</Link>
      {x.options.length > 0 && <ul className="ml-4 text-mute">{x.options.map(o => <li key={o.id}>↳ {o.label} {o.next ? <Link className="text-zblue" to={`/story/${o.next}`}>→ part #{o.next}</Link> : "(not published yet)"}</li>)}</ul>}</li>))}</ul></div>}</div>);
}
