import { useQueryClient } from "@tanstack/react-query";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { clearToken, getToken } from "../auth/session";
import { useMe } from "../auth/useAuth";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `border-b-2 pb-1 text-sm transition-colors ${
    isActive ? "border-brand-600 font-medium text-brand-600" : "border-transparent text-ink-600 hover:text-ink-900"
  }`;

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

  const initial = me.data?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2" aria-label="Go to dashboard">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              NEU
            </span>
            <span className="font-semibold text-ink-900">AML Investigation Copilot</span>
          </Link>
          <nav className="flex items-center gap-6">
            <NavLink to="/" end className={linkClass}>Dashboard</NavLink>
            <NavLink to="/alerts" className={linkClass}>Alerts</NavLink>
            <NavLink to="/cases" className={linkClass}>Cases</NavLink>
            {me.data?.role === "admin" && <NavLink to="/import" className={linkClass}>Import</NavLink>}
            {me.data?.role === "admin" && <NavLink to="/admin/projects" className={linkClass}>Projects</NavLink>}
            {me.data?.role === "qa" && <NavLink to="/qa/projects" className={linkClass}>My projects</NavLink>}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {me.data ? (
            <>
              <span className="hidden text-ink-600 md:inline">{me.data.email}</span>
              <span
                className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold uppercase text-brand-600"
                data-testid="role"
              >
                {me.data.role}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                {initial}
              </span>
            </>
          ) : (
            <span className="text-ink-400">loading user…</span>
          )}
          <button
            onClick={logout}
            className="rounded-lg px-3 py-1.5 text-ink-600 ring-1 ring-line hover:bg-page hover:text-ink-900"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
