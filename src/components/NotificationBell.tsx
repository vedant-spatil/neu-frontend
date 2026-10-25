import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
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

/** Bell with the unread count and a dropdown of recent notifications. The count is refreshed by the live stream. */
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => NotificationsSchema.parse(await api<unknown>("/api/notifications")),
  });

  const markRead = useMutation({
    mutationFn: (id: number) => api(`/api/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAll = useMutation({
    mutationFn: () => api(`/api/notifications/read-all`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = list.data?.unread ?? 0;

  function openItem(item: { id: number; link: string | null; read: boolean }) {
    if (!item.read) markRead.mutate(item.id);
    setOpen(false);
    if (item.link) navigate(item.link);
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications, ${unread} unread`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-ink-600 ring-1 ring-line hover:bg-page hover:text-ink-900"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-brand-600 px-1 text-center text-[10px] font-semibold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl bg-white p-2 shadow-lg ring-1 ring-line">
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
                  <span className="flex items-start gap-2">
                    {!item.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
                    <span>{item.message}</span>
                  </span>
                  {item.created_at && (
                    <span className="mt-0.5 block pl-4 text-xs text-ink-400">
                      {item.created_at.replace("T", " ").slice(0, 16)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
