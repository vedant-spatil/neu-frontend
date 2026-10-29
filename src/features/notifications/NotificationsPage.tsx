import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { api } from "../../api/client";
import { buttonClass, Card, EmptyState, ErrorState, PageHeader } from "../../components/ui";

const PAGE = 20;
const PageSchema = z.object({
  unread: z.number(),
  total: z.number(),
  offset: z.number(),
  limit: z.number(),
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

export default function NotificationsPage() {
  const [page, setPage] = useState(0);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["notifications-page", page],
    placeholderData: keepPreviousData,
    queryFn: async () =>
      PageSchema.parse(await api<unknown>(`/api/notifications?limit=${PAGE}&offset=${page * PAGE}`)),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notifications-page"] });
  };

  const markRead = useMutation({
    mutationFn: (id: number) => api(`/api/notifications/${id}/read`, { method: "POST" }),
    onSuccess: refresh,
  });

  const markAll = useMutation({
    mutationFn: () => api(`/api/notifications/read-all`, { method: "POST" }),
    onSuccess: refresh,
  });

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / PAGE)) : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Notifications${list.data ? ` (${list.data.total})` : ""}`}
        actions={
          list.data && list.data.unread > 0 ? (
            <button type="button" onClick={() => markAll.mutate()} className={buttonClass("secondary")}>
              Mark all read
            </button>
          ) : undefined
        }
      />

      {list.isError && <ErrorState text="Could not load notifications." />}

      {list.data && (
        <Card flush>
          {list.data.items.length === 0 ? (
            <EmptyState text="No notifications yet." />
          ) : (
            <ul className="divide-y divide-line">
              {list.data.items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.read) markRead.mutate(n.id);
                      if (n.link) navigate(n.link);
                    }}
                    className={`flex w-full items-start gap-4 px-5 py-4 text-left hover:bg-page/60 ${n.read ? "text-ink-600" : "text-ink-900"}`}
                  >
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-brand-600"}`} />
                    <span className="flex-1">
                      <span className={`block text-sm ${n.read ? "" : "font-semibold"}`}>{n.message}</span>
                      {n.created_at && (
                        <span className="mt-1 block text-xs text-ink-400">{n.created_at.replace("T", " ").slice(0, 16)}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <nav className="flex items-center justify-end gap-3 text-sm text-ink-600">
        <button className={buttonClass("secondary")} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span>Page {page + 1} of {totalPages}</span>
        <button className={buttonClass("secondary")} disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </nav>
    </div>
  );
}
