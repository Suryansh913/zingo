import { useEffect, useState } from "react"; import { Link } from "react-router-dom"; import { GitBranch } from "lucide-react"; import { api, mediaUrl } from "../lib/api"; import type { StoryCard } from "../lib/types"; import { ago } from "../lib/time";
export default function WhatNextPage() {
  const [items, setItems] = useState<StoryCard[] | null>(null); const [err, setErr] = useState(""); const load = () => { setErr(""); api<StoryCard[]>("/api/stories/").then(setItems).catch(e => { setErr(e.message); setItems([]); }); }; useEffect(load, []);
  return (<div className="mx-auto max-w-3xl p-4"><div className="mb-4 flex items-center justify-between"><div><h1 className="text-2xl font-bold">ZINGO WHATNEXT</h1><p className="text-sm text-mute">Interactive stories — you decide what happens next.</p></div><Link to="/upload" className="btn">Create</Link></div>
    {items === null && <div className="grid gap-3 sm:grid-cols-2">{[1, 2, 3, 4].map(i => <div key={i} className="h-64 animate-pulse rounded-2xl bg-gray-100" />)}</div>}
    {err && <p role="alert" className="text-red-600">{err} <button className="underline" onClick={load}>Retry</button></p>}
    {items?.length === 0 && !err && <p className="py-16 text-center text-mute">No interactive stories yet. Tick “Make it a WHATNEXT interactive story” when you create a ZING.</p>}
    <div className="grid gap-3 sm:grid-cols-2">{items?.map(s => <Link key={s.story} to={`/story/${s.node}`} className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition hover:shadow-md">
      <div className="relative aspect-[4/3] bg-gray-100">{s.video.thumbnail ? <img loading="lazy" src={mediaUrl(s.video.thumbnail)} alt="" className="h-full w-full object-cover" /> : <video preload="metadata" src={mediaUrl(s.video.file) + "#t=0.5"} className="h-full w-full object-cover" />}
        <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-semibold ${s.open ? "bg-green-100 text-green-700" : "bg-gray-200 text-ink/80"}`}>{s.open ? "Voting open" : "Closed"}</span></div>
      <div className="p-3"><p className="flex items-center gap-1.5 font-semibold"><GitBranch size={16} className="text-zpurple" />{s.title || s.prompt || "Untitled story"}</p><p className="text-xs text-mute">@{s.owner} · {s.total_votes} votes · {ago(s.created)}</p></div></Link>)}</div></div>);
}
