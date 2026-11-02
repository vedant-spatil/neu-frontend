import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../api/client";
import { buttonClass, Card, EmptyState } from "./ui";

const EventSchema = z.object({ node: z.string(), kind: z.string(), payload: z.record(z.any()), created_at: z.string() });
type CaseEvent = z.infer<typeof EventSchema>;

type Props = {
  caseId: number;
  polling: boolean;
  /** The button is always shown. It is enabled only when canRerun is set. */
  onRerun?: () => void;
  canRerun?: boolean;
  rerunning?: boolean;
  /** "Investigate" for a case that has not started, "Restart investigation" after that. */
  actionLabel?: string;
  /** Asked before the action runs. Omitted for an action that needs no confirmation. */
  confirmMessage?: string;
};

/** Accounts named in an event's payload (grouping events list them). */
function accountsOf(e: CaseEvent): string[] {
  const value = e.payload.accounts;
  return Array.isArray(value) ? value.filter((a): a is string => typeof a === "string") : [];
}

/** One plain line for a grouping event: who was added, merged or left out, and why. Null for other events. */
function summary(e: CaseEvent): string | null {
  if (e.kind === "incomplete" && Array.isArray(e.payload.failures)) {
    return `Not completed: ${e.payload.failures.join(", ")}. Review before deciding, or restart the investigation.`;
  }
  if (e.node !== "grouping") return null;
  const parts: string[] = [];
  const accounts = accountsOf(e);
  if (accounts.length) parts.push(`Accounts: ${accounts.join(", ")} (${accounts.length})`);
  const alerts = Array.isArray(e.payload.alert_ids) ? e.payload.alert_ids.length : 0;
  if (alerts) parts.push(`${alerts} alert${alerts === 1 ? "" : "s"} added`);
  if (Array.isArray(e.payload.excluded) && e.payload.excluded.length) {
    parts.push(`Left out (in an approved or closed case): ${e.payload.excluded.join(", ")}`);
  }
  const left = e.payload.model_alerts_left_out;
  if (typeof left === "number" && left > 0) parts.push(`${left} model alert${left === 1 ? "" : "s"} not grouped (per-account cap)`);
  if (Array.isArray(e.payload.cases)) parts.push(`Merged cases: ${e.payload.cases.join(", ")}`);
  if (typeof e.payload.winner === "number") parts.push(`Merged into case ${e.payload.winner}`);
  if (typeof e.payload.reason === "string") parts.push(e.payload.reason);
  return parts.length ? parts.join(" · ") : null;
}

// Append-only case_events for one case. Polls while the case is still running.
export default function AuditTimeline({
  caseId, polling, onRerun, canRerun = false, rerunning = false,
  actionLabel = "Restart investigation", confirmMessage,
}: Props) {
  const eventsQ = useQuery({
    queryKey: ["events", caseId],
    queryFn: async () => z.array(EventSchema).parse(await api<unknown>(`/api/cases/${caseId}/events`)),
    refetchInterval: polling ? 2000 : false,
  });
  const [account, setAccount] = useState("");

  const events = eventsQ.data ?? [];
  const accounts = [...new Set(events.flatMap(accountsOf))].sort();
  // Events that name no account (workflow steps) stay visible under any account filter.
  const shown = account
    ? events.filter((e) => accountsOf(e).length === 0 || accountsOf(e).includes(account))
    : events;

  const action = onRerun ? (
    <button
      type="button"
      disabled={!canRerun || rerunning}
      title={canRerun ? undefined : "Only cases that have not started, failed, or are awaiting review can be run"}
      onClick={() => {
        if (!confirmMessage || window.confirm(confirmMessage)) onRerun();
      }}
      className={buttonClass("secondary")}
    >
      {actionLabel}
    </button>
  ) : undefined;

  return (
    <Card title="Audit timeline" action={action}>
      {accounts.length > 1 && (
        <label className="mb-4 flex items-center gap-2 text-sm text-ink-600">
          Account
          <select
            aria-label="Filter timeline by account"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            className="rounded-lg bg-white px-3 py-1.5 text-ink-900 ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All accounts</option>
            {accounts.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
      )}
      {shown.length === 0 ? (
        <EmptyState text={events.length === 0 ? "No events yet." : "No events for this account."} />
      ) : (
        <ol className="relative space-y-4 border-l-2 border-line pl-5 text-sm">
          {shown.map((e, i) => {
            const isError = e.kind === "error" || e.node.endsWith("error");
            const message = typeof e.payload.error === "string" ? e.payload.error : null;
            const line = summary(e);
            return (
              <li key={i} className="relative">
                <span
                  className={`absolute -left-[1.7rem] top-1 h-3 w-3 rounded-full ring-4 ring-white ${
                    isError ? "bg-brand-600" : "bg-ink-400"
                  }`}
                />
                <div className="text-xs text-ink-400">{e.created_at.replace("T", " ").slice(0, 19)}</div>
                <div className={`font-medium ${isError ? "text-brand-600" : "text-ink-900"}`}>
                  {e.node} · {e.kind}
                </div>
                {line && <div className="mt-1 text-xs text-ink-600">{line}</div>}
                {isError && message && (
                  <div className="mt-1 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-600">{message}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
