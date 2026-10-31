import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE, ApiError } from "../../api/client";
import { setToken } from "../../auth/session";
import { TokenSchema } from "../../api/schemas";
import { buttonClass, ErrorState } from "../../components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new ApiError(res.status, "Invalid email or password");
      const tok = TokenSchema.parse(await res.json());
      setToken(tok.access_token);
      navigate(params.get("next") ?? "/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "mt-1.5 w-full rounded-lg bg-white px-3 py-2.5 text-ink-900 ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-line">
        <div className="text-center">
          <span className="font-wordmark text-3xl font-bold tracking-tight text-brand-600">NEU</span>
          <h1 className="mt-4 text-xl font-semibold text-ink-900">Sign in</h1>
        </div>
        <label className="block text-sm font-medium text-ink-900">
          Email
          <input className={field} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block text-sm font-medium text-ink-900">
          Password
          <div className="relative">
            <input className={`${field} pr-16`} type={showPassword ? "text" : "password"} required value={password}
                   onChange={(e) => setPassword(e.target.value)} />
            <button
              type="button"
              aria-pressed={showPassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((on) => !on)}
              className="absolute inset-y-0 right-2 my-auto h-7 rounded-md px-2 text-xs font-medium text-ink-600 hover:bg-page hover:text-ink-900"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>
        {error && <ErrorState text={error} />}
        <button disabled={busy} className={`${buttonClass()} w-full py-2.5`}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
        <p className="text-center text-sm text-ink-600">
          New reviewer? <Link to="/signup" className="font-medium text-brand-600 hover:underline">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
