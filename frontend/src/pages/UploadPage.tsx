import { useState, FormEvent } from "react"; import { useNavigate } from "react-router-dom"; import { api, upload, ApiError } from "../lib/api"; import { MOODS, Video } from "../lib/types";
const MAX_MB = 100;
export default function UploadPage() {
  const nav = useNavigate(); const [file, setFile] = useState<File | null>(null); const [f, setF] = useState({ caption: "", hashtags: "", mood: "", visibility: "public" });
  const [story, setStory] = useState(false); const [opts, setOpts] = useState(["", ""]); const [sTitle, setSTitle] = useState(""); const [hours, setHours] = useState("");
  const [pct, setPct] = useState(0); const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [ok, setOk] = useState("");
  const pick = (x?: File) => { setErr(""); if (!x) return setFile(null);
    if (!x.type.startsWith("video/") || !/\.(mp4|m4v|mov|webm)$/i.test(x.name)) return setErr("Please choose an MP4 (H.264), MOV or WebM video."); if (x.size > MAX_MB * 1048576) return setErr(`File is larger than ${MAX_MB} MB.`); setFile(x); };
  const submit = async (e: FormEvent) => { e.preventDefault(); if (!file) return setErr("Choose a video first."); setErr(""); setOk(""); setBusy(true); setPct(0);
    const labels = opts.map(o => o.trim()).filter(Boolean); if (story && labels.length < 2) { setBusy(false); return setErr("WHATNEXT needs at least 2 choices."); }
    try { const fd = new FormData(); fd.append("file", file); Object.entries(f).forEach(([k, v]) => v && fd.append(k, v));
      const v: Video = await upload("/api/videos/", fd, setPct);
      if (story) { try { await api("/api/stories/", { method: "POST", body: { video: v.id, title: sTitle || f.caption.slice(0, 100), options: labels, prompt: sTitle,
          closes_at: hours ? new Date(Date.now() + Number(hours) * 3600e3).toISOString() : null } }); } catch (x) { setErr("Video uploaded, but the story failed: " + (x as Error).message); setBusy(false); return; } }
      setOk("Posted!"); setTimeout(() => nav(`/video/${v.id}`), 800);
    } catch (x) { setErr(x instanceof ApiError ? x.message : "Upload failed."); setBusy(false); } };
  return (<form onSubmit={submit} className="mx-auto max-w-lg space-y-3 p-4"><h1 className="text-2xl font-bold">Create a ZING</h1>
    <input className="inp" type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" aria-label="Video file" onChange={e => pick(e.target.files?.[0])} />{file && <p className="text-xs text-mute">{file.name} · {(file.size / 1048576).toFixed(1)} MB</p>}
    <input className="inp" placeholder="Caption" maxLength={300} value={f.caption} onChange={e => setF({ ...f, caption: e.target.value })} />
    <input className="inp" placeholder="Hashtags (comma or space separated)" maxLength={200} value={f.hashtags} onChange={e => setF({ ...f, hashtags: e.target.value })} />
    <select className="inp" aria-label="Mood" value={f.mood} onChange={e => setF({ ...f, mood: e.target.value })}><option value="">Mood (optional)</option>{MOODS.map(m => <option key={m} value={m}>{m}</option>)}</select>
    <select className="inp" aria-label="Visibility" value={f.visibility} onChange={e => setF({ ...f, visibility: e.target.value })}><option value="public">Public</option><option value="followers">Followers only</option><option value="private">Only me</option></select>
    <label className="flex gap-2"><input type="checkbox" checked={story} onChange={e => setStory(e.target.checked)} />Make it a WHATNEXT interactive story</label>
    {story && <div className="space-y-2 rounded-2xl bg-white border border-line p-3"><input className="inp" placeholder="Question for viewers" value={sTitle} onChange={e => setSTitle(e.target.value)} />
      {opts.map((o, i) => <input key={i} className="inp" placeholder={`Choice ${i + 1}`} maxLength={100} value={o} onChange={e => setOpts(opts.map((x, j) => j === i ? e.target.value : x))} />)}
      {opts.length < 4 && <button type="button" className="btn2" onClick={() => setOpts([...opts, ""])}>+ Add choice</button>}
      <input className="inp" type="number" min="1" placeholder="Voting closes in (hours, optional)" value={hours} onChange={e => setHours(e.target.value)} /></div>}
    {busy && <div className="h-3 overflow-hidden rounded-full bg-soft" role="progressbar" aria-valuenow={pct}><div className="h-full grad transition-all text-white" style={{ width: pct + "%" }} /></div>}
    {err && <p role="alert" className="text-red-600">{err}</p>}{ok && <p role="status" className="text-green-600">{ok}</p>}
    <button className="btn w-full" disabled={busy}>{busy ? `Uploading ${pct}%…` : err ? "Retry upload" : "Post"}</button></form>);
}
