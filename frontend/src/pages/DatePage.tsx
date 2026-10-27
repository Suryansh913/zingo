import { useCallback, useEffect, useRef, useState } from "react"; import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Ban, Flag, Heart, ImagePlus, Info, Trash2, X } from "lucide-react";
import { api, ApiError, mediaUrl, upload } from "../lib/api"; import type { CursorPage, DateCard, DateMatchItem, DatePrefs, DateProfile, DateState } from "../lib/types";
import DateCardView from "../components/DateCardView"; import Modal from "../components/Modal";
const errText = (e: unknown) => e instanceof ApiError ? e.message : "Something went wrong. Please try again.";
const WHY: Record<string, string> = { underage: "ZINGO Date is only for adults aged 18 and over.", restricted: "ZINGO Date is in private testing and isn't open to everyone yet.", moderation_hold: "Your dating profile is under review by our moderators.", age_not_verified: "Age verification is required before you can use ZINGO Date.", dob_missing: "" };
const LABEL: Record<string, string> = { woman: "Women", man: "Men", nonbinary: "Non-binary people", other: "Other", everyone: "Everyone" }; const GLABEL: Record<string, string> = { woman: "Woman", man: "Man", nonbinary: "Non-binary", other: "Other" };
const ILABEL: Record<string, string> = { long_term: "Long-term relationship", short_term: "Something casual", friends: "New friends", unsure: "Not sure yet" };
const PRESETS = ["music", "travel", "fitness", "food", "movies", "gaming", "art", "books", "hiking", "tech", "fashion", "comedy"];
const MISSING: Record<string, string> = { date_of_birth: "Your date of birth", bio: "A short dating bio", interested_in: "Who you'd like to meet" };

function Confirm({ title, body, label, danger, busy, onYes, onNo }: { title: string; body: string; label: string; danger?: boolean; busy?: boolean; onYes: () => void; onNo: () => void }) {
  return <Modal onClose={onNo} label={title}><h2 className="text-lg font-bold">{title}</h2><p className="mt-2 text-sm text-ink/80">{body}</p><div className="mt-5 flex gap-2"><button className={danger ? "flex-1 rounded-full bg-red-600 px-5 py-2 font-semibold text-white disabled:opacity-50" : "btn flex-1"} disabled={busy} onClick={onYes}>{label}</button><button className="btn2 flex-1" onClick={onNo}>Cancel</button></div></Modal>;
}

function Welcome({ state, onCreated }: { state: DateState; onCreated: () => void }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const blocked = state.reasons.filter(r => ["underage", "restricted", "moderation_hold"].includes(r));
  const create = async () => { setBusy(true); setErr(""); try { await api("/api/date/profile/create/", { method: "POST" }); onCreated(); } catch (e) { setErr(errText(e)); setBusy(false); } };
  return (<div className="mx-auto max-w-xl space-y-6 p-4 py-8 text-center"><span className="mx-auto grid h-20 w-20 place-items-center rounded-full grad text-white shadow-lg"><Heart size={38} fill="currentColor" /></span>
    <div><h1 className="text-3xl font-black">Find Your Vibe. Find Your Person. ❤️</h1><p className="mt-2 text-mute">Meet people, discover connections, and find someone who matches your vibe.</p></div>
    {blocked.map(r => <p key={r} role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{WHY[r]}</p>)}
    {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
    <button className="btn w-full !py-3 text-lg" disabled={busy || blocked.length > 0} onClick={create}>{busy ? "Creating your profile…" : "Add Profile to Date"}</button>
    <p className="text-sm text-ink/80">Your existing ZINGO profile will be used to create your dating profile. You can review and edit your dating details before becoming discoverable.</p>
    <div className="rounded-2xl border border-line bg-soft p-4 text-left text-sm text-mute"><b className="text-ink">Your privacy</b><ul className="mt-2 list-disc space-y-1 pl-5"><li>Your normal ZINGO profile does <b>not</b> automatically appear in ZINGO Date. Nothing is visible until you review your profile and press “Activate”.</li>
      <li>Only your username, age, photos you add, interests, bio and broad city are ever shown — never your email, birth date or exact location.</li><li>ZINGO Date is for adults 18+. {state.age_note}</li><li>You can pause, unmatch, block or report anyone at any time.</li></ul></div></div>);
}

function Editor({ profile, prefs, state, onSaved, active }: { profile: DateProfile; prefs: DatePrefs; state: DateState; onSaved: () => Promise<void>; active: boolean }) {
  const [f, setF] = useState({ bio: profile.bio, gender: profile.gender, interested_in: profile.interested_in, interests: profile.interests, intention: profile.intention, city: profile.city, min_age: profile.min_age, max_age: profile.max_age });
  const [dob, setDob] = useState(""); const [tag, setTag] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [ok, setOk] = useState(""); const [confirm, setConfirm] = useState<"activate" | "deactivate" | null>(null); const file = useRef<HTMLInputElement>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF(p => ({ ...p, [k]: v })); setOk(""); };
  const toggleInto = (o: string) => set("interested_in", o === "everyone" ? (f.interested_in.includes("everyone") ? [] : ["everyone"]) : (f.interested_in.includes(o) ? f.interested_in.filter(x => x !== o) : [...f.interested_in.filter(x => x !== "everyone"), o]));
  const toggleTag = (t: string) => set("interests", f.interests.includes(t) ? f.interests.filter(x => x !== t) : [...f.interests, t].slice(0, 10));
  const save = async (): Promise<boolean> => { setErr(""); setOk("");
    try { if (!state.has_dob && dob) await api("/api/me/", { method: "PATCH", body: { date_of_birth: dob } }); await api("/api/date/profile/update/", { method: "PATCH", body: f }); await onSaved(); setOk("Saved"); return true; } catch (e) { setErr(errText(e)); return false; } };
  const run = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };
  const activate = () => run(async () => { setConfirm(null); if (!(await save())) return; try { await api("/api/date/profile/activate/", { method: "POST" }); await onSaved(); } catch (e) { setErr(e instanceof ApiError && e.data?.missing ? "Still needed: " + e.data.missing.map((m: string) => MISSING[m] ?? m).join(", ") : errText(e)); } });
  const deactivate = () => run(async () => { setConfirm(null); try { await api("/api/date/profile/deactivate/", { method: "POST" }); await onSaved(); } catch (e) { setErr(errText(e)); } });
  const pickPhoto = (x?: File) => { if (!x) return; setErr(""); if (!["image/jpeg", "image/png", "image/webp"].includes(x.type)) return setErr("Use a JPEG, PNG or WebP image."); if (x.size > prefs.limits.photo_mb * 1048576) return setErr(`Image must be under ${prefs.limits.photo_mb} MB.`);
    run(async () => { const fd = new FormData(); fd.append("image", x); try { await upload("/api/date/profile/photos/", fd, () => {}); await onSaved(); } catch (e) { setErr(errText(e)); } }); if (file.current) file.current.value = ""; };
  const del = (id: number) => run(async () => { try { await api(`/api/date/profile/photos/${id}/`, { method: "DELETE" }); await onSaved(); } catch (e) { setErr(errText(e)); } });
  const local: string[] = []; if (!state.has_dob && !dob) local.push("date_of_birth"); if (!f.bio.trim()) local.push("bio"); if (f.interested_in.length === 0) local.push("interested_in");
  const preview: DateCard = { username: profile.username, age: profile.age, bio: f.bio, city: f.city, interests: f.interests, shared_interests: [], intention: f.intention, photos: profile.photos, social_visible: false };
  const lab = "block text-sm font-semibold"; 
  return (<div className="mx-auto grid max-w-4xl gap-6 p-4 md:grid-cols-[1fr_340px]"><div className="space-y-5">
    {!active && <div className="rounded-2xl bg-soft p-4 text-sm"><b>Review your dating profile.</b> We started it from your ZINGO profile. <b>You're not visible to anyone yet</b> — pick “Activate” when you're ready. Changes here never change your normal ZINGO profile.</div>}
    {profile.moderation_hold && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{WHY.moderation_hold}</p>}
    {!state.has_dob && <label className={lab}>Date of birth <span className="font-normal text-mute">(18+ required. Saved on your ZINGO account and can't be changed later; never shown to others)</span><input className="inp mt-1" type="date" value={dob} onChange={e => setDob(e.target.value)} /></label>}
    <label className={lab}>Dating bio<textarea className="inp mt-1" rows={4} maxLength={prefs.limits.bio_max} value={f.bio} onChange={e => set("bio", e.target.value)} placeholder="Say something about you" /><span className="text-xs font-normal text-mute">{f.bio.length}/{prefs.limits.bio_max}</span></label>
    <fieldset><legend className={lab}>I'm interested in</legend><div className="mt-1 flex flex-wrap gap-2">{prefs.interested_in_options.map(o => <button type="button" key={o} aria-pressed={f.interested_in.includes(o)} onClick={() => toggleInto(o)} className={f.interested_in.includes(o) ? "btn !py-1" : "btn2 !py-1"}>{LABEL[o] ?? o}</button>)}</div></fieldset>
    <label className={lab}>I am (optional)<select className="inp mt-1" value={f.gender} onChange={e => set("gender", e.target.value)}><option value="">Prefer not to say</option>{prefs.genders.map(g => <option key={g} value={g}>{GLABEL[g] ?? g}</option>)}</select><span className="text-xs font-normal text-mute">If left blank, only people interested in “Everyone” will see you.</span></label>
    <label className={lab}>Looking for<select className="inp mt-1" value={f.intention} onChange={e => set("intention", e.target.value)}><option value="">Not specified</option>{prefs.intentions.map(i => <option key={i} value={i}>{ILABEL[i] ?? i}</option>)}</select></label>
    <div><span className={lab}>Interests</span><div className="mt-1 flex flex-wrap gap-2">{[...new Set([...PRESETS, ...f.interests])].map(t => <button type="button" key={t} aria-pressed={f.interests.includes(t)} onClick={() => toggleTag(t)} className={f.interests.includes(t) ? "btn !py-1" : "btn2 !py-1"}>{t}</button>)}</div>
      <form className="mt-2 flex gap-2" onSubmit={e => { e.preventDefault(); const t = tag.trim().toLowerCase(); if (t && !f.interests.includes(t)) toggleTag(t); setTag(""); }}><input className="inp" placeholder="Add your own" value={tag} maxLength={24} onChange={e => setTag(e.target.value)} aria-label="Add interest" /><button className="btn2">Add</button></form></div>
    <label className={lab}>City <span className="font-normal text-mute">(broad, optional — no precise location is ever collected)</span><input className="inp mt-1" value={f.city} maxLength={80} onChange={e => set("city", e.target.value)} placeholder="e.g. Kanpur" /></label>
    <div className="grid grid-cols-2 gap-3"><label className={lab}>Min age<input className="inp mt-1" type="number" min={18} max={99} value={f.min_age} onChange={e => set("min_age", Number(e.target.value))} /></label><label className={lab}>Max age<input className="inp mt-1" type="number" min={18} max={99} value={f.max_age} onChange={e => set("max_age", Number(e.target.value))} /></label></div>
    <div><span className={lab}>Photos ({profile.photos.length}/{prefs.limits.max_photos})</span><p className="text-xs text-mute">Photos are re-encoded to remove hidden location data. Add clear photos of yourself only.</p>
      <div className="mt-2 grid grid-cols-3 gap-2">{profile.photos.map(p => <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl bg-soft"><img src={mediaUrl(p.url)} alt="" className="h-full w-full object-cover" /><button onClick={() => del(p.id)} aria-label="Remove photo" className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-red-600 shadow"><Trash2 size={14} /></button></div>)}
        {profile.photos.length < prefs.limits.max_photos && <button type="button" onClick={() => file.current?.click()} disabled={busy} className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-line text-mute hover:border-zpurple hover:text-zpurple" aria-label="Add photo"><ImagePlus size={26} /></button>}</div>
      <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => pickPhoto(e.target.files?.[0])} /></div>
    {local.length > 0 && !active && <p className="rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800">Still needed to activate: {local.map(m => MISSING[m]).join(", ")}.</p>}
    {err && <p role="alert" className="text-sm text-red-600">{err}</p>}{ok && <p role="status" className="text-sm text-green-600">{ok}</p>}
    <div className="flex flex-wrap gap-2"><button className="btn2" disabled={busy} onClick={save}>Save changes</button>
      {!active ? <button className="btn" disabled={busy || profile.moderation_hold || local.length > 0} onClick={() => setConfirm("activate")}>Activate Dating Profile</button> : <button className="btn2 !text-red-600" disabled={busy} onClick={() => setConfirm("deactivate")}>Deactivate profile</button>}</div>
    {!state.age_verified && <p className="text-xs text-mute">{state.age_note} ZINGO Date is intended for adults 18+.</p>}</div>
    <div className="md:sticky md:top-4 md:self-start"><p className="mb-2 text-sm font-semibold text-mute">How others will see you</p><DateCardView card={preview} full /></div>
    {confirm === "activate" && <Confirm title="Activate your dating profile?" body="People who match your preferences will be able to see your username, age, photos, bio, interests and city. You can deactivate any time." label="Activate" busy={busy} onYes={activate} onNo={() => setConfirm(null)} />}
    {confirm === "deactivate" && <Confirm title="Deactivate your dating profile?" body="You'll disappear from discovery. Existing matches and chats stay available." label="Deactivate" busy={busy} onYes={deactivate} onNo={() => setConfirm(null)} />}</div>);
}

function Discover({ onProfile }: { onProfile: () => void }) {
  const nav = useNavigate(); const [queue, setQueue] = useState<DateCard[]>([]); const [next, setNext] = useState<string | null>("/api/date/discover/"); const [loading, setLoading] = useState(true); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState<"like" | "pass" | null>(null); const [notice, setNotice] = useState(""); const [view, setView] = useState(false); const [report, setReport] = useState(false); const [reason, setReason] = useState(""); const [blockAsk, setBlockAsk] = useState(false);
  const [match, setMatch] = useState<DateMatchItem | null>(null); const busyLoad = useRef(false);
  const load = useCallback(async (url: string) => { if (busyLoad.current) return; busyLoad.current = true; setLoading(true); setErr("");
    try { const r = await api<CursorPage<DateCard>>(url); setQueue(q => [...q, ...r.results.filter(x => !q.some(y => y.username === x.username))]); setNext(r.next); } catch (e) { setErr(errText(e)); } finally { busyLoad.current = false; setLoading(false); } }, []);
  useEffect(() => { load("/api/date/discover/"); }, [load]);
  useEffect(() => { if (queue.length <= 2 && next && !loading && !err) load(next); }, [queue.length, next, loading, err, load]);
  const cur = queue[0];
  const advance = (dir: "like" | "pass" | null) => { setLeaving(dir); setTimeout(() => { setQueue(q => q.slice(1)); setLeaving(null); }, dir ? 250 : 0); };
  const act = async (kind: "like" | "pass") => { if (!cur || busy) return; setBusy(true); setNotice("");
    try { const r = await api<{ matched: boolean; match?: DateMatchItem }>(`/api/date/${kind}/`, { method: "POST", body: { username: cur.username } }); if (r.matched && r.match) setMatch(r.match); advance(kind); }
    catch (e) { if (e instanceof ApiError && [404, 409].includes(e.status)) { setNotice(e.status === 404 ? "That profile is no longer available." : e.message); advance(null); } else setNotice(errText(e)); } finally { setBusy(false); } };
  const sendReport = async () => { if (!cur) return; setBusy(true); try { await api("/api/date/report/", { method: "POST", body: { username: cur.username, reason } }); setReport(false); setReason(""); setNotice("Thanks — we'll review this profile."); advance(null); } catch (e) { setNotice(errText(e)); } finally { setBusy(false); } };
  const block = async () => { if (!cur) return; setBusy(true); try { await api(`/api/users/${cur.username}/block/`, { method: "POST" }); setBlockAsk(false); setNotice(`Blocked ${cur.username}.`); advance(null); } catch (e) { setNotice(errText(e)); } finally { setBusy(false); } };
  const circle = "grid h-16 w-16 place-items-center rounded-full border border-line bg-white shadow-md transition active:scale-90 disabled:opacity-50";
  return (<div className="mx-auto max-w-sm space-y-4 p-4">
    {notice && <p role="status" className="rounded-xl bg-soft p-3 text-center text-sm">{notice}</p>}
    {!cur && loading && <div className="aspect-[3/4] animate-pulse rounded-3xl bg-gray-100" aria-label="Loading profiles" />}
    {err && <div className="rounded-2xl border border-line p-6 text-center"><p role="alert" className="text-red-600">{err}</p><button className="btn mt-3" onClick={() => load(next ?? "/api/date/discover/")}>Retry</button></div>}
    {!cur && !loading && !err && <div className="rounded-3xl border border-line bg-white p-8 text-center"><span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full grad text-white"><Heart size={26} fill="currentColor" /></span><h2 className="text-lg font-bold">You've seen everyone for now</h2>
      <p className="mt-1 text-sm text-mute">New people join all the time. You can also widen your age range or preferences.</p><div className="mt-4 flex justify-center gap-2"><button className="btn" onClick={() => { setQueue([]); setNext("/api/date/discover/"); load("/api/date/discover/"); }}>Refresh</button><button className="btn2" onClick={onProfile}>Edit preferences</button></div></div>}
    {cur && <><div className={`transition duration-200 ${leaving === "like" ? "translate-x-16 rotate-6 opacity-0" : leaving === "pass" ? "-translate-x-16 -rotate-6 opacity-0" : ""}`}><DateCardView card={cur} /></div>
      <div className="flex items-center justify-center gap-5"><button className={`${circle} text-ink/70`} onClick={() => act("pass")} disabled={busy} aria-label="Pass"><X size={30} /></button>
        <button className={`${circle} !h-12 !w-12 text-zblue`} onClick={() => setView(true)} aria-label="View profile"><Info size={22} /></button><button className={`${circle} grad !border-0 text-white`} onClick={() => act("like")} disabled={busy} aria-label="Like"><Heart size={30} fill="currentColor" /></button></div>
      <div className="flex justify-center gap-4 text-xs text-mute"><button className="flex items-center gap-1 hover:text-red-600" onClick={() => setReport(true)}><Flag size={14} />Report</button><button className="flex items-center gap-1 hover:text-red-600" onClick={() => setBlockAsk(true)}><Ban size={14} />Block</button></div></>}
    {view && cur && <Modal onClose={() => setView(false)} label="Profile"><DateCardView card={cur} full /></Modal>}
    {report && cur && <Modal onClose={() => setReport(false)} label="Report profile"><h2 className="text-lg font-bold">Report {cur.username}</h2><p className="text-sm text-mute">Tell us what's wrong. Reports are reviewed by moderators and you won't see this profile again.</p><textarea className="inp mt-3" rows={3} maxLength={300} value={reason} onChange={e => setReason(e.target.value)} placeholder="What happened?" />
      <div className="mt-4 flex gap-2"><button className="btn flex-1" disabled={busy || !reason.trim()} onClick={sendReport}>Send report</button><button className="btn2" onClick={() => setReport(false)}>Cancel</button></div></Modal>}
    {blockAsk && cur && <Confirm title={`Block ${cur.username}?`} body="You won't see each other anywhere on ZINGO." label="Block" danger busy={busy} onYes={block} onNo={() => setBlockAsk(false)} />}
    {match && <Modal onClose={() => setMatch(null)} label="It's a match"><div className="space-y-4 text-center"><div className="mx-auto grid h-24 w-24 place-items-center overflow-hidden rounded-full grad text-4xl font-black text-white shadow-lg">{match.photos[0] ? <img src={mediaUrl(match.photos[0].url)} alt="" className="h-full w-full object-cover" /> : match.username[0].toUpperCase()}</div>
      <h2 className="text-2xl font-black">It's a match! ❤️</h2><p className="text-mute">You and <b className="text-ink">{match.username}</b> liked each other.</p>
      <div className="flex flex-col gap-2">{match.conversation && <button className="btn" onClick={() => nav(`/chat/${match.conversation}`)}>Send a message</button>}<button className="btn2" onClick={() => { setMatch(null); nav("/date?tab=matches"); }}>View match</button><button className="text-sm text-mute" onClick={() => setMatch(null)}>Keep browsing</button></div></div></Modal>}</div>);
}

function Matches() {
  const [items, setItems] = useState<DateMatchItem[] | null>(null); const [next, setNext] = useState<string | null>(null); const [err, setErr] = useState(""); const [ask, setAsk] = useState<{ kind: "unmatch" | "block"; m: DateMatchItem } | null>(null); const [busy, setBusy] = useState(false);
  const load = useCallback((url: string, reset: boolean) => api<CursorPage<DateMatchItem>>(url).then(r => { setItems(p => reset ? r.results : [...(p ?? []), ...r.results]); setNext(r.next); setErr(""); }).catch(e => { setErr(errText(e)); setItems(p => p ?? []); }), []);
  useEffect(() => { load("/api/date/matches/", true); }, [load]);
  const confirm = async () => { if (!ask) return; setBusy(true); try { if (ask.kind === "unmatch") await api("/api/date/unmatch/", { method: "POST", body: { username: ask.m.username } }); else await api(`/api/users/${ask.m.username}/block/`, { method: "POST" }); setItems(p => p!.filter(x => x.username !== ask.m.username)); setAsk(null); } catch (e) { setErr(errText(e)); setAsk(null); } finally { setBusy(false); } };
  return (<div className="mx-auto max-w-xl space-y-3 p-4">{items === null && [1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />)}
    {err && <p role="alert" className="text-red-600">{err} <button className="underline" onClick={() => load("/api/date/matches/", true)}>Retry</button></p>}
    {items?.length === 0 && !err && <p className="py-16 text-center text-mute">No matches yet. Keep discovering — when you both like each other, they'll show up here.</p>}
    {items?.map(m => <div key={m.username} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-sm"><span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full grad text-xl font-bold text-white">{m.photos[0] ? <img src={mediaUrl(m.photos[0].url)} alt="" className="h-full w-full object-cover" /> : m.username[0].toUpperCase()}</span>
      <div className="min-w-0 flex-1"><p className="truncate font-semibold">{m.username}{m.age ? `, ${m.age}` : ""}</p><p className="truncate text-xs text-mute">{m.city || m.interests.slice(0, 3).join(" · ")}</p></div>
      <div className="flex flex-col items-end gap-1">{m.conversation && <Link to={`/chat/${m.conversation}`} className="btn !px-4 !py-1 text-sm">Message</Link>}<span className="flex gap-3 text-xs text-mute"><button className="hover:text-red-600" onClick={() => setAsk({ kind: "unmatch", m })}>Unmatch</button><button className="hover:text-red-600" onClick={() => setAsk({ kind: "block", m })}>Block</button></span></div></div>)}
    {next && <button className="btn2 mx-auto block" onClick={() => load(next, false)}>Load more</button>}
    {ask && <Confirm title={ask.kind === "unmatch" ? `Unmatch ${ask.m.username}?` : `Block ${ask.m.username}?`} body={ask.kind === "unmatch" ? "You'll lose access to this chat and won't be matched again." : "You won't see each other anywhere on ZINGO."} label={ask.kind === "unmatch" ? "Unmatch" : "Block"} danger busy={busy} onYes={confirm} onNo={() => setAsk(null)} />}</div>);
}

export default function DatePage() {
  const [sp, setSp] = useSearchParams(); const [state, setState] = useState<DateState | null>(null); const [prefs, setPrefs] = useState<DatePrefs | null>(null); const [err, setErr] = useState("");
  const load = useCallback(async () => { try { const [s, p] = await Promise.all([api<DateState>("/api/date/profile/"), api<DatePrefs>("/api/date/preferences/")]); setState(s); setPrefs(p); setErr(""); } catch (e) { setErr(errText(e)); } }, []);
  useEffect(() => { load(); }, [load]);
  if (err) return <div className="p-8 text-center"><p role="alert" className="text-red-600">{err}</p><button className="btn mt-3" onClick={load}>Retry</button></div>;
  if (!state || !prefs) return <div className="mx-auto max-w-sm p-4"><div className="aspect-[3/4] animate-pulse rounded-3xl bg-gray-100" /></div>;
  if (!state.exists || !state.profile) return <Welcome state={state} onCreated={load} />;
  const p = state.profile;
  if (!p.is_active) return <Editor key="draft" profile={p} prefs={prefs} state={state} onSaved={load} active={false} />;
  const tab = sp.get("tab") ?? "discover"; const t = (k: string, label: string) => <button role="tab" aria-selected={tab === k} onClick={() => setSp({ tab: k })} className={`relative flex-1 py-3 text-sm font-semibold ${tab === k ? "text-ink" : "text-mute hover:text-ink"}`}>{label}{tab === k && <span className="absolute inset-x-6 bottom-0 h-0.5 rounded grad" />}</button>;
  return (<div><div role="tablist" aria-label="ZINGO Date" className="sticky top-0 z-10 mx-auto flex max-w-xl border-b border-line bg-white/95 backdrop-blur">{t("discover", "Discover")}{t("matches", "Matches")}{t("profile", "My profile")}</div>
    {tab === "discover" && <Discover onProfile={() => setSp({ tab: "profile" })} />}{tab === "matches" && <Matches />}{tab === "profile" && <Editor key="active" profile={p} prefs={prefs} state={state} onSaved={load} active />}</div>);
}
