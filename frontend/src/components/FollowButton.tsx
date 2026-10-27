import { useState } from "react"; import { api, ApiError } from "../lib/api";
export default function FollowButton({ username, initial = false, small = false }: { username: string; initial?: boolean; small?: boolean }) {
  const [on, setOn] = useState(initial); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const click = async () => { setBusy(true); setErr(""); try { await api(`/api/users/${username}/follow/`, { method: on ? "DELETE" : "POST" }); setOn(!on); } catch (e) { setErr(e instanceof ApiError ? e.message : "Failed"); } finally { setBusy(false); } };
  return <button onClick={click} disabled={busy} title={err} aria-label={`${on ? "Unfollow" : "Follow"} ${username}`} className={small ? `text-xs font-semibold ${on ? "text-mute" : "text-zpurple hover:text-zpink"}` : on ? "btn2 !py-1 text-sm" : "btn !py-1 text-sm"}>{on ? "Following" : "Follow"}</button>;
}
