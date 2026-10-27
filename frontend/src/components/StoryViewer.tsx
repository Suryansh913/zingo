import { useEffect, useRef, useState, useCallback } from "react"; import { Link } from "react-router-dom"; import { X } from "lucide-react";
import { api, mediaUrl } from "../lib/api"; import type { HomeStory } from "../lib/types"; import ZVideo from "./ZVideo"; import Avatar from "./Avatar"; import { ago } from "../lib/time";
/** Full-screen story player (24 h ZINGS). Tap/arrow keys to move, Esc to close. Marks each video watched via the real watch-history API. */
export default function StoryViewer({ groups, start, onClose, onSeen }: { groups: HomeStory[]; start: number; onClose: () => void; onSeen: (username: string, videoId: number) => void }) {
  const [g, setG] = useState(start); const [i, setI] = useState(0); const [prog, setProg] = useState(0); const ref = useRef<HTMLVideoElement>(null);
  const grp = groups[g]; const v = grp.videos[i];
  const markSeen = useCallback(() => { api(`/api/videos/${v.id}/watch/`, { method: "POST", body: { seconds: ref.current?.currentTime ?? 0, completed: true } }).catch(() => {}); onSeen(grp.username, v.id); }, [v.id, grp.username, onSeen]);
  const next = useCallback(() => { markSeen(); setProg(0); if (i < grp.videos.length - 1) setI(i + 1); else if (g < groups.length - 1) { setG(g + 1); setI(0); } else onClose(); }, [markSeen, i, g, grp.videos.length, groups.length, onClose]);
  const prev = useCallback(() => { setProg(0); if (i > 0) setI(i - 1); else if (g > 0) { setG(g - 1); setI(0); } }, [i, g]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); else if (e.key === "ArrowRight") next(); else if (e.key === "ArrowLeft") prev(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [next, prev, onClose]);
  useEffect(() => { const el = ref.current; if (el) el.play().catch(() => { el.muted = true; el.play().catch(() => {}); }); }, [v.id]);
  return (<div className="fixed inset-0 z-50 bg-black text-white" role="dialog" aria-label={`${grp.username}'s story`}><div className="relative mx-auto h-full max-w-md">
    <ZVideo key={v.id} ref={ref} refresh={() => api<{ file: string }>(`/api/videos/${v.id}/`).then(x => x.file)} src={mediaUrl(v.file)} poster={mediaUrl(v.thumbnail)} playsInline autoPlay className="h-full w-full object-contain"
      onTimeUpdate={e => setProg(e.currentTarget.currentTime / (e.currentTarget.duration || 1))} onEnded={next} />
    <div className="absolute inset-x-0 top-0 space-y-2 bg-gradient-to-b from-black/60 to-transparent p-3">
      <div className="flex gap-1">{grp.videos.map((x, idx) => <span key={x.id} className="h-0.5 flex-1 overflow-hidden rounded bg-white/30"><span className="block h-full bg-white" style={{ width: idx < i ? "100%" : idx === i ? prog * 100 + "%" : "0%" }} /></span>)}</div>
      <div className="flex items-center gap-2 text-sm"><Avatar name={grp.username} size={32} /><Link to={`/u/${grp.username}`} className="font-semibold" onClick={onClose}>{grp.is_me ? "Your story" : grp.username}</Link><span className="text-white/70">{ago(v.created)}</span>
        <button onClick={onClose} aria-label="Close" className="ml-auto"><X size={24} /></button></div></div>
    <button aria-label="Previous" onClick={prev} className="absolute inset-y-16 left-0 w-1/3" /><button aria-label="Next" onClick={next} className="absolute inset-y-16 right-0 w-1/3" />
    {v.caption && <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-sm">{v.caption}</p>}</div></div>);
}
