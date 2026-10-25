import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { z } from "zod";
import { api } from "../../api/client";
import { CaseSchema } from "../../api/schemas";
import { buttonClass, Card, ErrorState, PageHeader, StatusBadge } from "../../components/ui";

const PageSchema = z.object({
  total: z.number(),
  offset: z.number(),
  limit: z.number(),
  items: z.array(CaseSchema),
});

const PAGE_SIZE = 25;
const STATUSES = ["open", "awaiting_review", "approved", "closed", "failed", "superseded"];

export default function CasesList() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");

  const query = new URLSearchParams({
    offset: String(page * PAGE_SIZE),
    limit: String(PAGE_SIZE),
    ...(status ? { status } : {}),
  }).toString();

  const cases = useQuery({
    queryKey: ["cases", page, status],
    queryFn: async () => PageSchema.parse(await api<unknown>(`/api/cases?${query}`)),
    placeholderData: keepPreviousData,
  });

  const totalPages = cases.data ? Math.max(1, Math.ceil(cases.data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Cases (${cases.data?.total ?? 0})`}
        subtitle="Every case opened from an alert, with its current status."
        actions={
          <label className="flex items-center gap-2 text-sm text-ink-600">
            Status
            <select
              className="rounded-lg bg-white px-3 py-2 text-ink-900 ring-1 ring-line"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(0); }}
            >
              <option value="">All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </label>
        }
      />

      {cases.isError && <ErrorState text="Could not load cases." />}
      {cases.isLoading && <p className="text-ink-600">Loading cases...</p>}

      {cases.data && (
        <Card flush>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-600">
                  <th className="px-5 py-3 font-medium">Case</th>
                  <th className="px-5 py-3 font-medium">Alert</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Score</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {cases.data.items.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0 hover:bg-page/60">
                    <td className="px-5 py-3 font-semibold text-ink-900">Case {c.id}</td>
                    <td className="px-5 py-3 text-ink-600">Alert {c.alert_id}</td>
                    <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-3 font-semibold text-ink-900">{c.risk_score.toFixed(2)}</td>
                    <td className="px-5 py-3 text-right">
                      <Link to={`/cases/${c.id}`} className="font-medium text-brand-600 hover:underline">Open</Link>
                    </td>
                  </tr>
                ))}
                {cases.data.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-ink-400">No cases match this filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
