import { useEffect, useState } from "react"; import { Link, useSearchParams } from "react-router-dom"; import { Hash, Search } from "lucide-react";
import { api, mediaUrl } from "../lib/api"; import type { SearchResult } from "../lib/types"; import Avatar from "../components/Avatar"; import FollowButton from "../components/FollowButton";
export default function SearchPage() {
  const [sp, setSp] = useSearchParams(); const [q, setQ] = useState(sp.get("q") ?? ""); const [res, setRes] = useState<SearchResult | null>(null); const [loading, setLoading] = useState(false); const [err, setErr] = useState("");
  const [trending, setTrending] = useState<{ tag: string; count: number }[]>([]);
  useEffect(() => { api<{ tag: string; count: number }[]>("/api/trending/hashtags/").then(setTrending).catch(() => {}); }, []);
  useEffect(() => { const x = sp.get("q") ?? ""; setQ(p => (p === x ? p : x)); }, [sp]);
  useEffect(() => { const term = q.replace(/^#/, "").trim(); if (term.length < 2) { setRes(null); setErr(""); if (!q) setSp({}, { replace: true }); return; }
    setLoading(true); const t = setTimeout(() => { setSp({ q }, { replace: true }); api<SearchResult>(`/api/search/?q=${encodeURIComponent(q)}`).then(r => { setRes(r); setErr(""); }).catch(e => setErr(e.message)).finally(() => setLoading(false)); }, 300); return () => clearTimeout(t); }, [q]);
  const empty = res && !res.users.length && !res.videos.length && !res.hashtags.length; const h = "mb-2 text-sm font-semibold text-mute";
  return (<div className="mx-auto max-w-2xl space-y-5 p-4"><div className="relative"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-mute" /><input className="inp !pl-11" placeholder="Search creators, videos, #hashtags" aria-label="Search" autoFocus value={q} onChange={e => setQ(e.target.value)} /></div>
    {err && <p role="alert" className="text-red-600">{err}</p>}{loading && <p className="text-sm text-mute" role="status">Searching…</p>}
    {!res && !loading && <section><h2 className={h}>{trending.length ? "Trending this week" : "Search ZINGO"}</h2>{trending.length === 0 && <p className="text-mute">Type at least 2 characters to find creators, videos and hashtags.</p>}
      <div className="flex flex-wrap gap-2">{trending.map(t => <Link key={t.tag} to={`/search?q=%23${encodeURIComponent(t.tag)}`} className="btn2 flex items-center gap-1 !py-1.5"><Hash size={14} className="text-zpurple" />{t.tag}<span className="text-xs text-mute">{t.count}</span></Link>)}</div></section>}
    {empty && <p className="py-10 text-center text-mute">No results for “{res!.q}”.</p>}
    {res && res.users.length > 0 && <section><h2 className={h}>Accounts</h2><ul className="space-y-2">{res.users.map(u => <li key={u.username} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3"><Link to={`/u/${u.username}`}><Avatar name={u.username} size={44} /></Link>
      <div className="min-w-0 flex-1"><Link to={`/u/${u.username}`} className="block truncate font-semibold">{u.username}</Link><p className="truncate text-xs text-mute">{u.bio || `${u.followers} followers`}</p></div><FollowButton username={u.username} initial={u.is_following} small /></li>)}</ul></section>}
    {res && res.hashtags.length > 0 && <section><h2 className={h}>Hashtags</h2><div className="flex flex-wrap gap-2">{res.hashtags.map(t => <Link key={t.tag} to={`/search?q=%23${encodeURIComponent(t.tag)}`} className="btn2 flex items-center gap-1 !py-1.5"><Hash size={14} className="text-zpurple" />{t.tag}<span className="text-xs text-mute">{t.count}</span></Link>)}</div></section>}
    {res && res.videos.length > 0 && <section><h2 className={h}>Videos</h2><div className="grid grid-cols-3 gap-1.5">{res.videos.map(v => <Link key={v.id} to={`/video/${v.id}`} className="relative aspect-[3/4] overflow-hidden rounded-xl bg-gray-100">
      {v.thumbnail ? <img loading="lazy" src={mediaUrl(v.thumbnail)} alt={v.caption} className="h-full w-full object-cover" /> : <video preload="metadata" src={mediaUrl(v.file) + "#t=0.5"} className="h-full w-full object-cover" />}</Link>)}</div></section>}</div>);
}
