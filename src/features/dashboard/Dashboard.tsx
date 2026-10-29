import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { api } from "../../api/client";
import { TrendsSchema } from "../../api/schemas";
import { useMe } from "../../auth/useAuth";
// import { Columns } from "../../components/charts"; // score distribution, commented out for now
import { Donut, HorizontalBars, PairedBars, TrendLine } from "../../components/charts";
import { buttonClass, Card, EmptyState, ErrorState, PageHeader, StatCard, StatusBadge } from "../../components/ui";
import { ruleLabel } from "../../lib/labels";

const DashboardSchema = z.object({
  cases_by_status: z.record(z.number()),
  decisions_by_action: z.record(z.number()),
  alerts_above_threshold_by_rule: z.record(z.number()),
  top_accounts_by_alerts: z.array(
    z.object({
      account_id: z.string(),
      alerts: z.number(),
      case_id: z.number().nullable(),
      case_status: z.string().nullable(),
    }),
  ),
  score_histogram: z.record(z.number()),
  failed_cases: z.number(),
});

const shortDay = (iso: string) => iso.slice(5); // "2022-09-01" -> "09-01"

export default function Dashboard() {
  const me = useMe();
  const isAdmin = me.data?.role === "admin";
  const dash = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => DashboardSchema.parse(await api<unknown>("/api/dashboard")),
  });
  const trends = useQuery({
    queryKey: ["dashboard-trends"],
    queryFn: async () => TrendsSchema.parse(await api<unknown>("/api/dashboard/trends?days=30")),
  });

  const navigate = useNavigate();
  if (dash.isLoading) return <p className="text-ink-600">Loading dashboard...</p>;
  if (dash.isError || !dash.data) return <ErrorState text="Could not load the dashboard." />;
  const d = dash.data;
  const openCases = d.cases_by_status["open"] ?? 0;
  const awaiting = d.cases_by_status["awaiting_review"] ?? 0;
  const approved = d.decisions_by_action["approve"] ?? 0;
  const closed = d.decisions_by_action["close"] ?? 0;
  const decisions = approved + closed;

  const activity = trends.data?.activity_by_day ?? [];
  const opened30 = activity.reduce((sum, r) => sum + r.cases_opened, 0);
  const decided30 = activity.reduce((sum, r) => sum + r.approved + r.closed, 0);

  const ruleRows = Object.entries(d.alerts_above_threshold_by_rule)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => ({ name: ruleLabel(name), value }));
  const alertTrend = (trends.data?.alerts_by_day ?? []).map((r) => ({ label: shortDay(r.day), value: r.alerts }));
  const activityRows = activity.slice(-14).map((r) => ({
    label: shortDay(r.day),
    a: r.cases_opened,
    b: r.approved,
  }));

  // Score distribution is hidden for now. Its data is still fetched, so it can come back without a backend change:
  // const scoreRows = Object.entries(d.score_histogram)
  //   .sort(([a], [b]) => Number(a) - Number(b))
  //   .map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        actions={isAdmin ? <Link to="/alerts" className={buttonClass()}>Alert queue</Link> : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open cases"
          value={openCases}
          trend={{ text: `${opened30} opened in 30 days`, tone: "neutral" }}
        />
        <StatCard
          label="Awaiting review"
          value={awaiting}
          trend={{ text: awaiting > 0 ? "needs a decision" : "queue clear", tone: awaiting > 0 ? "down" : "up" }}
        />
        <StatCard
          label="Failed cases"
          value={d.failed_cases}
          trend={{ text: d.failed_cases > 0 ? "check the audit log" : "no failures", tone: d.failed_cases > 0 ? "down" : "up" }}
        />
        <StatCard
          label="Decisions"
          value={decisions}
          trend={{ text: `${decided30} in 30 days`, tone: "neutral" }}
        />
      </div>

      {/* Row 1: cases and approvals, then the alert rules. */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Cases opened and approvals, last 14 days" className="h-full">
          <PairedBars rows={activityRows} seriesA="Cases opened" seriesB="Approved" empty="No case activity yet." />
        </Card>
        {isAdmin && (
          <Card title="Alerts above threshold by rule" className="h-full">
            <HorizontalBars rows={ruleRows} empty="No alerts above threshold." />
          </Card>
        )}
      </div>

      {/* Row 2: alerts per day (80%) with decisions (20%). QA has no alert chart, so decisions take the row. */}
      <div className="grid gap-6 xl:grid-cols-5">
        {isAdmin && (
          <Card title="Alerts per day" className="xl:col-span-4">
            <TrendLine rows={alertTrend} label="Alerts" empty="No alert history yet." />
          </Card>
        )}
        <Card title="Decisions" className={isAdmin ? "xl:col-span-1" : "xl:col-span-5"}>
          <Donut
            rows={[
              { name: "Approved", value: approved },
              { name: "Closed", value: closed },
            ]}
            empty="No decisions yet."
          />
        </Card>
      </div>

      {/* Row 3: one case per account. Each row opens the account's case. */}
      {isAdmin && (
        <Card title="Top accounts by alerts">
          {d.top_accounts_by_alerts.length === 0 ? (
            <EmptyState text="No accounts with alerts yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-400">
                    <th className="py-2 font-medium">Account</th>
                    <th className="py-2 font-medium">Case</th>
                    <th className="py-2 text-right font-medium">Alerts</th>
                    <th className="py-2 pl-6 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {d.top_accounts_by_alerts.map((a) => {
                    const target = a.case_id !== null ? `/cases/${a.case_id}` : `/alerts?account=${encodeURIComponent(a.account_id)}`;
                    return (
                      <tr
                        key={a.account_id}
                        onClick={() => navigate(target)}
                        className="cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-page/60"
                      >
                        <td className="py-3 font-mono text-ink-900">{a.account_id}</td>
                        <td className="py-3">
                          {a.case_id !== null ? (
                            <Link
                              to={`/cases/${a.case_id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-medium text-brand-600 hover:underline"
                            >
                              #{a.case_id}
                            </Link>
                          ) : (
                            <span className="text-ink-400">No case yet</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <span className="inline-flex min-w-8 justify-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-600">
                            {a.alerts}
                          </span>
                        </td>
                        <td className="py-3 pl-6">
                          {a.case_status !== null ? <StatusBadge status={a.case_status} /> : <span className="text-ink-400">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
