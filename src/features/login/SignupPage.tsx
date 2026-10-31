import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE, ApiError } from "../../api/client";
import { TokenSchema } from "../../api/schemas";
import { setToken } from "../../auth/session";
import { buttonClass, ErrorState } from "../../components/ui";

export const MIN_PASSWORD = 10;

/** The first problem with a sign-up form, or null when it can be sent. Mirrors the backend rules. */
export function signupError(email: string, password: string, confirm: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email address.";
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters for the password.`;
  if (password !== confirm) return "The two passwords do not match.";
  return null;
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = signupError(email, password, confirm);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new ApiError(res.status, body.detail ?? "Could not create the account.");
      }
      setToken(TokenSchema.parse(await res.json()).access_token);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the account.");
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
          <h1 className="mt-4 text-xl font-semibold text-ink-900">Create an account</h1>
          <p className="mt-1 text-sm text-ink-600">New accounts are reviewer (QA) accounts.</p>
        </div>
        <label className="block text-sm font-medium text-ink-900">
          Email
          <input className={field} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block text-sm font-medium text-ink-900">
          Password (at least {MIN_PASSWORD} characters)
          <div className="relative">
            <input
              className={`${field} pr-16`}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
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
        <label className="block text-sm font-medium text-ink-900">
          Confirm password
          <input
            className={field}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        {error && <ErrorState text={error} />}
        <button disabled={busy} className={`${buttonClass()} w-full py-2.5`}>
          {busy ? "Creating…" : "Create account"}
        </button>
        <p className="text-center text-sm text-ink-600">
          Already have an account? <Link to="/login" className="font-medium text-brand-600 hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
