import { useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { api } from "../../api/client";
import { AlertSchema, CaseSchema } from "../../api/schemas";

const PageSchema = z.object({
  total: z.number(),
  offset: z.number(),
  limit: z.number(),
  items: z.array(AlertSchema),
});

const PAGE_SIZE = 25;

export default function AlertQueue() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rule, setRule] = useState("");

  const query = new URLSearchParams({
    offset: String(page * PAGE_SIZE),
    limit: String(PAGE_SIZE),
    ...(rule ? { rule } : {}),
  }).toString();

  const alerts = useQuery({
    queryKey: ["alerts", page, rule],
    queryFn: async () => PageSchema.parse(await api<unknown>(`/api/alerts?${query}`)),
    placeholderData: keepPreviousData,
  });

  const open = useMutation({
    mutationFn: async (alertId: number) =>
      CaseSchema.parse(await api<unknown>(`/api/alerts/${alertId}/cases`, { method: "POST" })),
    onSuccess: (c) => navigate(`/cases/${c.id}`),
  });

  const totalPages = alerts.data ? Math.max(1, Math.ceil(alerts.data.total / PAGE_SIZE)) : 1;

  if (alerts.isLoading) return <p>Loading alerts...</p>;
  if (alerts.isError) return <p role="alert">Could not load alerts.</p>;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Alert queue ({alerts.data?.total ?? 0})</h1>
        <label className="text-sm">
          Rule{" "}
          <select className="rounded border px-2 py-1" value={rule}
                  onChange={(e) => { setRule(e.target.value); setPage(0); }}>
            <option value="">All</option>
            <option value="R1_structuring">Structuring</option>
            <option value="R2_fan_out">Fan-out</option>
            <option value="R3_fan_in">Fan-in</option>
            <option value="R4_pass_through">Pass-through</option>
            <option value="R5_cycle">Cycle</option>
            <option value="R6_scatter_gather">Scatter-gather</option>
            <option value="R7_gather_scatter">Gather-scatter</option>
          </select>
        </label>
      </div>

      <table className="w-full bg-white text-sm shadow">
        <thead className="bg-slate-100 text-left">
          <tr>
            <th className="p-2">Account</th><th className="p-2">Peak amount</th><th className="p-2">First seen</th>
            <th className="p-2">Rules</th><th className="p-2">Score</th><th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {alerts.data?.items.map((a) => (
            <tr key={a.id} className="border-t">
              <td className="p-2 font-mono">{a.account_id}</td>
              <td className="p-2">{a.amount.toFixed(2)}</td>
              <td className="p-2">{a.ts}</td>
              <td className="p-2">{a.rules.join(", ")}</td>
              <td className="p-2">{a.risk_score.toFixed(2)}</td>
              <td className="p-2">
                <button onClick={() => open.mutate(a.id)} disabled={open.isPending}
                        className="rounded bg-slate-900 px-2 py-1 text-white disabled:opacity-50">Open case</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <nav className="flex items-center justify-end gap-3 text-sm">
        <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}>Previous</button>
        <span>Page {page + 1} of {totalPages}</span>
        <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}>Next</button>
      </nav>
    </section>
  );
}
