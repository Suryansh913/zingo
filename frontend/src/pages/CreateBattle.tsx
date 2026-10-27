import { useState, FormEvent } from "react"; import { useNavigate } from "react-router-dom"; import { api, ApiError } from "../lib/api"; import VideoPicker from "../components/VideoPicker"; import type { Battle } from "../lib/types";
export default function CreateBattle() {
  const nav = useNavigate(); const [video, setVideo] = useState<number | null>(null); const [f, setF] = useState({ title: "", opponent: "", blind: false, voting_hours: "24" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => { e.preventDefault(); if (!video) return setErr("Pick one of your videos."); setBusy(true); setErr("");
    try { const b = await api<Battle>("/api/battles/", { method: "POST", body: { video, title: f.title, opponent: f.opponent.trim().replace(/^@/, "") || null, blind: f.blind, voting_hours: Number(f.voting_hours) } }); nav(`/battle/${b.id}`);
    } catch (x) { setErr(x instanceof ApiError ? x.message : "Failed."); setBusy(false); } };
  return (<form onSubmit={submit} className="mx-auto max-w-lg space-y-3 p-4"><h1 className="text-2xl font-bold">Create a battle</h1>
    <p className="text-sm text-mute">Pick your entry. Challenge a creator by username, or leave it empty to open a public challenge anyone can join.</p>
    <VideoPicker value={video} onChange={setVideo} />
    <input className="inp" placeholder="Battle title (optional)" maxLength={100} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
    <input className="inp" placeholder="Challenge username (empty = public challenge)" value={f.opponent} onChange={e => setF({ ...f, opponent: e.target.value })} />
    <label className="block text-sm text-ink/80">Voting length (hours, 1–168)<input className="inp mt-1" type="number" min={1} max={168} value={f.voting_hours} onChange={e => setF({ ...f, voting_hours: e.target.value })} /></label>
    <label className="flex gap-2"><input type="checkbox" checked={f.blind} onChange={e => setF({ ...f, blind: e.target.checked })} />🕶 Blind battle — hide creators until voting ends</label>
    {f.blind && <p className="text-xs text-mute">Your video is hidden from public feeds and search while a blind battle is live.</p>}
    {err && <p role="alert" className="text-red-600">{err}</p>}<button className="btn w-full" disabled={busy}>{busy ? "Creating…" : f.opponent.trim() ? "Send challenge" : "Post public challenge"}</button></form>);
}
