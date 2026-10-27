import { useEffect, useState } from "react"; import { Link } from "react-router-dom"; import { Heart } from "lucide-react"; import { api, mediaUrl } from "../lib/api"; import type { Video } from "../lib/types";
export default function ExplorePage() {
  const [items, setItems] = useState<Video[] | null>(null); const [err, setErr] = useState(""); const load = () => { setErr(""); api<Video[]>("/api/videos/explore/").then(setItems).catch(e => { setErr(e.message); setItems([]); }); }; useEffect(load, []);
  return (<div className="mx-auto max-w-4xl p-4"><h1 className="mb-1 text-2xl font-bold">Explore</h1><p className="mb-4 text-sm text-mute">The most-loved ZINGS from the last 30 days.</p>
    {items === null && <div className="grid grid-cols-3 gap-1.5 md:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-gray-100" />)}</div>}
    {err && <p role="alert" className="text-red-600">{err} <button className="underline" onClick={load}>Retry</button></p>}
    {items?.length === 0 && !err && <p className="py-16 text-center text-mute">Nothing to explore yet. Videos posted in the last 30 days will appear here.</p>}
    <div className="grid grid-cols-3 gap-1.5 md:grid-cols-4">{items?.map(v => <Link key={v.id} to={`/video/${v.id}`} className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-gray-100">
      {v.thumbnail ? <img loading="lazy" src={mediaUrl(v.thumbnail)} alt={v.caption} className="h-full w-full object-cover" /> : <video preload="metadata" src={mediaUrl(v.file) + "#t=0.5"} className="h-full w-full object-cover" />}
      <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 text-xs font-semibold text-white"><Heart size={14} fill="currentColor" />{v.like_count}<span className="ml-auto truncate font-normal">@{v.owner}</span></span></Link>)}</div></div>);
}
