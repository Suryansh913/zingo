import { Link, useLocation, useNavigate } from "react-router-dom";
/** A real 404 for unknown frontend URLs. (Unknown URLs are NOT silently redirected home, so broken links are noticeable.) */
export default function NotFound() {
  const { pathname } = useLocation(); const nav = useNavigate();
  return (<div className="grid min-h-[70dvh] place-items-center p-6 text-center"><div className="max-w-sm space-y-4"><p className="text-7xl font-black bg-clip-text text-transparent grad">404</p>
    <h1 className="text-xl font-bold">This page doesn't exist</h1><p className="break-all text-sm text-mute">We couldn't find <code>{pathname}</code>. The link may be wrong or the page was removed.</p>
    <div className="flex justify-center gap-2"><Link to="/" className="btn">Go home</Link><button className="btn2" onClick={() => nav(-1)}>Go back</button></div></div></div>);
}
