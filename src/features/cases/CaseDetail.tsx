import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../../api/client";
import { CaseSchema, GraphSchema } from "../../api/schemas";
import AuditTimeline from "../../components/AuditTimeline";
import GraphView from "../../components/GraphView";
import { Card, ErrorState, StatusBadge } from "../../components/ui";
import DecisionForm from "../approvals/DecisionForm";

const SarSchema = z.object({ version: z.number(), body: z.record(z.any()) });

export default function CaseDetail() {
  const { caseId } = useParams();
  const id = Number(caseId);

  const caseQ = useQuery({
    queryKey: ["case", id],
    queryFn: async () => CaseSchema.parse(await api<unknown>(`/api/cases/${id}`)),
    refetchInterval: (q) => (q.state.data?.status === "open" ? 2000 : false),
  });
  const graphQ = useQuery({
    queryKey: ["graph", id],
    queryFn: async () => GraphSchema.parse(await api<unknown>(`/api/cases/${id}/graph`)),
  });
  const sarQ = useQuery({
    queryKey: ["sar", id],
    enabled: caseQ.data?.status === "awaiting_review" || caseQ.data?.status === "approved",
    queryFn: async () => SarSchema.parse(await api<unknown>(`/api/cases/${id}/sar`)),
    retry: false,
  });

  if (caseQ.isLoading) return <p className="text-ink-600">Loading case...</p>;
  if (!caseQ.data) return <ErrorState text="Case not found." />;

  const elements = graphQ.data
    ? [...graphQ.data.elements.nodes, ...graphQ.data.elements.edges]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <nav className="mb-2 text-sm text-ink-400">
          <Link to="/cases" className="hover:text-ink-900">Cases</Link> / Case {caseQ.data.id}
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-ink-900">Case {caseQ.data.id}</h1>
          <StatusBadge status={caseQ.data.status} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Transaction graph" className="xl:col-span-2">
          <GraphView elements={elements as never} />
        </Card>
        <AuditTimeline caseId={id} polling={caseQ.data.status === "open"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={sarQ.data ? `SAR draft (v${sarQ.data.version}, redacted)` : "SAR draft"}>
          {sarQ.data ? (
            <pre className="max-h-96 overflow-auto rounded-xl bg-page p-4 text-xs text-ink-900">
              {JSON.stringify(sarQ.data.body, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-ink-400">
              No SAR draft. It appears once the report step finishes, or it failed (see the timeline).
            </p>
          )}
        </Card>
        {caseQ.data.status === "awaiting_review" && <DecisionForm caseId={id} />}
      </div>
    </div>
  );
}
