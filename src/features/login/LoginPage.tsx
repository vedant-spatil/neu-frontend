import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE, ApiError } from "../../api/client";
import { setToken } from "../../auth/session";
import { TokenSchema } from "../../api/schemas";
import { buttonClass, ErrorState } from "../../components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-line">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            AI
          </span>
          <h1 className="mt-4 text-xl font-semibold text-ink-900">Sign in</h1>
          <p className="mt-1 text-sm text-ink-600">AML Investigation Copilot</p>
        </div>
        <label className="block text-sm font-medium text-ink-900">
          Email
          <input className={field} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block text-sm font-medium text-ink-900">
          Password
          <input className={field} type="password" required value={password}
                 onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <ErrorState text={error} />}
        <button disabled={busy} className={`${buttonClass()} w-full py-2.5`}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
