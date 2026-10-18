import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { clearToken, getToken } from "../auth/session";
import { useMe } from "../auth/useAuth";

export default function Header() {
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  if (!getToken()) return null;

  function logout() {
    clearToken();
    qc.clear();
    navigate("/login", { replace: true });
  }

  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-3">
      <div className="flex items-center gap-4">
        <span className="font-semibold">AML Investigation Copilot</span>
        <nav className="flex gap-3 text-sm">
          <Link to="/" className="hover:underline">Dashboard</Link>
          <Link to="/alerts" className="hover:underline">Alerts</Link>
          <Link to="/cases" className="hover:underline">Cases</Link>
          {me.data?.role === "admin" && <Link to="/import" className="hover:underline">Import</Link>}
          {me.data?.role === "admin" && <Link to="/admin/projects" className="hover:underline">Projects</Link>}
          {me.data?.role === "qa" && <Link to="/qa/projects" className="hover:underline">My projects</Link>}
        </nav>
      </div>
      <div className="flex items-center gap-3 text-sm">
        {me.data ? (
          <>
            <span className="text-slate-700">{me.data.email}</span>
            <span className="rounded bg-slate-900 px-2 py-0.5 text-xs uppercase text-white" data-testid="role">
              {me.data.role}
            </span>
          </>
        ) : (
          <span className="text-slate-400">loading user…</span>
        )}
        <button onClick={logout} className="rounded border px-3 py-1 hover:bg-slate-100">Logout</button>
      </div>
    </header>
  );
}
