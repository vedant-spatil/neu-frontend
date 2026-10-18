import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { z } from "zod";
import { api } from "../../api/client";

const DashboardSchema = z.object({
  cases_by_status: z.record(z.number()),
  decisions_by_action: z.record(z.number()),
  alerts_above_threshold_by_rule: z.record(z.number()),
  top_accounts_by_alerts: z.array(z.object({ account_id: z.string(), alerts: z.number() })),
  score_histogram: z.record(z.number()),
  failed_cases: z.number(),
});

function Card({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded bg-white p-4 shadow">
      <div className="text-xs uppercase text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Bars({ data, empty }: { data: Record<string, number>; empty: string }) {
  const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
  const max = Math.max(1, ...entries.map(([, v]) => v));
  if (entries.length === 0) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="space-y-2 text-sm">
      {entries.map(([k, v]) => (
        <li key={k} className="flex items-center gap-2">
          <span className="w-44 truncate font-mono">{k}</span>
          <div className="h-3 flex-1 rounded bg-slate-100">
            <div className="h-3 rounded bg-slate-700" style={{ width: `${(v / max) * 100}%` }} />
          </div>
          <span className="w-12 text-right">{v}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Dashboard() {
  const q = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => DashboardSchema.parse(await api<unknown>("/api/dashboard")),
    refetchInterval: 30_000,
  });

  if (q.isLoading) return <p>Loading dashboard...</p>;
  if (q.isError || !q.data) return <p role="alert">Could not load dashboard.</p>;
  const d = q.data;
  const openCases = d.cases_by_status["open"] ?? 0;
  const awaiting = d.cases_by_status["awaiting_review"] ?? 0;
  const decisions = Object.values(d.decisions_by_action).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <Link to="/alerts" className="rounded bg-slate-900 px-3 py-1 text-sm text-white">Alert queue</Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card title="Open cases" value={openCases} />
        <Card title="Awaiting review" value={awaiting} />
        <Card title="Failed cases" value={d.failed_cases} />
        <Card title="Decisions" value={decisions} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded bg-white p-4 shadow">
          <h2 className="mb-3 font-medium">Alerts above threshold by rule</h2>
          <Bars data={d.alerts_above_threshold_by_rule} empty="No alerts above threshold." />
        </section>
        <section className="rounded bg-white p-4 shadow">
          <h2 className="mb-3 font-medium">Score distribution</h2>
          <Bars data={d.score_histogram} empty="No alerts yet." />
        </section>
        <section className="rounded bg-white p-4 shadow">
          <h2 className="mb-3 font-medium">Top accounts by alerts</h2>
          <table className="w-full text-sm">
            <tbody>
              {d.top_accounts_by_alerts.map((a) => (
                <tr key={a.account_id} className="border-t">
                  <td className="py-1 font-mono">{a.account_id}</td>
                  <td className="py-1 text-right">{a.alerts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="rounded bg-white p-4 shadow">
          <h2 className="mb-3 font-medium">Decisions by action</h2>
          <Bars data={d.decisions_by_action} empty="No decisions yet." />
        </section>
      </div>
    </div>
  );
}
