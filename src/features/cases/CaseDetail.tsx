import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../../api/client";
import { CaseSchema, GraphSchema } from "../../api/schemas";
import AuditTimeline from "../../components/AuditTimeline";
import GraphView from "../../components/GraphView";
import SarView from "../../components/SarView";
import { Card, ErrorState, StatusBadge } from "../../components/ui";
import DecisionForm from "../approvals/DecisionForm";
import type { SarBody } from "../approvals/sarPrefill";

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
        <Card id="transaction-graph" title="Transaction graph" className="xl:col-span-2">
          <GraphView elements={elements as never} />
        </Card>
        <AuditTimeline caseId={id} polling={caseQ.data.status === "open"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {sarQ.data ? (
          <SarView version={sarQ.data.version} body={sarQ.data.body as SarBody} />
        ) : (
          <Card title="SAR draft">
            <p className="text-sm text-ink-400">
              No SAR draft. It appears once the report step finishes, or it failed (see the timeline).
            </p>
          </Card>
        )}
        {caseQ.data.status === "awaiting_review" && (
          <DecisionForm caseId={id} sar={sarQ.data?.body as SarBody | undefined} />
        )}
      </div>
    </div>
  );
}
