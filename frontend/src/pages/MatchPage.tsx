import { useCallback, useEffect, useRef, useState } from "react"; import { Link } from "react-router-dom";
import { API, api, token, ApiError } from "../lib/api"; import { useAuth } from "../lib/auth"; import type { Elig, MSession } from "../lib/types";
import { CallController, CallState, getMedia, MediaProblem } from "../lib/webrtc"; import { MatchSocket, SockStatus } from "../lib/matchSocket"; import { useCountdown } from "../lib/useCountdown";
type Phase = "loading" | "intro" | "setup" | "queue" | "preview" | "lobby" | "call" | "ended";
const MODES = [{ k: "random", t: "🎲 Random Match", d: "Meet a random adult who is also looking right now." }, { k: "interest", t: "💜 Interest Match", d: "Match with someone who shares at least one of your interests." },
  { k: "creator", t: "🎬 Creator Match", d: "Meet other creators (needs at least one public video) to collaborate." }];
const PRESETS = ["music", "gaming", "fitness", "travel", "food", "art", "tech", "fashion", "comedy", "study", "movies", "sports"];
const LANGS = [["", "Any language"], ["en", "English"], ["hi", "Hindi"], ["es", "Spanish"], ["fr", "French"], ["de", "German"], ["pt", "Portuguese"], ["ar", "Arabic"]];
const WHY: Record<string, string> = { dob_missing: "Add your date of birth in your profile to use Match. It can't be changed once set.", underage: "ZINGO Match is only for adults aged 18 and over.",
  age_not_verified: "Age verification is required before you can use Match.", restricted: "ZINGO Match is in private testing and isn't open to everyone yet.", restricted_by_moderation: "Your Match access is temporarily restricted after reports from other users." };
const END: Record<string, string> = { ended: "The call ended.", skip: "The match was skipped.", declined: "The match was declined.", expired: "The match request timed out.", disconnected: "The connection was lost.", blocked: "This person was blocked.", reported: "Reported — thank you. Our team will review it.", restricted: "The call was ended by moderation." };
const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const errText = (e: unknown) => e instanceof ApiError ? e.message : "Something went wrong. Please try again.";

function Intro({ elig, username, onConsent, busy, err }: { elig: Elig; username: string; onConsent: () => void; busy: boolean; err: string }) {
  const [ok, setOk] = useState(false);
  return (<div className="mx-auto max-w-lg space-y-4 p-4"><h1 className="text-2xl font-bold">📹 ZINGO Match</h1>
    <p className="text-ink/80">Live one-to-one video with another ZINGO member. Please read how it works first.</p>
    {["development", "self_declared"].includes(elig.launch_state) && <p className="rounded-xl bg-yellow-100 p-3 text-sm text-yellow-800">Ages on ZINGO are self-declared and are not verified. Only continue if you are 18 or older.</p>}
    {elig.reasons.map(r => <p key={r} role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{WHY[r] ?? r}{r === "dob_missing" && <> <Link to={`/u/${username}`} className="underline">Go to profile</Link></>}</p>)}
    {elig.eligible && <div className="space-y-3 rounded-2xl bg-white border border-line p-4 text-sm">
      <ul className="list-disc space-y-2 pl-5 text-ink/80">
        <li>You may be connected to <b>a stranger</b>. Matches are 18+ only. {elig.age_note}</li>
        <li>Your <b>camera and microphone stay off</b> until you press “Start video call”. Your browser will ask permission.</li>
        <li>The other person sees your <b>username, bio and whether you're a creator</b>, plus interests you share. Never your email, birth date, age or location.</li>
        <li>Your selected <b>interests and language</b> are used to find matches. Calls are <b>not recorded</b>.</li>
        <li>You can <b>skip, end, report or block</b> at any time. Reports are reviewed by moderators and repeated reports restrict accounts.</li>
        {!elig.turn_configured && <li className="text-yellow-800">No TURN relay is configured on this server, so calls may fail on some networks.</li>}</ul>
      <label className="flex gap-2"><input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} />I'm 18 or older and I understand the above.</label>
      {err && <p role="alert" className="text-red-600">{err}</p>}<button className="btn w-full" disabled={!ok || busy} onClick={onConsent}>Continue</button></div>}</div>);
}

function Setup({ elig, mode, setMode, interests, setInterests, language, setLanguage, onStart, busy, notice }: { elig: Elig; mode: string; setMode: (m: string) => void; interests: string[]; setInterests: (i: string[]) => void; language: string; setLanguage: (l: string) => void; onStart: () => void; busy: boolean; notice: string }) {
  const toggle = (t: string) => setInterests(interests.includes(t) ? interests.filter(x => x !== t) : [...interests, t].slice(0, 10));
  return (<div className="mx-auto max-w-lg space-y-4 p-4"><h1 className="text-2xl font-bold">📹 ZINGO Match</h1>
    {notice && <p role="status" className="rounded-xl bg-soft p-3 text-sm">{notice}</p>}
    <div className="space-y-2" role="radiogroup" aria-label="Match mode">{MODES.map(m => { const off = m.k === "creator" && !elig.is_creator;
      return <button key={m.k} role="radio" aria-checked={mode === m.k} disabled={off} onClick={() => setMode(m.k)} className={`w-full rounded-2xl bg-white border border-line p-4 text-left disabled:opacity-40 ${mode === m.k ? "ring-2 ring-zpink" : ""}`}>
        <b>{m.t}</b><p className="text-sm text-mute">{m.d}{off && " Upload a public video to unlock."}</p></button>; })}</div>
    {mode === "interest" && <div><p className="mb-2 text-sm text-ink/80">Pick your interests (up to 10)</p><div className="flex flex-wrap gap-2">{PRESETS.map(t => <button key={t} aria-pressed={interests.includes(t)} onClick={() => toggle(t)} className={interests.includes(t) ? "btn !py-1" : "btn2 !py-1"}>{t}</button>)}</div></div>}
    <select className="inp" aria-label="Language" value={language} onChange={e => setLanguage(e.target.value)}>{LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    <button className="btn w-full" disabled={busy || (mode === "interest" && interests.length === 0)} onClick={onStart}>Find a match</button>
    <p className="text-center text-xs text-mute">Your camera and microphone stay off until you press “Start video call”.</p></div>);
}

function Queue({ since, onCancel, mode }: { since: number; onCancel: () => void; mode: string }) {
  const [now, setNow] = useState(Date.now()); useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return (<div className="grid min-h-[70dvh] place-items-center p-6 text-center"><div><div className="relative mx-auto mb-6 h-32 w-32"><span className="absolute inset-0 animate-ping rounded-full grad opacity-40 text-white" /><span className="absolute inset-4 animate-pulse rounded-full grad text-white" /></div>
    <p className="text-xl font-bold" role="status">Looking for someone…</p><p className="text-sm text-mute">{mode} match · {fmt(Math.floor((now - since) / 1000))}</p>
    <button className="btn2 mt-6" onClick={onCancel}>Cancel</button></div></div>);
}

function Person({ s }: { s: MSession }) {
  return (<div className="rounded-2xl bg-white border border-line p-4 text-center"><span className="mx-auto mb-2 grid h-20 w-20 place-items-center rounded-full text-3xl grad text-white">{s.other.username[0].toUpperCase()}</span>
    <p className="text-lg font-bold">@{s.other.username} {s.other.is_creator && <span className="text-xs text-zpink">creator</span>}</p>{s.other.bio && <p className="text-sm text-ink/80">{s.other.bio}</p>}
    {s.shared_interests.length > 0 && <p className="mt-2 text-sm text-zblue">Shared: {s.shared_interests.join(", ")}</p>}</div>);
}

function Preview({ s, onAccept, onDecline, busy }: { s: MSession; onAccept: () => void; onDecline: () => void; busy: boolean }) {
  const cd = useCountdown(s.accept_deadline);
  return (<div className="mx-auto max-w-sm space-y-4 p-4"><h1 className="text-center text-2xl font-bold">It's a match!</h1><Person s={s} />
    {s.i_accepted ? <p role="status" className="text-center text-ink/80">Waiting for @{s.other.username} to accept… {cd.text}</p> :
      <><p className="text-center text-sm text-mute">Respond in {cd.text || "…"}. Accepting doesn't turn on your camera.</p>
        <div className="flex gap-2"><button className="btn flex-1" disabled={busy} onClick={onAccept}>Accept</button><button className="btn2 flex-1" disabled={busy} onClick={onDecline}>Decline</button></div></>}</div>);
}

function Lobby({ s, peerOnline, mediaErr, onStart, onSkip, onEnd, onReport, onBlock, busy }: { s: MSession; peerOnline: boolean; mediaErr: string; onStart: () => void; onSkip: () => void; onEnd: () => void; onReport: () => void; onBlock: () => void; busy: boolean }) {
  return (<div className="mx-auto max-w-sm space-y-4 p-4"><h1 className="text-center text-2xl font-bold">You're matched</h1><Person s={s} />
    <p className="text-center text-sm text-mute">Your camera and microphone are <b>off</b>. They turn on only when you press the button below.</p>
    {!peerOnline && <p role="status" className="text-center text-xs text-mute">@{s.other.username} hasn't connected yet…</p>}
    {mediaErr && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{mediaErr}</p>}
    <button className="btn w-full" disabled={busy} onClick={onStart}>{mediaErr ? "Try again" : "Start video call"}</button>
    <div className="flex justify-center gap-2 text-sm"><button className="btn2" onClick={onSkip}>Skip</button><button className="btn2" onClick={onEnd}>End</button><button className="btn2" onClick={onReport}>Report</button><button className="btn2" onClick={onBlock}>Block</button></div></div>);
}

function CallView({ s, local, remote, callState, connectedAt, peerOnline, micOn, camOn, onMic, onCam, onSkip, onEnd, onReport, onBlock, sock }: { s: MSession; local: MediaStream | null; remote: MediaStream | null; callState: CallState; connectedAt: number | null; peerOnline: boolean; micOn: boolean; camOn: boolean; onMic: () => void; onCam: () => void; onSkip: () => void; onEnd: () => void; onReport: () => void; onBlock: () => void; sock: SockStatus }) {
  const rv = useRef<HTMLVideoElement>(null), lv = useRef<HTMLVideoElement>(null); const [now, setNow] = useState(Date.now());
  useEffect(() => { if (rv.current) rv.current.srcObject = remote; }, [remote]); useEffect(() => { if (lv.current) lv.current.srcObject = local; }, [local]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const label = callState === "connected" ? "Live" : callState === "reconnecting" ? "Reconnecting…" : callState === "failed" ? "Connection failed" : "Connecting…";
  const b = "grid h-12 w-12 place-items-center rounded-full text-lg backdrop-blur";
  return (<div className="relative mx-auto h-[calc(100dvh-4rem)] max-w-3xl overflow-hidden bg-black text-white md:h-dvh md:rounded-2xl">
    <video ref={rv} autoPlay playsInline className="h-full w-full object-cover" aria-label="Remote video" />
    {!remote && <p className="absolute inset-0 grid place-items-center p-6 text-center text-white/70" role="status">Waiting for @{s.other.username}'s video…</p>}
    <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-3 text-sm">
      <Link to={`/u/${s.other.username}`} target="_blank" className="font-bold">@{s.other.username}</Link>
      <span className="flex items-center gap-2"><span role="status" className={`rounded-full px-2 py-0.5 ${callState === "connected" ? "bg-green-500/80" : callState === "failed" ? "bg-red-500/80" : "bg-yellow-500/80"}`}>{label}</span>{callState === "connected" && connectedAt && <span>{fmt(Math.floor((now - connectedAt) / 1000))}</span>}</span></div>
    {(!peerOnline || sock !== "open") && <p role="alert" className="absolute inset-x-0 top-12 bg-yellow-500/80 p-1 text-center text-xs text-black">{sock !== "open" ? "Reconnecting to the server…" : `@${s.other.username} lost connection — waiting up to 30 seconds.`}</p>}
    <video ref={lv} autoPlay playsInline muted className="absolute bottom-24 right-3 h-36 w-24 rounded-xl border border-white/30 bg-gray-800 object-cover [transform:scaleX(-1)]" aria-label="Your camera" />
    {callState === "failed" && <div className="absolute inset-x-0 bottom-28 text-center"><p className="mb-2 text-sm text-red-200">We couldn't connect the call (a network may be blocking it).</p><button className="btn" onClick={onSkip}>Find another match</button></div>}
    <div className="absolute inset-x-0 bottom-0 flex justify-center gap-3 bg-gradient-to-t from-black/80 to-transparent p-4">
      <button className={`${b} ${micOn ? "bg-white/20" : "bg-red-500"}`} onClick={onMic} aria-pressed={!micOn} aria-label={micOn ? "Mute microphone" : "Unmute microphone"}>{micOn ? "🎤" : "🔇"}</button>
      <button className={`${b} ${camOn ? "bg-white/20" : "bg-red-500"}`} onClick={onCam} aria-pressed={!camOn} aria-label={camOn ? "Turn camera off" : "Turn camera on"}>{camOn ? "📷" : "🚫"}</button>
      <button className={`${b} bg-white/20`} onClick={onSkip} aria-label="Skip to next match">⏭</button>
      <button className={`${b} bg-red-600`} onClick={onEnd} aria-label="End call">📞</button>
      <button className={`${b} bg-white/20`} onClick={onReport} aria-label="Report">⚑</button>
      <button className={`${b} bg-white/20`} onClick={onBlock} aria-label="Block">⛔</button></div></div>);
}

function ReportDialog({ s, onClose, onDone }: { s: MSession; onClose: () => void; onDone: () => void }) {
  const [cat, setCat] = useState("harassment"); const [reason, setReason] = useState(""); const [block, setBlock] = useState(true); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const send = async () => { setBusy(true); setErr(""); try { await api(`/api/match/sessions/${s.id}/report/`, { method: "POST", body: { category: cat, reason, block } }); onDone(); } catch (e) { setErr(errText(e)); setBusy(false); } };
  return (<div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4" role="dialog" aria-label="Report"><div className="w-full max-w-sm space-y-3 rounded-2xl bg-white border border-line p-4">
    <b>Report @{s.other.username}</b><p className="text-xs text-mute">Reporting ends the call right away. Moderators review reports.</p>
    <select className="inp" value={cat} onChange={e => setCat(e.target.value)} aria-label="Category">{["harassment", "nudity", "hate", "spam", "minor", "other"].map(c => <option key={c}>{c}</option>)}</select>
    <textarea className="inp" rows={3} maxLength={300} placeholder="What happened?" value={reason} onChange={e => setReason(e.target.value)} />
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={block} onChange={e => setBlock(e.target.checked)} />Also block this person</label>
    {err && <p role="alert" className="text-sm text-red-600">{err}</p>}<div className="flex gap-2"><button className="btn flex-1" disabled={busy || !reason.trim()} onClick={send}>Send report</button><button className="btn2" onClick={onClose}>Cancel</button></div></div></div>);
}

function Ended({ s, duration, reported, onAgain, onReport, onBlock }: { s: MSession; duration: number; reported: boolean; onAgain: () => void; onReport: () => void; onBlock: () => void }) {
  const [fol, setFol] = useState(s.other.is_following); const [err, setErr] = useState(""); const blocked = s.end_reason === "blocked";
  const follow = async () => { try { await api(`/api/users/${s.other.username}/follow/`, { method: fol ? "DELETE" : "POST" }); setFol(!fol); setErr(""); } catch (e) { setErr(errText(e)); } };
  return (<div className="mx-auto max-w-sm space-y-4 p-4 text-center"><h1 className="text-2xl font-bold">Call ended</h1><p className="text-ink/80" role="status">{END[s.end_reason] ?? "The match ended."}{duration > 0 && ` Connected for ${fmt(duration)}.`}</p>
    {!blocked && <Person s={s} />}{err && <p role="alert" className="text-sm text-red-600">{err}</p>}
    {!blocked && <div className="flex flex-wrap justify-center gap-2"><button className={fol ? "btn2" : "btn"} onClick={follow}>{fol ? "Following" : "Follow"}</button><Link className="btn2" to={`/u/${s.other.username}`}>Profile</Link><Link className="btn2" to={`/chat/with/${s.other.username}`}>Message</Link></div>}
    <button className="btn w-full" onClick={onAgain}>Find another match</button>
    {!blocked && <div className="flex justify-center gap-2 text-sm">{!reported && s.end_reason !== "reported" && <button className="btn2" onClick={onReport}>Report</button>}<button className="btn2" onClick={onBlock}>Block</button></div>}</div>);
}

export default function MatchPage() {
  const { user } = useAuth(); const [elig, setElig] = useState<Elig | null>(null); const [phase, setPhase] = useState<Phase>("loading"); const [session, setSession] = useState<MSession | null>(null);
  const [mode, setMode] = useState("random"); const [interests, setInterests] = useState<string[]>([]); const [language, setLanguage] = useState(""); const [notice, setNotice] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [sock, setSock] = useState<SockStatus>("connecting"); const [callState, setCallState] = useState<CallState>("connecting"); const [local, setLocal] = useState<MediaStream | null>(null); const [remote, setRemote] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true); const [camOn, setCamOn] = useState(true); const [connectedAt, setConnectedAt] = useState<number | null>(null); const [duration, setDuration] = useState(0);
  const [peerOnline, setPeerOnline] = useState(false); const [mediaErr, setMediaErr] = useState(""); const [showReport, setShowReport] = useState(false); const [reported, setReported] = useState(false); const [queueSince, setQueueSince] = useState(Date.now());
  const ws = useRef<MatchSocket | null>(null); const ctrl = useRef<CallController | null>(null); const sRef = useRef<MSession | null>(null); const pRef = useRef<Phase>("loading"); const early = useRef<any[]>([]); const cAt = useRef<number | null>(null); const modeRef = useRef({ mode, interests, language });
  pRef.current = phase; modeRef.current = { mode, interests, language }; cAt.current = connectedAt;

  const stopCall = useCallback(() => { if (cAt.current) setDuration(Math.round((Date.now() - cAt.current) / 1000)); ctrl.current?.close(); ctrl.current = null; early.current = []; setLocal(null); setRemote(null); setConnectedAt(null); setCallState("connecting"); setMicOn(true); setCamOn(true); }, []);
  const applySession = useCallback((s: MSession) => { sRef.current = s; setSession(s);
    if (s.status === "pending") setPhase("preview");
    else if (s.status === "active") { setPhase(p => (p === "call" ? "call" : "lobby")); ws.current?.send({ type: "join", session: s.id }); }
    else { stopCall(); setPhase("ended"); } }, [stopCall]);

  const handleQueue = useCallback((r: any) => { if (r.status === "matched") applySession(r.session); else if (r.status === "queued") { setQueueSince(Date.now() - r.waited * 1000); setPhase("queue"); } else setPhase("setup"); }, [applySession]);
  useEffect(() => { (async () => { try { const e = await api<Elig>("/api/match/eligibility/"); setElig(e); const me = await api<any>("/api/me/"); setInterests(me.interests ?? []); setLanguage(me.language ?? "");
      if (!e.eligible || !e.consent) return setPhase("intro"); const q = await api("/api/match/queue/"); if (q.status === "idle") setPhase("setup"); else handleQueue(q); } catch (x) { setErr(errText(x)); setPhase("intro"); } })(); }, [handleQueue]);

  const ready = !!elig?.eligible && !!elig.consent;
  useEffect(() => { if (!ready) return;
    const s = new MatchSocket(e => {
      if (e.type === "state") { if (e.session && !sRef.current) applySession(e.session); else if (e.session?.status === "active") s.send({ type: "join", session: e.session.id }); }
      else if (e.type === "session") { const cur = sRef.current; if (!cur || cur.id === e.session.id || pRef.current === "queue") applySession(e.session); }
      else if (e.type === "signal" && e.session === sRef.current?.id) {
        if (e.kind === "peer_offline") setPeerOnline(false);
        else if (e.kind === "peer_online") { setPeerOnline(true); ctrl.current?.announceReady(); }
        else { setPeerOnline(true); if (ctrl.current) ctrl.current.onSignal(e.kind, e.data); else early.current.push(e); } }
      else if (e.type === "joined") setPeerOnline(prev => prev);
      else if (e.type === "error") setNotice(e.detail); else if (e.type === "auth_failed") setNotice("The live connection was rejected. Reload the page or log in again.");
    }, setSock);
    ws.current = s; s.connect();
    const leave = () => { const c = sRef.current; if (c && (c.status === "pending" || c.status === "active")) fetch(`${API}/api/match/sessions/${c.id}/end/`, { method: "POST", keepalive: true, headers: { Authorization: `Token ${token.get()}` } }).catch(() => {}); };
    window.addEventListener("pagehide", leave);
    return () => { window.removeEventListener("pagehide", leave); leave(); ctrl.current?.close(); s.close(); ws.current = null; };
  }, [ready, applySession]);

  useEffect(() => { if (phase !== "queue") return; const t = setInterval(async () => { try { const r = await api("/api/match/queue/"); if (r.status === "idle") { setNotice("No one was available right now. Try again in a moment."); setPhase("setup"); } else handleQueue(r); } catch (x) { setNotice(errText(x)); setPhase("setup"); } }, 3000); return () => clearInterval(t); }, [phase, handleQueue]);

  const run = async (fn: () => Promise<void>) => { setBusy(true); setNotice(""); try { await fn(); } catch (e) { setNotice(errText(e)); } finally { setBusy(false); } };
  const find = (m = modeRef.current.mode) => run(async () => { const { interests: i, language: l } = modeRef.current; const r = await api("/api/match/queue/", { method: "POST", body: { mode: m, interests: i, language: l } }); handleQueue(r); });
  const cancel = () => run(async () => { await api("/api/match/queue/", { method: "DELETE" }); setPhase("setup"); });
  const act = (action: string, then?: () => void) => run(async () => { const s = await api<MSession>(`/api/match/sessions/${sRef.current!.id}/${action}/`, { method: "POST" }); applySession(s); then?.(); });
  const consent = () => run(async () => { try { await api("/api/match/consent/", { method: "POST", body: { accept: true } }); setElig(e => e && { ...e, consent: true }); setPhase("setup"); } catch (e) { setErr(errText(e)); } });
  const decline = () => run(async () => { await api(`/api/match/sessions/${sRef.current!.id}/decline/`, { method: "POST" }); sRef.current = null; setSession(null); setPhase("setup"); });
  const block = () => run(async () => { const s = sRef.current!; if (!confirm(`Block @${s.other.username}? You will never be matched again.`)) return; await api(`/api/users/${s.other.username}/block/`, { method: "POST" }); applySession(await api<MSession>(`/api/match/sessions/${s.id}/`)); });
  const skip = () => { stopCall(); run(async () => { const s = await api<MSession>(`/api/match/sessions/${sRef.current!.id}/skip/`, { method: "POST" }); sRef.current = null; setSession(s); await find(); }); };
  const again = () => { sRef.current = null; setSession(null); setReported(false); setDuration(0); setNotice(""); setPhase("setup"); };
  const startCall = async () => { const s = sRef.current; if (!s) return; setMediaErr(""); setBusy(true);
    try { const media = await getMedia(); const ice = await api<{ iceServers: RTCIceServer[] }>("/api/match/ice/"); setLocal(media);
      const c = new CallController({ iceServers: ice.iceServers, caller: s.role === "caller", local: media, signal: (kind, data) => { ws.current?.send({ type: "signal", session: s.id, kind, data }); }, onRemote: setRemote, onState: st => { setCallState(st); if (st === "connected") setConnectedAt(t => t ?? Date.now()); } });
      ctrl.current = c; setPhase("call"); c.announceReady(); early.current.splice(0).forEach(e => c.onSignal(e.kind, e.data));
    } catch (e) { setMediaErr(e instanceof MediaProblem ? e.message : errText(e)); } finally { setBusy(false); } };

  if (phase === "loading") return <p className="p-8 text-center text-mute">Loading…</p>;
  if (!elig) return <p role="alert" className="p-8 text-center text-red-600">{err || "Couldn't load Match."}</p>;
  const banner = ready && sock !== "open" && phase !== "call" && <p role="status" className="bg-soft p-1 text-center text-xs text-mute">{sock === "offline" ? "Live connection unavailable — reload to retry." : "Connecting to live updates…"}</p>;
  return (<div>{banner}
    {phase === "intro" && <Intro elig={elig} username={user?.username ?? ""} onConsent={consent} busy={busy} err={err} />}
    {phase === "setup" && <Setup elig={elig} mode={mode} setMode={setMode} interests={interests} setInterests={setInterests} language={language} setLanguage={setLanguage} onStart={() => find()} busy={busy} notice={notice} />}
    {phase === "queue" && <Queue since={queueSince} onCancel={cancel} mode={mode} />}
    {phase === "preview" && session && <Preview s={session} onAccept={() => act("accept")} onDecline={decline} busy={busy} />}
    {phase === "lobby" && session && <Lobby s={session} peerOnline={peerOnline} mediaErr={mediaErr} onStart={startCall} onSkip={skip} onEnd={() => act("end")} onReport={() => setShowReport(true)} onBlock={block} busy={busy} />}
    {phase === "call" && session && <CallView s={session} local={local} remote={remote} callState={callState} connectedAt={connectedAt} peerOnline={peerOnline} micOn={micOn} camOn={camOn} sock={sock}
      onMic={() => { ctrl.current?.setMic(!micOn); setMicOn(!micOn); }} onCam={() => { ctrl.current?.setCam(!camOn); setCamOn(!camOn); }} onSkip={skip} onEnd={() => act("end")} onReport={() => setShowReport(true)} onBlock={block} />}
    {phase === "ended" && session && <Ended s={session} duration={duration} reported={reported} onAgain={again} onReport={() => setShowReport(true)} onBlock={block} />}
    {notice && phase !== "setup" && <p role="alert" className="fixed bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-sm text-white">{notice}</p>}
    {showReport && session && <ReportDialog s={session} onClose={() => setShowReport(false)} onDone={async () => { setShowReport(false); setReported(true); try { applySession(await api<MSession>(`/api/match/sessions/${session.id}/`)); } catch { /* ignore */ } }} />}</div>);
}
