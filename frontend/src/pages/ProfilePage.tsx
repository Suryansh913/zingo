import { useEffect, useState } from "react"; import { Link, useParams } from "react-router-dom"; import { api, mediaUrl, ApiError } from "../lib/api"; import BattleCard from "../components/BattleCard"; import { useAuth } from "../lib/auth";
import type { Battle, CursorPage, Profile, Video } from "../lib/types";
export default function ProfilePage() {
  const { username } = useParams(); const { logout, refresh } = useAuth(); const [p, setP] = useState<Profile | null>(null); const [vids, setVids] = useState<Video[]>([]);
  const [next, setNext] = useState<string | null>(null); const [err, setErr] = useState(""); const [edit, setEdit] = useState(false); const [f, setF] = useState({ bio: "", city: "", is_private: false, date_of_birth: "", interests: "", language: "" }); const [dobLocked, setDobLocked] = useState(false); const [msg, setMsg] = useState(""); const [bats, setBats] = useState<Battle[]>([]);
  useEffect(() => { setP(null); setErr(""); setVids([]);
    api<Profile>(`/api/users/${username}/`).then(setP).catch(e => setErr(e.status === 404 ? "User not found." : e.message));
    api<CursorPage<Video>>(`/api/videos/?owner=${username}`).then(r => { setVids(r.results); setNext(r.next); }).catch(() => {});     api<CursorPage<Battle>>(`/api/users/${username}/battles/`).then(r => setBats(r.results)).catch(() => setBats([]));
  }, [username]);
  if (err) return <p role="alert" className="p-8 text-center text-ink/80">{err}</p>; if (!p) return <div className="p-8"><div className="h-24 animate-pulse rounded-2xl bg-soft" /></div>;
  const toggleFollow = async () => { try { await api(`/api/users/${p.username}/follow/`, { method: p.is_following ? "DELETE" : "POST" });
    setP({ ...p, is_following: !p.is_following, followers: p.followers + (p.is_following ? -1 : 1) }); } catch (e) { setMsg((e as Error).message); } };
  const save = async () => { try { const { date_of_birth, ...rest } = f; const r = await api<Profile>("/api/me/", { method: "PATCH", body: dobLocked || !date_of_birth ? rest : f }); setP({ ...p, ...r, is_me: true }); setEdit(false); refresh(); setMsg(""); } catch (e) { setMsg(e instanceof ApiError ? e.message : "Failed."); } };
  const more = async () => { if (!next) return; const r = await api<CursorPage<Video>>(next); setVids(v => [...v, ...r.results]); setNext(r.next); };
  return (<div className="mx-auto max-w-3xl p-4"><div className="flex items-center gap-4"><span className="grid h-20 w-20 place-items-center rounded-full text-3xl grad text-white">{p.username[0].toUpperCase()}</span>
    <div className="flex-1"><h1 className="text-xl font-bold">@{p.username}</h1><p className="text-sm text-mute">{p.city}</p>
      <p className="text-sm"><b>{p.followers}</b> followers · <b>{p.following}</b> following · <b>{vids.length}{next ? "+" : ""}</b> videos</p></div></div>
    <p className="my-3">{p.bio}</p>{msg && <p role="alert" className="text-sm text-red-600">{msg}</p>}
    {p.is_me ? <div className="flex gap-2"><button className="btn2" onClick={async () => { if (!edit) { try { const m = await api<Profile>("/api/me/"); setF({ bio: m.bio, city: m.city, is_private: m.is_private, date_of_birth: m.date_of_birth ?? "", interests: (m.interests ?? []).join(", "), language: m.language ?? "" }); setDobLocked(!!m.date_of_birth); } catch (e) { setMsg((e as Error).message); return; } } setEdit(!edit); }}>Edit profile</button><button className="btn2" onClick={logout}>Log out</button></div>
      : <div className="flex gap-2"><button className={p.is_following ? "btn2" : "btn"} onClick={toggleFollow}>{p.is_following ? "Following" : "Follow"}</button><Link to={`/chat/with/${p.username}`} className="btn2">Message</Link></div>}
    {edit && <div className="mt-3 space-y-2 rounded-2xl bg-white border border-line p-4"><input className="inp" aria-label="Bio" placeholder="Bio" maxLength={300} value={f.bio} onChange={e => setF({ ...f, bio: e.target.value })} />
      <input className="inp" aria-label="City or campus" placeholder="City or campus (approximate only)" value={f.city} onChange={e => setF({ ...f, city: e.target.value })} />
      <input className="inp" aria-label="Interests" placeholder="Interests, comma separated (used for Match)" value={f.interests} onChange={e => setF({ ...f, interests: e.target.value })} />
      <input className="inp" aria-label="Language" placeholder="Language code, e.g. en, hi" maxLength={10} value={f.language} onChange={e => setF({ ...f, language: e.target.value })} />
      <label className="block text-xs text-mute">Date of birth {dobLocked ? "(locked once set)" : "(required for Match; can't be changed later)"}<input className="inp mt-1" type="date" disabled={dobLocked} value={f.date_of_birth} onChange={e => setF({ ...f, date_of_birth: e.target.value })} /></label>
      <label className="flex gap-2"><input type="checkbox" checked={f.is_private} onChange={e => setF({ ...f, is_private: e.target.checked })} />Private account</label><button className="btn" onClick={save}>Save</button></div>}
    <div className="mt-6 grid grid-cols-3 gap-1">{vids.map(v => <Link key={v.id} to={`/video/${v.id}`} className="relative aspect-[9/16] overflow-hidden rounded-lg bg-white border border-line">
      {v.thumbnail ? <img loading="lazy" src={mediaUrl(v.thumbnail)} alt={v.caption} className="h-full w-full object-cover" /> : <video preload="metadata" src={mediaUrl(v.file) + "#t=0.5"} className="h-full w-full object-cover" />}
      <span className="absolute bottom-1 left-1 text-xs">💖 {v.like_count}</span></Link>)}</div>
    {bats.length > 0 && <section className="mt-8"><h2 className="mb-2 font-semibold">⚔️ Battle history</h2><div className="grid grid-cols-2 gap-3 md:grid-cols-3">{bats.map(b => <BattleCard key={b.id} b={b} />)}</div></section>}
    {vids.length === 0 && <p className="mt-8 text-center text-mute">No videos yet.</p>}{next && <button className="btn2 mx-auto mt-4 block" onClick={more}>Load more</button>}</div>);
}
