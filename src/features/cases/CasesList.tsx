import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { z } from "zod";
import { api } from "../../api/client";
import { CaseSchema } from "../../api/schemas";

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

  if (cases.isLoading) return <p>Loading cases...</p>;
  if (cases.isError) return <p role="alert">Could not load cases.</p>;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Cases ({cases.data?.total ?? 0})</h1>
        <label className="text-sm">
          Status{" "}
          <select className="rounded border px-2 py-1" value={status}
                  onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

      <table className="w-full bg-white text-sm shadow">
        <thead className="bg-slate-100 text-left">
          <tr>
            <th className="p-2">Case</th><th className="p-2">Alert</th><th className="p-2">Status</th>
            <th className="p-2">Score</th><th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {cases.data?.items.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="p-2 font-mono">{c.id}</td>
              <td className="p-2">{c.alert_id}</td>
              <td className="p-2">{c.status}</td>
              <td className="p-2">{c.risk_score.toFixed(2)}</td>
              <td className="p-2"><Link to={`/cases/${c.id}`} className="underline">Open</Link></td>
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
