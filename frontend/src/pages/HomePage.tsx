import { useCallback, useEffect, useRef, useState } from "react"; import { Link } from "react-router-dom"; import { ChevronRight, Heart } from "lucide-react"; import { api } from "../lib/api";
import type { CursorPage, FeedPage, Video } from "../lib/types"; import StoryBar from "../components/StoryBar"; import FeedPost from "../components/FeedPost"; import RightRail from "../components/RightRail";
type Tab = "for_you" | "following";
function Feed({ tab }: { tab: Tab }) {
  const [items, setItems] = useState<Video[]>([]); const [next, setNext] = useState<string | number | null>(tab === "for_you" ? 0 : "/api/videos/?following=1"); const [loading, setLoading] = useState(true); const [err, setErr] = useState(""); const sentinel = useRef<HTMLDivElement>(null); const busy = useRef(false);
  const load = useCallback(async (cursor: string | number) => { if (busy.current) return; busy.current = true; setLoading(true); setErr("");
    try { let rows: Video[], nx: string | number | null;
      if (tab === "for_you") { const r = await api<FeedPage<Video>>(`/api/videos/feed/?offset=${cursor}`); rows = r.results; nx = r.next_offset; } else { const r = await api<CursorPage<Video>>(cursor as string); rows = r.results; nx = r.next; }
      setItems(p => [...p, ...rows.filter(x => !p.some(y => y.id === x.id))]); setNext(nx); } catch (e) { setErr((e as Error).message); } finally { busy.current = false; setLoading(false); } }, [tab]);
  useEffect(() => { setItems([]); const first = tab === "for_you" ? 0 : "/api/videos/?following=1"; setNext(first); load(first); }, [tab, load]);
  useEffect(() => { const el = sentinel.current; if (!el) return; const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && next !== null && !busy.current && !err) load(next); }, { rootMargin: "600px" }); io.observe(el); return () => io.disconnect(); }, [next, load, err]);
  return (<div className="space-y-4">{items.map(v => <FeedPost key={v.id} v={v} />)}
    {loading && [1, 2].map(i => <div key={i} className="overflow-hidden rounded-2xl border border-line bg-white"><div className="m-3 h-10 animate-pulse rounded-full bg-gray-100" /><div className="aspect-[4/5] animate-pulse bg-gray-100" /></div>)}
    {err && <div className="rounded-2xl border border-line bg-white p-6 text-center"><p role="alert" className="text-red-600">{err}</p><button className="btn mt-3" onClick={() => next !== null && load(next)}>Retry</button></div>}
    {!loading && !err && items.length === 0 && <div className="rounded-2xl border border-line bg-white p-10 text-center"><p className="text-lg font-semibold">{tab === "following" ? "Nothing here yet" : "No videos yet"}</p>
      <p className="mt-1 text-sm text-mute">{tab === "following" ? "Follow creators and their ZINGS will show up here." : "Be the first to share a ZING."}</p>
      <Link to={tab === "following" ? "/explore" : "/upload"} className="btn mt-4 inline-block">{tab === "following" ? "Explore creators" : "Create a ZING"}</Link></div>}
    {!loading && !err && items.length > 0 && next === null && <p className="py-4 text-center text-sm text-mute">You're all caught up ✨</p>}
    <div ref={sentinel} className="h-1" /></div>);
}
export default function HomePage() {
  const [tab, setTab] = useState<Tab>("for_you");
  const t = (k: Tab, label: string) => <button role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`relative flex-1 py-3 text-sm font-semibold transition ${tab === k ? "text-ink" : "text-mute hover:text-ink"}`}>{label}{tab === k && <span className="absolute inset-x-6 bottom-0 h-0.5 rounded grad" />}</button>;
  return (<div className="min-h-full bg-soft"><div className="mx-auto flex max-w-[1000px] justify-center gap-8 px-3 py-4 md:px-6">
    <div className="w-full max-w-[630px] space-y-4"><StoryBar />
      <Link to="/date" className="flex items-center gap-3 rounded-2xl grad p-4 text-white shadow-sm transition hover:brightness-105"><Heart size={26} fill="currentColor" /><span className="flex-1"><b className="block">ZINGO Date ❤️</b><span className="text-sm text-white/90">Find your vibe. Find your person.</span></span><ChevronRight size={20} /></Link>
      <div role="tablist" aria-label="Feed" className="flex rounded-2xl border border-line bg-white shadow-sm">{t("for_you", "For You")}{t("following", "Following")}</div>
      <Feed key={tab} tab={tab} /></div>
    <div className="hidden w-[320px] shrink-0 xl:block"><RightRail /></div></div></div>);
}
