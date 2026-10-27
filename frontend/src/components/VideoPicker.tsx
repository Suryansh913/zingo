import { useEffect, useState } from "react"; import { api, mediaUrl } from "../lib/api"; import { useAuth } from "../lib/auth"; import type { CursorPage, Video } from "../lib/types";
export default function VideoPicker({ value, onChange }: { value: number | null; onChange: (id: number) => void }) {
  const { user } = useAuth(); const [vids, setVids] = useState<Video[] | null>(null); const [next, setNext] = useState<string | null>(null); const [err, setErr] = useState("");
  const load = (url: string) => api<CursorPage<Video>>(url).then(r => { setVids(p => [...(p || []), ...r.results.filter(v => v.visibility === "public")]); setNext(r.next); }).catch(e => setErr(e.message));
  useEffect(() => { if (user) load(`/api/videos/?owner=${user.username}`); }, [user?.username]);
  if (err) return <p role="alert" className="text-red-600">{err}</p>; if (!vids) return <p className="text-mute">Loading your videos…</p>;
  if (!vids.length) return <p className="text-mute">You need a public video first. Upload one from Create.</p>;
  return (<div><div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Choose your video">{vids.map(v => (
    <button type="button" key={v.id} role="radio" aria-checked={value === v.id} onClick={() => onChange(v.id)} className={`aspect-[9/16] overflow-hidden rounded-lg bg-white border border-line ${value === v.id ? "ring-4 ring-zpink" : ""}`}>
      {v.thumbnail ? <img src={mediaUrl(v.thumbnail)} alt={v.caption} className="h-full w-full object-cover" /> : <video src={mediaUrl(v.file) + "#t=0.5"} preload="metadata" className="h-full w-full object-cover" />}</button>))}</div>
    {next && <button type="button" className="btn2 mt-2" onClick={() => load(next)}>Load more</button>}</div>);
}
