import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../../api/client";
import { CaseSchema, GraphSchema } from "../../api/schemas";
import { useMe } from "../../auth/useAuth";
import AuditTimeline from "../../components/AuditTimeline";
import GraphView from "../../components/GraphView";
import SarView from "../../components/SarView";
import { buttonClass, Card, ErrorState, StatusBadge } from "../../components/ui";
import DecisionForm from "../approvals/DecisionForm";
import type { SarBody } from "../approvals/sarPrefill";

const SarSchema = z.object({ version: z.number(), body: z.record(z.any()) });
const QaUsersSchema = z.array(z.object({ id: z.number(), email: z.string(), role: z.string() }));

export default function CaseDetail() {
  const { caseId } = useParams();
  const id = Number(caseId);
  const me = useMe();
  const qc = useQueryClient();
  const isAdmin = me.data?.role === "admin";

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
  const qaUsers = useQuery({
    queryKey: ["users", "qa"],
    enabled: isAdmin,
    queryFn: async () => QaUsersSchema.parse(await api<unknown>("/api/users?role=qa")),
  });

  const [assignee, setAssignee] = useState<number | "">("");
  const assign = useMutation({
    mutationFn: (userId: number) =>
      api(`/api/cases/${id}/assign`, { method: "POST", body: JSON.stringify({ user_id: userId }) }),
    onSuccess: () => {
      setAssignee("");
      qc.invalidateQueries({ queryKey: ["case", id] });
    },
  });

  const rerun = useMutation({
    mutationFn: () => api(`/api/cases/${id}/rerun`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["case", id] });
      qc.invalidateQueries({ queryKey: ["events", id] });
    },
  });

  if (caseQ.isLoading) return <p className="text-ink-600">Loading case...</p>;
  if (!caseQ.data) return <ErrorState text="Case not found." />;

  const elements = graphQ.data
    ? [...graphQ.data.elements.nodes, ...graphQ.data.elements.edges]
    : [];
  const status = caseQ.data.status;
  const assigneeEmail = qaUsers.data?.find((u) => u.id === caseQ.data.assignee_id)?.email;

  return (
    <div className="space-y-6">
      <div>
        <nav className="mb-2 text-sm text-ink-400">
          <Link to="/cases" className="hover:text-ink-900">{isAdmin ? "Cases" : "My cases"}</Link> / Case {caseQ.data.id}
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-ink-900">Case {caseQ.data.id}</h1>
            <StatusBadge status={status} />
            {caseQ.data.assignee_id != null && (
              <span className="text-sm text-ink-600">
                Assigned to {isAdmin ? assigneeEmail ?? `user ${caseQ.data.assignee_id}` : "you"}
              </span>
            )}
          </div>
        </div>
        {rerun.isError && <div className="mt-3"><ErrorState text="The rerun could not start." /></div>}
        {assign.isError && <div className="mt-3"><ErrorState text="The case could not be assigned." /></div>}
      </div>

      {isAdmin && (
        <Card title="Assignment">
          <div className="flex flex-wrap items-end gap-3 text-sm">
            <label className="flex min-w-64 flex-col font-medium text-ink-900">
              Reviewer (QA)
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value ? Number(e.target.value) : "")}
                className="mt-1.5 rounded-lg bg-white px-3 py-2 text-ink-900 ring-1 ring-line"
              >
                <option value="">Select a reviewer</option>
                {qaUsers.data?.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
              </select>
            </label>
            <button
              type="button"
              disabled={assignee === "" || assign.isPending}
              onClick={() => assignee !== "" && assign.mutate(assignee)}
              className={buttonClass()}
            >
              Assign case
            </button>
          </div>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card id="transaction-graph" title="Transaction graph" className="xl:col-span-2">
          <GraphView elements={elements as never} />
        </Card>
        <AuditTimeline
          caseId={id}
          polling={status === "open"}
          onRerun={status === "failed" ? () => rerun.mutate() : undefined}
          rerunning={rerun.isPending}
        />
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
        {status === "awaiting_review" && (
          <DecisionForm caseId={id} sar={sarQ.data?.body as SarBody | undefined} />
        )}
      </div>
    </div>
  );
}
