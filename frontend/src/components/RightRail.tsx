import { useEffect, useState } from "react"; import { Link } from "react-router-dom"; import { Hash, Swords } from "lucide-react";
import { api } from "../lib/api"; import { useAuth } from "../lib/auth"; import type { Battle, CursorPage, Suggestion } from "../lib/types"; import Avatar from "./Avatar"; import FollowButton from "./FollowButton";
/** Right column. Every section appears only if the backend returned real data for it. */
export default function RightRail() {
  const { user } = useAuth(); const [sug, setSug] = useState<Suggestion[]>([]); const [tags, setTags] = useState<{ tag: string; count: number }[]>([]); const [battles, setBattles] = useState<Battle[]>([]);
  useEffect(() => { api<Suggestion[]>("/api/suggestions/users/").then(setSug).catch(() => {}); api<{ tag: string; count: number }[]>("/api/trending/hashtags/").then(setTags).catch(() => {});
    api<CursorPage<Battle>>("/api/battles/?status=active").then(r => setBattles(r.results.slice(0, 3))).catch(() => {}); }, []);
  const card = "rounded-2xl border border-line bg-white p-4 shadow-sm"; const h = "mb-3 text-sm font-semibold text-mute";
  return (<aside className="sticky top-4 space-y-4" aria-label="Suggestions">
    {user && <Link to={`/u/${user.username}`} className="flex items-center gap-3 px-1"><Avatar name={user.username} size={52} /><div><p className="font-semibold">{user.username}</p><p className="text-xs text-mute">{user.followers} followers · {user.following} following</p></div></Link>}
    {sug.length > 0 && <section className={card}><h2 className={h}>Suggested for you</h2><ul className="space-y-3">{sug.map(s => (<li key={s.username} className="flex items-center gap-3"><Link to={`/u/${s.username}`}><Avatar name={s.username} size={40} /></Link>
      <div className="min-w-0 flex-1 leading-tight"><Link to={`/u/${s.username}`} className="block truncate text-sm font-semibold">{s.username}</Link><span className="text-xs text-mute">{s.followers} {s.followers === 1 ? "follower" : "followers"}</span></div><FollowButton username={s.username} small /></li>))}</ul></section>}
    {tags.length > 0 && <section className={card}><h2 className={h}>Trending this week</h2><ul className="space-y-2">{tags.slice(0, 6).map(t => <li key={t.tag}><Link to={`/search?q=%23${encodeURIComponent(t.tag)}`} className="flex items-center justify-between text-sm hover:text-zpurple"><span className="flex items-center gap-1.5"><Hash size={14} className="text-zpurple" />{t.tag}</span><span className="text-xs text-mute">{t.count}</span></Link></li>)}</ul></section>}
    {battles.length > 0 && <section className={card}><h2 className={h}>Live battles</h2><ul className="space-y-2">{battles.map(b => <li key={b.id}><Link to={`/battle/${b.id}`} className="flex items-center gap-2 text-sm hover:text-zpurple"><Swords size={16} className="text-zpink" /><span className="truncate">{b.title || (b.revealed ? `@${b.creator} vs @${b.opponent}` : "Blind battle")}</span><span className="ml-auto text-xs text-mute">{b.total_votes} votes</span></Link></li>)}</ul></section>}
    <p className="px-1 text-xs text-mute">ZINGO — Watch. Match. Create Your Vibe.</p></aside>);
}
