import { useCallback, useEffect, useRef, useState } from "react"; import { api } from "../lib/api"; import { FeedPage, MOODS, Video } from "../lib/types"; import VideoCard from "../components/VideoCard";
export default function Zings() {
  const [mood, setMood] = useState(""); const [items, setItems] = useState<Video[]>([]); const [next, setNext] = useState<number | null>(0);
  const [loading, setLoading] = useState(true); const [err, setErr] = useState(""); const [active, setActive] = useState(0); const box = useRef<HTMLDivElement>(null);
  const load = useCallback(async (offset: number, m: string, reset = false) => { setLoading(true); setErr("");
    try { const r = await api<FeedPage<Video>>(`/api/videos/feed/?offset=${offset}${m ? `&mood=${m}` : ""}`);
      setItems(p => reset ? r.results : [...p, ...r.results.filter(x => !p.some(y => y.id === x.id))]); setNext(r.next_offset);
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); } }, []);
  useEffect(() => { setItems([]); setActive(0); setNext(0); box.current?.scrollTo(0, 0); load(0, mood, true); }, [mood, load]);
  useEffect(() => { const root = box.current; if (!root) return;
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i)); }), { root, threshold: 0.7 });
    root.querySelectorAll("[data-i]").forEach(n => io.observe(n)); return () => io.disconnect(); }, [items]);
  useEffect(() => { if (next !== null && !loading && items.length && active >= items.length - 3) load(next, mood); }, [active, items.length, next, loading, mood, load]);
  return (<div className="relative h-dvh bg-black text-white md:h-full">
    <div className="absolute top-0 inset-x-0 z-10 flex gap-2 overflow-x-auto p-3 bg-gradient-to-b from-black/70 to-transparent" role="tablist" aria-label="Moods">
      <button className={mood === "" ? "btn !py-1" : "btn2 !py-1"} onClick={() => setMood("")}>For You</button>
      {MOODS.map(m => <button key={m} className={`${mood === m ? "btn" : "btn2"} !py-1 capitalize whitespace-nowrap`} onClick={() => setMood(m)}>{m}</button>)}</div>
    <div ref={box} className="snap h-full overflow-y-scroll">
      {items.map((v, i) => <div key={v.id} data-i={i} className="h-dvh md:h-full"><VideoCard v={v} active={i === active} /></div>)}
      {loading && <div className="grid h-dvh place-items-center md:h-full"><div className="h-64 w-40 animate-pulse rounded-3xl bg-white/10" aria-label="Loading videos" /></div>}
      {!loading && !err && items.length === 0 && <div className="grid h-dvh place-items-center p-8 text-center text-white/60 md:h-full"><div><p className="text-xl">No videos {mood ? `for “${mood}”` : "yet"}.</p><p>Upload one from Create, or try another mood.</p></div></div>}
      {err && <div className="grid h-dvh place-items-center md:h-full"><div className="text-center"><p role="alert" className="text-red-400">{err}</p><button className="btn mt-3" onClick={() => load(items.length ? (next ?? 0) : 0, mood, !items.length)}>Retry</button></div></div>}
    </div></div>);
}
