import { useEffect, useRef, useState } from "react"; import { Link } from "react-router-dom";
import { api, mediaUrl, ApiError } from "../lib/api"; import type { Video } from "../lib/types"; import ZVideo from "./ZVideo"; import Comments from "./Comments"; import SendVideo from "./SendVideo";
export default function VideoCard({ v: init, active }: { v: Video; active: boolean }) {
  const [v, setV] = useState(init); const ref = useRef<HTMLVideoElement>(null); const [paused, setPaused] = useState(false);
  const [showC, setShowC] = useState(false); const [showS, setShowS] = useState(false); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const sent = useRef(false);
  const report = (completed: boolean) => { const el = ref.current; if (!el || (!completed && el.currentTime < 0.5)) return;
    api(`/api/videos/${v.id}/watch/`, { method: "POST", body: { seconds: el.currentTime, completed } }).catch(() => {}); };
  useEffect(() => { const el = ref.current; if (!el) return;
    if (active) { sent.current = false; el.play().then(() => setPaused(false)).catch(() => setPaused(true)); }
    else { report(false); el.pause(); el.currentTime = 0; } }, [active]);
  const toggle = () => { const el = ref.current!; if (el.paused) { el.play(); setPaused(false); } else { el.pause(); setPaused(true); } };
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };
  const act = async (fn: () => Promise<void>) => { if (busy) return; setBusy(true); try { await fn(); } catch (e) { flash(e instanceof ApiError ? e.message : "Failed."); } finally { setBusy(false); } };
  const like = () => act(async () => { const r = await api<{ likes: number }>(`/api/videos/${v.id}/like/`, { method: v.liked ? "DELETE" : "POST" }); setV({ ...v, liked: !v.liked, like_count: r.likes }); });
  const follow = () => act(async () => { await api(`/api/users/${v.owner}/follow/`, { method: v.owner_following ? "DELETE" : "POST" }); setV({ ...v, owner_following: !v.owner_following }); });
  const share = async () => { const url = `${location.origin}/video/${v.id}`; try { if (navigator.share) await navigator.share({ url }); else { await navigator.clipboard.writeText(url); flash("Link copied"); } } catch { flash("Couldn't share. Link: " + url); } };
  const tags = v.hashtags.split(/[\s,]+/).filter(Boolean);
  const btn = "grid h-12 w-12 place-items-center rounded-full bg-black/40 text-xl backdrop-blur";
  return (<section className="relative h-full w-full bg-black text-white overflow-hidden">
    <ZVideo ref={ref} refresh={() => api<Video>(`/api/videos/${v.id}/`).then(x => x.file)} src={mediaUrl(v.file)} poster={mediaUrl(v.thumbnail)} loop={false} playsInline preload={active ? "auto" : "metadata"}
      className="h-full w-full object-contain md:mx-auto md:max-w-md" onClick={toggle} onEnded={() => { report(true); ref.current!.currentTime = 0; ref.current!.play(); }} />
    {paused && <button onClick={toggle} aria-label="Play" className="absolute inset-0 m-auto h-20 w-20 rounded-full bg-black/50 text-4xl">▶</button>}
    <div className="absolute bottom-20 md:bottom-6 left-4 right-20 space-y-1 drop-shadow">
      <div className="flex items-center gap-2"><Link to={`/u/${v.owner}`} className="flex items-center gap-2 font-bold"><span className="grid h-9 w-9 place-items-center rounded-full grad text-white">{v.owner[0]?.toUpperCase()}</span>@{v.owner}</Link>
        <button onClick={follow} className="btn2 !py-1 text-sm" disabled={busy}>{v.owner_following ? "Following" : "Follow"}</button></div>
      <p className="text-sm">{v.caption}</p><p className="text-sm text-zpink">{tags.map(t => t.startsWith("#") ? t : "#" + t).join(" ")} {v.mood && <span className="ml-1 rounded bg-white/15 px-2 text-white">{v.mood}</span>}</p>
      {v.story_root && <Link to={`/story/${v.story_root}`} className="btn inline-block !py-1 text-sm">WHATNEXT — vote on what happens →</Link>}</div>
    <div className="absolute bottom-24 md:bottom-10 right-3 flex flex-col items-center gap-3 text-xs">
      <button className={btn} onClick={like} aria-pressed={v.liked} aria-label="Like">{v.liked ? "💖" : "🤍"}</button><span>{v.like_count}</span>
      <button className={btn} onClick={() => setShowC(true)} aria-label="Comments">💬</button><span>{v.comment_count}</span>
      <button className={btn} onClick={share} aria-label="Copy link">↗</button>
      <button className={btn} onClick={() => setShowS(true)} aria-label="Send to a friend">✉</button></div>
    {msg && <p role="status" className="absolute top-16 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-sm">{msg}</p>}
    {showS && <SendVideo videoId={v.id} onClose={() => setShowS(false)} />}
    {showC && <Comments videoId={v.id} onClose={() => setShowC(false)} onAdded={() => setV(x => ({ ...x, comment_count: x.comment_count + 1 }))} />}</section>);
}
