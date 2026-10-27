import { useState, ReactNode } from "react"; import { Link, NavLink, useLocation } from "react-router-dom";
import { Bell, Clapperboard, Compass, GitBranch, Heart, Home, Menu, MessageCircle, Search, SquarePlus, Swords, User, Video, X, type LucideIcon } from "lucide-react";
import { useAuth } from "../lib/auth"; import { useRealtime } from "../lib/realtime";
export const Logo = ({ className = "text-3xl" }: { className?: string }) => <span className={`font-black tracking-tight bg-clip-text text-transparent grad ${className}`}>ZINGO</span>;
const Badge = ({ n }: { n: number }) => n > 0 ? <span className="absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-zpink px-1 text-[10px] font-bold text-white ring-2 ring-white" aria-label={`${n} unread`}>{n > 99 ? "99+" : n}</span> : null;
interface Item { to: string; label: string; Icon: LucideIcon; end?: boolean; badge?: number; }
export default function Nav({ children }: { children: ReactNode }) {
  const { user } = useAuth(); const { chatUnread, notifUnread } = useRealtime(); const { pathname } = useLocation(); const [more, setMore] = useState(false);
  const items: Item[] = [{ to: "/", label: "Home", Icon: Home, end: true }, { to: "/search", label: "Search", Icon: Search }, { to: "/explore", label: "Explore", Icon: Compass },
    { to: "/zings", label: "ZINGS", Icon: Clapperboard }, { to: "/whatnext", label: "WHATNEXT", Icon: GitBranch }, { to: "/battles", label: "Battles", Icon: Swords }, { to: "/match", label: "ZINGO Match", Icon: Video }, { to: "/date", label: "ZINGO Date ❤️", Icon: Heart },
    { to: "/chat", label: "Messages", Icon: MessageCircle, badge: chatUnread }, { to: "/notifications", label: "Notifications", Icon: Bell, badge: notifUnread },
    { to: "/upload", label: "Create", Icon: SquarePlus }, { to: `/u/${user?.username}`, label: "Profile", Icon: User }];
  const get = (to: string) => items.find(i => i.to === to)!;
  const immersive = /^\/(zings|match)/.test(pathname) || /^\/chat\/\d+/.test(pathname);   // full-height video/chat screens manage their own header
  const side = ({ isActive }: { isActive: boolean }) => `flex items-center gap-4 rounded-xl p-3 transition hover:bg-gray-100 ${isActive ? "bg-soft font-semibold text-zpink" : "text-ink/80"}`;
  const bottom = ["/", "/search", "/upload", "/zings"].map(p => items.find(i => i.to === p)!).concat(items[items.length - 1]);
  return (<div className="h-dvh md:flex">
    <aside className="sticky top-0 hidden h-dvh w-[72px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-line bg-white p-3 md:flex xl:w-64" aria-label="Primary">
      <Link to="/" className="mb-4 block px-3 py-2" aria-label="ZINGO home"><Logo className="hidden text-3xl xl:inline" /><Logo className="text-2xl xl:hidden" /><span className="mt-0.5 hidden text-xs text-mute xl:block">Watch. Match. Create Your Vibe.</span></Link>
      {items.map(({ to, label, Icon, end, badge }) => <NavLink key={to} to={to} end={end} className={side} aria-label={label}><span className="relative"><Icon size={26} strokeWidth={2} />{badge ? <Badge n={badge} /> : null}</span><span className="hidden xl:inline">{label}</span></NavLink>)}
    </aside>
    <main className="relative min-h-0 flex-1 overflow-y-auto pb-16 md:pb-0">
      {!immersive && <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur md:hidden"><Link to="/" aria-label="ZINGO home"><Logo className="text-2xl" /></Link>
        <div className="flex items-center gap-4">{[get("/notifications"), get("/chat")].map(({ to, label, Icon, badge }) => <Link key={to} to={to} aria-label={label} className="relative text-ink"><Icon size={24} />{badge ? <Badge n={badge} /> : null}</Link>)}
          <button onClick={() => setMore(true)} aria-label="More" className="text-ink"><Menu size={24} /></button></div></header>}
      {children}</main>
    {more && <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setMore(false)}><div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-4 pb-8" onClick={e => e.stopPropagation()}>
      <div className="mb-3 flex items-center justify-between"><b>More from ZINGO</b><button onClick={() => setMore(false)} aria-label="Close"><X size={22} /></button></div>
      <div className="grid grid-cols-2 gap-3">{["/date", "/explore", "/whatnext", "/battles", "/match"].map(get).map(({ to, label, Icon }) => <Link key={to} to={to} onClick={() => setMore(false)} className="flex items-center gap-3 rounded-2xl border border-line bg-soft p-4 font-medium"><Icon size={22} className="text-zpurple" />{label}</Link>)}</div></div></div>}
    <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Main">
      {bottom.map(({ to, label, Icon, end }) => <NavLink key={to} to={to} end={end} aria-label={label} className={({ isActive }) => `p-3.5 ${isActive ? "text-zpink" : "text-ink/70"}`}><Icon size={26} /></NavLink>)}</nav></div>);
}
