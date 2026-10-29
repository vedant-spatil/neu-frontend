import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { getToken } from "../auth/session";
import { useMe } from "../auth/useAuth";

export type Item = { to: string; label: string; icon: ReactNode };

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

/** The navigation items for a role. Admin sees the alert queue and import; QA sees only their own cases and projects. */
export function itemsFor(role: string | undefined): Item[] {
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

/**
 * The links. Labels show on the desktop rail only when it is hovered (the rail is inside a `group/side`), and always
 * when showLabels is set, as in the phone menu.
 */
export function NavList({ items, onNavigate, showLabels = false }: { items: Item[]; onNavigate?: () => void; showLabels?: boolean }) {
  const labelClass = showLabels ? "" : "opacity-0 transition-opacity group-hover/side:opacity-100";
  return (
    <>
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === "/"} className={linkClass} onClick={onNavigate}>
          {({ isActive }) => (
            <>
              {isActive && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand-600" />}
              <span className="shrink-0">{item.icon}</span>
              <span className={`whitespace-nowrap ${labelClass}`}>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </>
  );
}

/**
 * The desktop navigation: a floating rounded panel at the left edge, below the top bar. It is narrow by default and
 * widens on hover to show the labels. Phones use the menu in the top bar instead.
 */
export default function Sidebar() {
  const me = useMe();
  if (!getToken()) return null;
  return (
    <aside className="group/side fixed bottom-4 left-4 top-20 z-20 hidden w-[72px] flex-col gap-1 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-line transition-[width] duration-200 hover:w-56 md:flex">
      <NavList items={itemsFor(me.data?.role)} />
    </aside>
  );
}
