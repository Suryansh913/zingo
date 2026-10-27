import { useEffect, useState } from "react"; import { Link } from "react-router-dom"; import { api } from "../lib/api"; import type { Battle, CursorPage } from "../lib/types"; import BattleCard from "../components/BattleCard";
const TABS = [["open", "Open challenges"], ["active", "Live voting"], ["finished", "Results"]] as const;
export default function BattlesPage() {
  const [tab, setTab] = useState<string>("open"); const [items, setItems] = useState<Battle[] | null>(null); const [next, setNext] = useState<string | null>(null); const [err, setErr] = useState("");
  const load = (url: string, reset: boolean) => { setErr(""); api<CursorPage<Battle>>(url).then(r => { setItems(p => reset ? r.results : [...(p || []), ...r.results]); setNext(r.next); }).catch(e => { setErr(e.message); setItems(p => p ?? []); }); };
  useEffect(() => { setItems(null); load(`/api/battles/?status=${tab}`, true); }, [tab]);
  return (<div className="mx-auto max-w-3xl p-4"><div className="mb-4 flex items-center justify-between"><h1 className="text-2xl font-bold">⚔️ ZINGO Battles</h1>
    <div className="flex gap-2"><Link to="/battles/mine" className="btn2">My battles</Link><Link to="/battles/new" className="btn">Create</Link></div></div>
    <div className="mb-4 flex gap-2 overflow-x-auto" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "btn" : "btn2"} onClick={() => setTab(k)}>{l}</button>)}</div>
    {items === null && <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{[1, 2, 3].map(i => <div key={i} className="h-64 animate-pulse rounded-2xl bg-soft" />)}</div>}
    {err && <p role="alert" className="text-red-600">{err} <button className="underline" onClick={() => load(`/api/battles/?status=${tab}`, true)}>Retry</button></p>}
    {items?.length === 0 && !err && <p className="py-12 text-center text-mute">{tab === "open" ? "No open challenges right now. Start one!" : tab === "active" ? "No battles are live." : "No finished battles yet."}</p>}
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{items?.map(b => <BattleCard key={b.id} b={b} />)}</div>
    {next && <button className="btn2 mx-auto mt-4 block" onClick={() => load(next, false)}>Load more</button>}</div>);
}
