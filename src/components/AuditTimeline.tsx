import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../api/client";
import { buttonClass, Card, EmptyState } from "./ui";

const EventSchema = z.object({ node: z.string(), kind: z.string(), payload: z.record(z.any()), created_at: z.string() });

type Props = {
  caseId: number;
  polling: boolean;
  /** Set only for failed cases. The button shows when this is passed. */
  onRerun?: () => void;
  rerunning?: boolean;
};

// Append-only case_events for one case. Polls while the case is still running.
export default function AuditTimeline({ caseId, polling, onRerun, rerunning = false }: Props) {
  const eventsQ = useQuery({
    queryKey: ["events", caseId],
    queryFn: async () => z.array(EventSchema).parse(await api<unknown>(`/api/cases/${caseId}/events`)),
    refetchInterval: polling ? 2000 : false,
  });

  const events = eventsQ.data ?? [];

  const action = onRerun ? (
    <button
      type="button"
      disabled={rerunning}
      onClick={() => {
        if (window.confirm("Rerun the investigation for this case? The earlier events are kept.")) onRerun();
      }}
      className={buttonClass("secondary")}
    >
      Rerun investigation
    </button>
  ) : undefined;

  return (
    <Card title="Audit timeline" action={action}>
      {events.length === 0 ? (
        <EmptyState text="No events yet." />
      ) : (
        <ol className="relative space-y-4 border-l-2 border-line pl-5 text-sm">
          {events.map((e, i) => {
            const isError = e.kind === "error" || e.node.endsWith("error");
            const message = typeof e.payload.error === "string" ? e.payload.error : null;
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
