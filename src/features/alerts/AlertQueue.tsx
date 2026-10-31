import { useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { api } from "../../api/client";
import { AlertSchema, CaseSchema } from "../../api/schemas";
import { buttonClass, Card, ErrorState, PageHeader } from "../../components/ui";
import { ruleLabel } from "../../lib/labels";

const PageSchema = z.object({
  total: z.number(),
  offset: z.number(),
  limit: z.number(),
  items: z.array(AlertSchema),
});

const PAGE_SIZE = 25;
const SORTS: [string, string][] = [
  ["score_desc", "Score, highest first"],
  ["score_asc", "Score, lowest first"],
  ["ts_desc", "Newest first"],
  ["ts_asc", "Oldest first"],
  ["amount_desc", "Amount, largest first"],
];

const RULES: [string, string][] = [
  ["R1_structuring", "Structuring"],
  ["R2_fan_out", "Fan-out"],
  ["R3_fan_in", "Fan-in"],
  ["R4_pass_through", "Pass-through"],
  ["R5_cycle", "Cycle"],
  ["R6_scatter_gather", "Scatter-gather"],
  ["R7_gather_scatter", "Gather-scatter"],
];

export default function AlertQueue() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rule, setRule] = useState("");
  const [searchParams] = useSearchParams();
  const [account, setAccount] = useState(searchParams.get("account") ?? "");
  const [sort, setSort] = useState("score_desc");

  const query = new URLSearchParams({
    offset: String(page * PAGE_SIZE),
    limit: String(PAGE_SIZE),
    sort,
    ...(rule ? { rule } : {}),
    ...(account.trim() ? { account: account.trim() } : {}),
  }).toString();

  const alerts = useQuery({
    queryKey: ["alerts", page, rule, account.trim(), sort],
    queryFn: async () => PageSchema.parse(await api<unknown>(`/api/alerts?${query}`)),
    placeholderData: keepPreviousData,
  });

  const open = useMutation({
    mutationFn: async (alertId: number) =>
      CaseSchema.parse(await api<unknown>(`/api/alerts/${alertId}/cases`, { method: "POST" })),
    onSuccess: (c) => navigate(`/cases/${c.id}`),
  });

  const totalPages = alerts.data ? Math.max(1, Math.ceil(alerts.data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Alert queue (${alerts.data?.total.toLocaleString() ?? 0})`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              placeholder="Search account ID…"
              value={account}
              onChange={(e) => { setAccount(e.target.value); setPage(0); }}
              className="w-56 rounded-lg bg-white px-3 py-2 font-mono text-sm text-ink-900 ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-500"
            />
            <label className="flex items-center gap-2 text-sm text-ink-600">
              Rule
              <select
                className="rounded-lg bg-white px-3 py-2 text-ink-900 ring-1 ring-line"
                value={rule}
                onChange={(e) => { setRule(e.target.value); setPage(0); }}
              >
                <option value="">All</option>
                {RULES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-600">
              Sort by
              <select
                className="rounded-lg bg-white px-3 py-2 text-ink-900 ring-1 ring-line"
                value={sort}
                onChange={(e) => { setSort(e.target.value); setPage(0); }}
              >
                {SORTS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
          </div>
        }
      />

      {alerts.isError && <ErrorState text="Could not load alerts." />}
      {alerts.isLoading && <p className="text-ink-600">Loading alerts...</p>}

      {alerts.data && (
        <Card flush>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-600">
                  <th className="px-5 py-3 font-medium">Account</th>
                  <th className="px-5 py-3 font-medium">Peak amount</th>
                  <th className="px-5 py-3 font-medium">First seen</th>
                  <th className="px-5 py-3 font-medium">Rules</th>
                  <th className="px-5 py-3 font-medium">Score</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {alerts.data.items.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => !open.isPending && open.mutate(a.id)}
                    className="cursor-pointer border-b border-line last:border-0 hover:bg-page/60"
                  >
                    <td className="px-5 py-3 font-mono text-ink-900">{a.account_id}</td>
                    <td className="px-5 py-3 text-ink-900">{a.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-5 py-3 text-ink-600">{a.ts.replace("T", " ").slice(0, 16)}</td>
                    <td className="px-5 py-3">
                      {a.rules.map((r) => (
                        <span key={r} className="mr-3 text-sm text-brand-600">{ruleLabel(r)}</span>
                      ))}
                    </td>
                    <td className="px-5 py-3 font-semibold text-ink-900">{a.risk_score.toFixed(2)}</td>
                    <td className="px-5 py-3 text-right text-sm font-medium text-brand-600">
                      {open.isPending && open.variables === a.id ? "Opening…" : "Open case"}
                    </td>
                  </tr>
                ))}
                {alerts.data.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-ink-400">No alerts match this filter.</td>
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
