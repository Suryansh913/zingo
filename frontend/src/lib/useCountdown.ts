import { useEffect, useState } from "react";
export function useCountdown(iso: string | null): { text: string; done: boolean } {
  const calc = () => iso ? Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000)) : -1;
  const [s, setS] = useState(calc);
  useEffect(() => { setS(calc()); if (!iso) return; const t = setInterval(() => setS(calc()), 1000); return () => clearInterval(t); }, [iso]);
  if (s < 0) return { text: "", done: false }; if (s === 0) return { text: "Ended", done: true };
  const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
  return { text: `${d ? d + "d " : ""}${h}h ${m}m ${s % 60}s`, done: false };
}
