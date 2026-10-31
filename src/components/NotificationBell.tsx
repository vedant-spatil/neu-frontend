import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { api } from "../api/client";

const NotificationsSchema = z.object({
  unread: z.number(),
  items: z.array(
    z.object({
      id: z.number(),
      kind: z.string(),
      message: z.string(),
      link: z.string().nullable(),
      created_at: z.string().nullable(),
      read: z.boolean(),
    }),
  ),
});

/** Bell with the unread count and a dropdown of recent notifications. Closes on a click outside or Escape. The count
 * is refreshed by the live stream. */
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const root = useRef<HTMLDivElement>(null);

  const list = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => NotificationsSchema.parse(await api<unknown>("/api/notifications?limit=8")),
  });

  const markRead = useMutation({
    mutationFn: (id: number) => api(`/api/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAll = useMutation({
    mutationFn: () => api(`/api/notifications/read-all`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = list.data?.unread ?? 0;

  function openItem(item: { id: number; link: string | null; read: boolean }) {
    if (!item.read) markRead.mutate(item.id);
    setOpen(false);
    if (item.link) navigate(item.link);
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={`Notifications, ${unread} unread`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-10 w-10 place-items-center rounded-xl text-ink-600 hover:bg-page hover:text-ink-900"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-xl bg-white p-2 shadow-lg ring-1 ring-line">
          <div className="flex items-center justify-between px-2 py-1.5 text-sm font-semibold text-ink-900">
            Notifications
            {unread > 0 && (
              <button type="button" onClick={() => markAll.mutate()} className="text-xs font-medium text-brand-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          {list.data && list.data.items.length === 0 && (
            <p className="px-2 py-4 text-center text-sm text-ink-400">Nothing yet.</p>
          )}
          <ul className="max-h-96 overflow-auto">
            {list.data?.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openItem(item)}
                  className={`w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-page ${item.read ? "text-ink-600" : "font-medium text-ink-900"}`}
                >
                  <span className="flex items-start gap-2.5">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read ? "bg-transparent" : "bg-brand-600"}`} />
                    <span>{item.message}</span>
                  </span>
                  {item.created_at && (
                    <span className="mt-0.5 block pl-[18px] text-xs text-ink-400">
                      {item.created_at.replace("T", " ").slice(0, 16)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="mt-1 block rounded-lg px-2 py-2 text-center text-sm font-medium text-brand-600 hover:bg-page"
          >
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
