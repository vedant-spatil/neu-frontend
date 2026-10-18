import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../api/client";

const EventSchema = z.object({ node: z.string(), kind: z.string(), payload: z.record(z.any()), created_at: z.string() });

type Props = { caseId: number; polling: boolean };

// Append-only case_events for one case. Polls while the case is still running.
export default function AuditTimeline({ caseId, polling }: Props) {
  const eventsQ = useQuery({
    queryKey: ["events", caseId],
    queryFn: async () => z.array(EventSchema).parse(await api<unknown>(`/api/cases/${caseId}/events`)),
    refetchInterval: polling ? 2000 : false,
  });

  return (
    <section>
      <h2 className="mb-2 font-medium">Audit timeline</h2>
      <ol className="space-y-1 text-sm">
        {eventsQ.data?.map((e, i) => (
          <li key={i} className="font-mono">{e.created_at} {e.node} {e.kind}</li>
        ))}
      </ol>
    </section>
  );
}
