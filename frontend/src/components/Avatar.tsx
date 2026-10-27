/** Letter avatar (ZINGO has no profile photos yet). `ring` draws the Instagram-style gradient story ring; `seen` greys it. */
export default function Avatar({ name, size = 40, ring = false, seen = false, className = "" }: { name: string; size?: number; ring?: boolean; seen?: boolean; className?: string }) {
  const dot = <span className="grid place-items-center rounded-full grad font-bold text-white" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden>{(name[0] ?? "?").toUpperCase()}</span>;
  if (!ring) return <span className={`inline-block ${className}`}>{dot}</span>;
  return <span className={`inline-block rounded-full p-[2.5px] ${seen ? "bg-gray-300" : "grad-ring"} ${className}`}><span className="block rounded-full bg-white p-[2px]">{dot}</span></span>;
}
