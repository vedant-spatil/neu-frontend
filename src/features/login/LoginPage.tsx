import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE, ApiError } from "../../api/client";
import { setToken } from "../../auth/session";
import { TokenSchema } from "../../api/schemas";

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

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-16 max-w-sm space-y-4 rounded-lg bg-white p-6 shadow">
      <h1 className="text-lg font-semibold">Sign in</h1>
      <label className="block text-sm">
        Email
        <input className="mt-1 w-full rounded border px-3 py-2" type="email" required value={email}
               onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="block text-sm">
        Password
        <input className="mt-1 w-full rounded border px-3 py-2" type="password" required value={password}
               onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button disabled={busy} className="w-full rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50">
        {busy ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
