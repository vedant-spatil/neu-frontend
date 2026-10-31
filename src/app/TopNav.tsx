import { useState } from "react";
import { NavLink } from "react-router-dom";
import { getToken } from "../auth/session";
import { useMe } from "../auth/useAuth";
import Avatar from "../components/Avatar";
import NotificationBell from "../components/NotificationBell";
import { itemsFor, NavList } from "./Sidebar";
import { useLogout } from "./useLogout";

const MENU_PATH = {
  open: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6L6 18",
};

/**
 * The top bar. It sits in the page flow, above the content: the NEU mark on the left, and on the right the
 * notifications, the account picture (which opens /account) and a logout icon. On phones the menu button opens the nav links.
 */
export default function TopNav() {
  const me = useMe();
  const logout = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);
  if (!getToken()) return null;

  return (
    <>
      <header className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 md:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="grid h-10 w-10 place-items-center rounded-xl text-ink-600 ring-1 ring-line md:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d={menuOpen ? MENU_PATH.close : MENU_PATH.open} />
            </svg>
          </button>
          <span className="font-wordmark text-xl font-bold tracking-tight text-brand-600">NEU</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-3">
          <NotificationBell />
          <NavLink
            to="/account"
            aria-label="Your account"
            className="rounded-full ring-2 ring-transparent transition hover:ring-brand-500"
          >
            <Avatar size={36} />
          </NavLink>
          <button
            type="button"
            onClick={logout}
            aria-label="Log out"
            title="Log out"
            className="grid h-10 w-10 place-items-center rounded-xl text-ink-600 transition-colors hover:text-brand-600"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5V3h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-x-0 bottom-0 top-16 z-30 flex flex-col gap-1 overflow-auto bg-white p-4 md:hidden">
          <NavList items={itemsFor(me.data?.role)} showLabels onNavigate={() => setMenuOpen(false)} />
        </div>
      )}
    </>
  );
}
