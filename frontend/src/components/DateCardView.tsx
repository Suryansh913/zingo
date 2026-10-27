import { useState } from "react"; import { Link } from "react-router-dom"; import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { mediaUrl } from "../lib/api"; import type { DateCard } from "../lib/types";
const INTENT: Record<string, string> = { long_term: "Long-term", short_term: "Something casual", friends: "New friends", unsure: "Still figuring it out" };
/** Dating profile card. Used for discovery, the "how others see you" preview, and the full-profile dialog. Shows only fields that are safe to expose. */
export default function DateCardView({ card, full = false }: { card: DateCard; full?: boolean }) {
  const [i, setI] = useState(0); const n = card.photos.length; const go = (d: number) => setI(x => (x + d + n) % n);
  return (<article className="overflow-hidden rounded-3xl border border-line bg-white shadow-md">
    <div className="relative aspect-[3/4] bg-soft">
      {n > 0 ? <img src={mediaUrl(card.photos[i].url)} alt={`${card.username}'s photo ${i + 1} of ${n}`} className="h-full w-full object-cover" /> :
        <div className="grid h-full w-full place-items-center grad text-white"><span className="text-8xl font-black">{card.username[0]?.toUpperCase()}</span></div>}
      {n > 1 && <><div className="absolute inset-x-3 top-3 flex gap-1" aria-hidden>{card.photos.map((p, k) => <span key={p.id} className={`h-1 flex-1 rounded ${k === i ? "bg-white" : "bg-white/50"}`} />)}</div>
        <button onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-ink shadow"><ChevronLeft size={20} /></button>
        <button onClick={() => go(1)} aria-label="Next photo" className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-ink shadow"><ChevronRight size={20} /></button></>}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white"><h2 className="text-2xl font-bold">{card.username}{card.age ? `, ${card.age}` : ""}</h2>
        {card.city && <p className="flex items-center gap-1 text-sm text-white/90"><MapPin size={14} />{card.city}</p>}</div></div>
    <div className="space-y-3 p-4">
      {card.intention && <span className="inline-block rounded-full bg-soft px-3 py-1 text-xs font-semibold text-zpurple">{INTENT[card.intention] ?? card.intention}</span>}
      {card.bio && <p className={`text-sm text-ink/80 ${full ? "" : "line-clamp-3"}`}>{card.bio}</p>}
      {card.interests.length > 0 && <div className="flex flex-wrap gap-1.5">{card.interests.map(t => <span key={t} className={`rounded-full px-2.5 py-1 text-xs ${card.shared_interests.includes(t) ? "grad font-semibold text-white" : "bg-soft text-ink/80"}`}>{t}</span>)}</div>}
      {full && card.social_visible && <Link to={`/u/${card.username}`} className="text-sm font-semibold text-zpurple">View ZINGO profile →</Link>}</div></article>);
}
