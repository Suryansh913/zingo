import { ReactNode } from "react";
/** Modal frame for the bottom-sheet components (Comments, SendVideo): scrim + centred phone-width column. */
export default function Sheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}><div className="relative mx-auto h-full max-w-md" onClick={e => e.stopPropagation()}>{children}</div></div>;
}
