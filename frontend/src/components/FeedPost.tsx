import { useEffect, useRef, useState } from "react"; import { Link } from "react-router-dom"; import { GitBranch, Heart, Link2, MessageCircle, Play, Send, Volume2, VolumeX } from "lucide-react";
import { api, mediaUrl, ApiError } from "../lib/api"; import { useAuth } from "../lib/auth"; import type { Video } from "../lib/types"; import { ago } from "../lib/time";
import ZVideo from "./ZVideo"; import Avatar from "./Avatar"; import Comments from "./Comments"; import SendVideo from "./SendVideo"; import Sheet from "./Sheet"; import FollowButton from "./FollowButton";
/** Instagram-style feed card for a ZINGS video. Autoplays muted while >=60% visible; all actions hit the real API (no optimistic fakes). */
export default function FeedPost({ v: init }: { v: Video }) {
  const { user } = useAuth(); const [v, setV] = useState(init); const [muted, setMuted] = useState(true); const [playing, setPlaying] = useState(false);
  const [showC, setShowC] = useState(false); const [showS, setShowS] = useState(false); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false); const ref = useRef<HTMLVideoElement>(null); const done = useRef(false);
  const report = (completed: boolean) => { const el = ref.current; if (!el || el.currentTime < 1) return; api(`/api/videos/${v.id}/watch/`, { method: "POST", body: { seconds: el.currentTime, completed } }).catch(() => {}); };
  useEffect(() => { const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.intersectionRatio >= 0.6) el.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); else { if (!el.paused) report(false); el.pause(); setPlaying(false); } }, { threshold: [0, 0.6, 1] });
    io.observe(el); return () => io.disconnect(); }, [v.id]);
  const toggle = () => { const el = ref.current!; if (el.paused) { el.play(); setPlaying(true); } else { el.pause(); setPlaying(false); } };
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };
  const like = async () => { if (busy) return; setBusy(true); try { const r = await api<{ likes: number }>(`/api/videos/${v.id}/like/`, { method: v.liked ? "DELETE" : "POST" }); setV({ ...v, liked: !v.liked, like_count: r.likes }); } catch (e) { flash(e instanceof ApiError ? e.message : "Failed"); } finally { setBusy(false); } };
  const copy = async () => { const url = `${location.origin}/video/${v.id}`; try { if (navigator.share) await navigator.share({ url }); else { await navigator.clipboard.writeText(url); flash("Link copied"); } } catch { flash(url); } };
  const tags = v.hashtags.split(/[\s,]+/).map(t => t.replace(/^#/, "")).filter(Boolean); const mine = user?.username === v.owner;
  const ic = "grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-gray-100 active:scale-90";
  return (<article className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
    <header className="flex items-center gap-3 p-3"><Link to={`/u/${v.owner}`} aria-label={`${v.owner}'s profile`}><Avatar name={v.owner} size={38} /></Link>
      <div className="min-w-0 flex-1 leading-tight"><Link to={`/u/${v.owner}`} className="block truncate text-sm font-semibold">{v.owner}</Link><span className="text-xs text-mute">{ago(v.created)}{v.mood && ` · ${v.mood}`}</span></div>
      {!mine && !v.owner_following && <FollowButton username={v.owner} small />}</header>
    <div className="relative aspect-[4/5] bg-gray-100"><ZVideo ref={ref} refresh={() => api<Video>(`/api/videos/${v.id}/`).then(x => x.file)} src={mediaUrl(v.file)} poster={mediaUrl(v.thumbnail)} muted={muted} loop playsInline preload="metadata" onClick={toggle} className="h-full w-full cursor-pointer object-cover"
      onTimeUpdate={e => { const t = e.currentTarget; if (!done.current && t.duration && t.currentTime / t.duration > 0.9) { done.current = true; report(true); } }} />
      {!playing && <button onClick={toggle} aria-label="Play" className="absolute inset-0 m-auto grid h-16 w-16 place-items-center rounded-full bg-white/80 text-ink shadow"><Play size={28} fill="currentColor" /></button>}
      <button onClick={() => setMuted(!muted)} aria-label={muted ? "Unmute" : "Mute"} className="absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white">{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button></div>
    <div className="space-y-1.5 p-3"><div className="-ml-1 flex items-center gap-1">
      <button className={ic} onClick={like} aria-pressed={v.liked} aria-label={v.liked ? "Unlike" : "Like"}><Heart size={24} className={v.liked ? "fill-zpink text-zpink" : ""} /></button>
      <button className={ic} onClick={() => setShowC(true)} aria-label="Comments"><MessageCircle size={24} /></button>
      <button className={ic} onClick={() => setShowS(true)} aria-label="Send to a friend"><Send size={22} /></button>
      <button className={`${ic} ml-auto`} onClick={copy} aria-label="Copy link"><Link2 size={22} /></button></div>
      <p className="text-sm font-semibold">{v.like_count} {v.like_count === 1 ? "like" : "likes"}</p>
      {(v.caption || tags.length > 0) && <p className="text-sm"><Link to={`/u/${v.owner}`} className="mr-1 font-semibold">{v.owner}</Link>{v.caption} {tags.map(t => <Link key={t} to={`/search?q=%23${encodeURIComponent(t)}`} className="text-zpurple">#{t} </Link>)}</p>}
      {v.story_root && <Link to={`/story/${v.story_root}`} className="inline-flex items-center gap-1.5 rounded-full grad px-3 py-1 text-xs font-semibold text-white"><GitBranch size={14} />ZINGO WHATNEXT — vote what happens next</Link>}
      <button onClick={() => setShowC(true)} className="block text-sm text-mute">{v.comment_count > 0 ? `View all ${v.comment_count} comments` : "Add a comment"}</button>
      {msg && <p role="status" className="text-xs text-mute">{msg}</p>}</div>
    {showC && <Sheet onClose={() => setShowC(false)}><Comments videoId={v.id} onClose={() => setShowC(false)} onAdded={() => setV(x => ({ ...x, comment_count: x.comment_count + 1 }))} /></Sheet>}
    {showS && <Sheet onClose={() => setShowS(false)}><SendVideo videoId={v.id} onClose={() => setShowS(false)} /></Sheet>}</article>);
}
