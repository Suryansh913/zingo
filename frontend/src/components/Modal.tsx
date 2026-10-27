import { ReactNode, useEffect } from "react";
/** Accessible centred dialog: Esc and scrim click close it. */
export default function Modal({ children, onClose, label }: { children: ReactNode; onClose: () => void; label: string }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}><div role="dialog" aria-modal="true" aria-label={label} onClick={e => e.stopPropagation()} className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-xl">{children}</div></div>;
}
