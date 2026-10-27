import { forwardRef, useCallback, useEffect, useRef, useState, VideoHTMLAttributes } from "react";
import { Loader2, RotateCw } from "lucide-react";
type Props = Omit<VideoHTMLAttributes<HTMLVideoElement>, "src"> & { src: string; refresh?: () => Promise<string | null | undefined> };
const REASON: Record<number, string> = { 1: "Loading was cancelled.", 2: "A network problem interrupted the video.", 3: "This video couldn't be decoded.", 4: "This video's format isn't supported by your browser (or the link expired)." };
/** <video> with loading/buffering indicator, readable errors, and Retry. `refresh` fetches a fresh URL (signed media URLs expire). Place inside a `relative` parent. */
const ZVideo = forwardRef<HTMLVideoElement, Props>(function ZVideo({ src: srcProp, refresh, onError, onWaiting, onCanPlay, onPlaying, onLoadStart, onStalled, ...rest }, fwd) {
  const inner = useRef<HTMLVideoElement | null>(null); const [src, setSrc] = useState(srcProp); const UNAVAILABLE = "This video is unavailable right now."; const [state, setState] = useState<"loading" | "ready" | "error">(srcProp ? "loading" : "error"); const [reason, setReason] = useState(srcProp ? "" : UNAVAILABLE); const [busy, setBusy] = useState(false); const autoTried = useRef(false); const buffering = useRef<number>();
  useEffect(() => { setSrc(srcProp); autoTried.current = false; if (srcProp) { setState("loading"); setReason(""); } else { setState("error"); setReason(UNAVAILABLE); } }, [srcProp]);   // no URL (storage problem / lost file) => clear message + Retry (asks the server for a fresh URL)
  const setRef = (el: HTMLVideoElement | null) => { inner.current = el; if (typeof fwd === "function") fwd(el); else if (fwd) (fwd as React.MutableRefObject<HTMLVideoElement | null>).current = el; };
  const reload = useCallback(async (fresh: boolean) => { setBusy(true);
    try { let next = src; if (fresh && refresh) { const u = await refresh(); if (u) next = u; } if (!next) { setState("error"); setReason(UNAVAILABLE); return; } if (next !== src) setSrc(next); setState("loading"); setReason(""); requestAnimationFrame(() => { const el = inner.current; if (el) { el.load(); if (rest.autoPlay) el.play().catch(() => {}); } }); }
    catch { setState("error"); setReason("Couldn't reach the server to refresh this video."); } finally { setBusy(false); } }, [src, refresh, rest.autoPlay]);
  const fail = (e: React.SyntheticEvent<HTMLVideoElement>) => { onError?.(e); const code = e.currentTarget.error?.code ?? 0;
    if (refresh && !autoTried.current) { autoTried.current = true; reload(true); return; }   // first failure: silently try a fresh URL (expired signature) before bothering the user
    setReason(REASON[code] ?? "This video couldn't be loaded."); setState("error"); };
  const wait = () => { window.clearTimeout(buffering.current); buffering.current = window.setTimeout(() => setState(s => (s === "error" ? s : "loading")), 350); };
  const ok = () => { window.clearTimeout(buffering.current); setState("ready"); };
  return (<>
    <video {...rest} ref={setRef} src={src || undefined} onError={fail} onWaiting={e => { onWaiting?.(e); wait(); }} onStalled={e => { onStalled?.(e); wait(); }} onLoadStart={e => { onLoadStart?.(e); wait(); }} onCanPlay={e => { onCanPlay?.(e); ok(); }} onPlaying={e => { onPlaying?.(e); ok(); }} />
    {state === "loading" && <div className="pointer-events-none absolute inset-0 grid place-items-center" role="status" aria-label="Loading video"><Loader2 className="animate-spin text-white drop-shadow" size={34} /></div>}
    {state === "error" && <div className="absolute inset-0 z-10 grid place-items-center bg-black/65 p-4 text-center text-white" role="alert"><div className="space-y-3"><p className="text-sm">{reason}</p><button onClick={() => reload(true)} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"><RotateCw size={16} />{busy ? "Retrying…" : "Retry"}</button></div></div>}
  </>);
});
export default ZVideo;
