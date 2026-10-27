import { useEffect, useState } from "react"; import { useParams } from "react-router-dom"; import { api } from "../lib/api"; import type { Video } from "../lib/types"; import VideoCard from "../components/VideoCard";
export default function SingleVideo() { const { id } = useParams(); const [v, setV] = useState<Video | null>(null); const [err, setErr] = useState("");
  useEffect(() => { api<Video>(`/api/videos/${id}/`).then(setV).catch(e => setErr(e.status === 404 ? "This video isn't available." : e.message)); }, [id]);
  if (err) return <p role="alert" className="p-8 text-center text-ink/80">{err}</p>; if (!v) return <p className="p-8 text-center text-mute">Loading…</p>;
  return <div className="h-dvh md:h-full"><VideoCard v={v} active /></div>; }
