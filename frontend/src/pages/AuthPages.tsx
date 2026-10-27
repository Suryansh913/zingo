import { useState, FormEvent } from "react"; import { Link, Navigate } from "react-router-dom";
import { api, ApiError } from "../lib/api"; import { useAuth } from "../lib/auth"; import { Logo } from "../components/Nav";
function Form({ mode }: { mode: "login" | "signup" }) {
  const { login, user } = useAuth(); const [f, setF] = useState({ username: "", password: "", email: "", date_of_birth: "" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: FormEvent) => { e.preventDefault(); setErr(""); setBusy(true);
    try { const body = mode === "login" ? { username: f.username, password: f.password } : { ...f, date_of_birth: f.date_of_birth || undefined };
      const r = await api<{ token: string }>(`/api/auth/${mode === "login" ? "login" : "register"}/`, { method: "POST", body }); await login(r.token);
    } catch (x) { setErr(x instanceof ApiError ? x.message : "Something went wrong."); } finally { setBusy(false); } };
  return (<div className="grid min-h-dvh place-items-center bg-soft p-4"><form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-3xl bg-white border border-line p-6">
    <div className="text-center"><Logo /><p className="text-sm text-mute">Watch. Match. Create Your Vibe.</p></div>
    <input className="inp" placeholder="Username" aria-label="Username" value={f.username} onChange={set("username")} required />
    {mode === "signup" && <><input className="inp" type="email" placeholder="Email (optional)" aria-label="Email" value={f.email} onChange={set("email")} />
      <label className="block text-xs text-mute">Date of birth (needed for safety features)<input className="inp mt-1" type="date" value={f.date_of_birth} onChange={set("date_of_birth")} /></label></>}
    <input className="inp" type="password" placeholder="Password (min 8 chars)" aria-label="Password" value={f.password} onChange={set("password")} required minLength={mode === "signup" ? 8 : 1} />
    {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
    <button className="btn w-full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
    <p className="text-center text-sm text-mute">{mode === "login" ? <>New here? <Link className="text-zpink" to="/signup">Sign up</Link></> : <>Have an account? <Link className="text-zpink" to="/login">Log in</Link></>}</p></form></div>);
}
export const Login = () => <Form mode="login" />; export const Signup = () => <Form mode="signup" />;
