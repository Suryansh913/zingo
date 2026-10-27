import { useEffect, useState } from "react"; import { Link } from "react-router-dom"; import { api } from "../lib/api"; import type { Battle, CursorPage } from "../lib/types"; import BattleCard from "../components/BattleCard";
export default function MyBattles() {
  const [items, setItems] = useState<Battle[] | null>(null); const [next, setNext] = useState<string | null>(null); const [err, setErr] = useState("");
  const load = (url: string) => api<CursorPage<Battle>>(url).then(r => { setItems(p => [...(p || []), ...r.results]); setNext(r.next); }).catch(e => { setErr(e.message); setItems(p => p ?? []); });
  useEffect(() => { load("/api/battles/mine/"); }, []);
  const sec = (t: string, list: Battle[]) => list.length ? <section key={t} className="mb-6"><h2 className="mb-2 font-semibold">{t}</h2><div className="grid grid-cols-2 gap-3 md:grid-cols-3">{list.map(b => <BattleCard key={b.id} b={b} />)}</div></section> : null;
  if (!items) return <p className="p-8 text-center text-mute">Loading…</p>;
  return (<div className="mx-auto max-w-3xl p-4"><div className="mb-4 flex justify-between"><h1 className="text-2xl font-bold">My battles</h1><Link to="/battles/new" className="btn">Create</Link></div>
    {err && <p role="alert" className="text-red-600">{err}</p>}
    {items.length === 0 && !err && <p className="py-12 text-center text-mute">No battles yet. <Link className="text-zpink" to="/battles/new">Create one</Link>.</p>}
    {sec("📩 Invitations for you", items.filter(b => b.viewer.can_accept && b.status === "pending"))}
    {sec("🔴 Live", items.filter(b => b.status === "active"))}
    {sec("⏳ Waiting for an opponent", items.filter(b => ["open", "pending"].includes(b.status) && !b.viewer.can_accept))}
    {sec("🏁 History", items.filter(b => ["finished", "declined", "cancelled", "expired"].includes(b.status)))}
    {next && <button className="btn2 mx-auto block" onClick={() => load(next)}>Load more</button>}</div>);
}
