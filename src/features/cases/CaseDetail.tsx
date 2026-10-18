import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../../api/client";
import { CaseSchema, GraphSchema } from "../../api/schemas";
import AuditTimeline from "../../components/AuditTimeline";
import GraphView from "../../components/GraphView";
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

  if (caseQ.isLoading) return <p>Loading case...</p>;
  if (!caseQ.data) return <p role="alert">Case not found.</p>;

  const elements = graphQ.data
    ? [...graphQ.data.elements.nodes, ...graphQ.data.elements.edges]
    : [];

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">Case {caseQ.data.id}</h1>
        <span className="rounded bg-slate-200 px-2 py-1 text-sm">{caseQ.data.status}</span>
      </header>

      <section>
        <h2 className="mb-2 font-medium">Transaction graph</h2>
        <GraphView elements={elements as never} />
      </section>

      <AuditTimeline caseId={id} polling={caseQ.data.status === "open"} />

      {sarQ.data && (
        <section>
          <h2 className="mb-2 font-medium">SAR draft (v{sarQ.data.version}, redacted)</h2>
          <pre className="overflow-x-auto rounded bg-white p-3 text-xs">{JSON.stringify(sarQ.data.body, null, 2)}</pre>
        </section>
      )}

      {caseQ.data.status === "awaiting_review" && <DecisionForm caseId={id} />}
    </div>
  );
}
