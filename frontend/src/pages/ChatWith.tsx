import { useEffect, useState } from "react"; import { Link, Navigate, useParams } from "react-router-dom"; import { api, ApiError } from "../lib/api";
export default function ChatWith() {
  const { username } = useParams(); const [id, setId] = useState<number | null>(null); const [err, setErr] = useState("");
  useEffect(() => { api<{ id: number }>("/api/conversations/", { method: "POST", body: { username } }).then(r => setId(r.id)).catch(e => setErr(e instanceof ApiError ? e.message : "Failed.")); }, [username]);
  if (id) return <Navigate to={`/chat/${id}`} replace />;
  return err ? <div className="p-8 text-center"><p role="alert" className="text-red-600">{err}</p><Link className="text-zpink" to={`/u/${username}`}>Back to profile</Link></div> : <p className="p-8 text-center text-mute">Opening chat…</p>;
}
