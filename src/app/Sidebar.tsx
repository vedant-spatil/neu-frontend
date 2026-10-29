import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { NavLink, useNavigate } from "react-router-dom";
import { clearToken, getToken } from "../auth/session";
import { useMe } from "../auth/useAuth";
import NotificationBell from "../components/NotificationBell";

type Item = { to: string; label: string; icon: ReactNode };

const icon = (d: string) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const ICONS = {
  dashboard: icon("M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"),
  alerts: icon("M12 3 2 21h20L12 3zM12 10v4M12 17h.01"),
  cases: icon("M4 4h16v16H4zM8 9h8M8 13h8M8 17h5"),
  import: icon("M12 3v12M7 8l5-5 5 5M4 17v3h16v-3"),
  projects: icon("M3 7h18v12H3zM3 7l3-4h5l2 2h8"),
};

function itemsFor(role: string | undefined): Item[] {
  const items: Item[] = [{ to: "/", label: "Dashboard", icon: ICONS.dashboard }];
  if (role === "admin") items.push({ to: "/alerts", label: "Alerts", icon: ICONS.alerts });
  items.push({ to: "/cases", label: role === "qa" ? "My cases" : "Cases", icon: ICONS.cases });
  if (role === "admin") items.push({ to: "/import", label: "Import", icon: ICONS.import });
  items.push({
    to: role === "qa" ? "/qa/projects" : "/admin/projects",
    label: role === "qa" ? "My projects" : "Projects",
    icon: ICONS.projects,
  });
  return items;
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `group/item relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${
    isActive ? "bg-brand-50 font-semibold text-brand-600" : "text-ink-600 hover:bg-page hover:text-ink-900"
  }`;

function NavList({ items, onNavigate }: { items: Item[]; onNavigate?: () => void }) {
  return (
    <>
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === "/"} className={linkClass} onClick={onNavigate}>
          {({ isActive }) => (
            <>
              {isActive && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand-600" />}
              <span className="shrink-0">{item.icon}</span>
              <span className="whitespace-nowrap opacity-0 transition-opacity group-hover/side:opacity-100">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </>
  );
}

/** Left navigation rail on desktop (expands on hover to show labels). On phones it becomes a top bar with a menu. */
export default function Sidebar() {
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  if (!getToken()) return null;

  const role = me.data?.role;
  const items = itemsFor(role);
  const initial = me.data?.email?.[0]?.toUpperCase() ?? "?";

  function logout() {
    clearToken();
    qc.clear();
    navigate("/login", { replace: true });
  }

  return (
    <>
      {/* Desktop rail */}
      <aside className="group/side fixed inset-y-0 left-0 z-20 hidden w-[72px] flex-col border-r border-line bg-white transition-[width] duration-200 hover:w-56 md:flex">
        <div className="flex h-16 items-center px-5">
          <span className="font-wordmark text-xl font-bold tracking-tight text-brand-600">NEU</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          <NavList items={items} />
        </nav>
        <div className="flex flex-col gap-2 border-t border-line px-3 py-3">
          <div className="flex h-10 items-center pl-1">
            <NotificationBell />
          </div>
          <NavLink to="/account" className={linkClass}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white">{initial}</span>
            <span className="whitespace-nowrap opacity-0 transition-opacity group-hover/side:opacity-100">Account</span>
          </NavLink>
          <button
            type="button"
            onClick={logout}
            className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm text-ink-600 hover:bg-page hover:text-ink-900"
          >
            <span className="shrink-0">{icon("M9 21H5V3h4M16 17l5-5-5-5M21 12H9")}</span>
            <span className="whitespace-nowrap opacity-0 transition-opacity group-hover/side:opacity-100">Logout</span>
          </button>
        </div>
      </aside>

      {/* Phone top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-white px-4 py-3 md:hidden">
        <span className="font-wordmark text-xl font-bold tracking-tight text-brand-600">NEU</span>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="grid h-10 w-10 place-items-center rounded-xl text-ink-600 ring-1 ring-line"
          >
            {icon(menuOpen ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16")}
          </button>
        </div>
      </header>
      {menuOpen && (
        <div className="fixed inset-x-0 bottom-0 top-[57px] z-20 flex flex-col gap-1 overflow-auto bg-white p-4 md:hidden">
          <NavList items={items} onNavigate={() => setMenuOpen(false)} />
          <NavLink to="/account" onClick={() => setMenuOpen(false)} className={linkClass}>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white">{initial}</span>
            <span>Account</span>
          </NavLink>
          <button type="button" onClick={logout} className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm text-ink-600 hover:bg-page">
            Logout
          </button>
        </div>
      )}
    </>
  );
}
