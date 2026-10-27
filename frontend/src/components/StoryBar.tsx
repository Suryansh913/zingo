import { useCallback, useEffect, useState } from "react"; import { Link } from "react-router-dom"; import { Plus } from "lucide-react";
import { api } from "../lib/api"; import type { HomeStory } from "../lib/types"; import Avatar from "./Avatar"; import StoryViewer from "./StoryViewer";
export default function StoryBar() {
  const [groups, setGroups] = useState<HomeStory[] | null>(null); const [err, setErr] = useState(""); const [open, setOpen] = useState<number | null>(null);
  const load = useCallback(() => { setErr(""); api<HomeStory[]>("/api/home/stories/").then(setGroups).catch(e => { setErr(e.message); setGroups([]); }); }, []);
  useEffect(load, [load]);
  const onSeen = useCallback((u: string, id: number) => setGroups(gs => gs && gs.map(g => { if (g.username !== u) return g; const videos = g.videos.map(x => x.id === id ? { ...x, seen: true } : x); return { ...g, videos, seen: videos.every(x => x.seen) }; })), []);
  const me = groups?.find(g => g.is_me); const ordered = groups ?? []; const item = "flex w-[76px] shrink-0 flex-col items-center gap-1";
  return (<section aria-label="Stories" className="rounded-2xl border border-line bg-white p-3 shadow-sm"><div className="no-scrollbar flex gap-3 overflow-x-auto">
    {groups === null && [1, 2, 3, 4, 5].map(i => <div key={i} className={item}><div className="h-[68px] w-[68px] animate-pulse rounded-full bg-gray-200" /><div className="h-2 w-12 animate-pulse rounded bg-gray-200" /></div>)}
    {groups && <div className={item}>
      <div className="relative">{me ? <button onClick={() => setOpen(0)} aria-label="View your story"><Avatar name="you" size={60} ring seen={me.seen} /></button> : <Link to="/upload" aria-label="Add to your story"><Avatar name="you" size={60} ring seen /></Link>}
        <Link to="/upload" aria-label="Create a new ZING" className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full border-2 border-white grad text-white"><Plus size={14} strokeWidth={3} /></Link></div>
      <span className="text-xs text-mute">Your story</span></div>}
    {ordered.map((g, idx) => g.is_me ? null : <button key={g.username} onClick={() => setOpen(idx)} className={item} aria-label={`View ${g.username}'s story`}><Avatar name={g.username} size={60} ring seen={g.seen} /><span className="w-full truncate text-xs text-ink/80">{g.username}</span></button>)}
    {groups && groups.filter(g => !g.is_me).length === 0 && !err && <p className="self-center pl-2 text-sm text-mute">Follow creators to see their new ZINGS from the last 24 hours here.</p>}
    {err && <p role="alert" className="self-center pl-2 text-sm text-red-600">{err} <button className="underline" onClick={load}>Retry</button></p>}</div>
    {open !== null && ordered.length > 0 && <StoryViewer groups={ordered} start={open} onClose={() => setOpen(null)} onSeen={onSeen} />}</section>);
}
