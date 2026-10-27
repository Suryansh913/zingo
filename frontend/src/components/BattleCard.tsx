import { Link } from "react-router-dom"; import { mediaUrl } from "../lib/api"; import type { Battle } from "../lib/types";
const label: Record<string, string> = { open: "Open challenge", pending: "Invitation", active: "Voting live", finished: "Finished", declined: "Declined", cancelled: "Cancelled", expired: "Expired" };
export default function BattleCard({ b }: { b: Battle }) {
  const names = b.revealed ? `@${b.creator ?? "?"} vs ${b.opponent ? "@" + b.opponent : "???"}` : "Blind battle — creators hidden";
  return (<Link to={`/battle/${b.id}`} className="block rounded-2xl bg-white border border-line p-3 transition hover:bg-gray-100">
    <div className="mb-2 flex items-center justify-between text-xs"><span className="rounded-full bg-soft px-2 py-0.5">{label[b.status]}</span>{b.blind && <span className="text-zpink">🕶 blind</span>}</div>
    <div className="grid grid-cols-2 gap-1">{[0, 1].map(i => { const e = b.entries[i]; return (<div key={i} className="aspect-[9/16] max-h-48 overflow-hidden rounded-lg bg-soft">
      {e?.video ? (e.video.thumbnail ? <img loading="lazy" src={mediaUrl(e.video.thumbnail)} alt="" className="h-full w-full object-cover" /> : <video preload="metadata" src={mediaUrl(e.video.file) + "#t=0.5"} className="h-full w-full object-cover" />)
        : <div className="grid h-full place-items-center text-xs text-mute">{e ? "Unavailable" : "Waiting…"}</div>}</div>); })}</div>
    <p className="mt-2 text-sm font-semibold">{b.title || names}</p><p className="text-xs text-mute">{b.title ? names + " · " : ""}{b.total_votes} votes{b.status === "finished" && b.winner ? ` · 🏆 @${b.winner}` : b.status === "finished" && b.result === "tie" ? " · Tie" : ""}</p></Link>);
}
