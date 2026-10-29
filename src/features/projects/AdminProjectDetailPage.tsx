import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../../api/client";
import { EvaluationSchema, ProjectDetailSchema, UserOptionSchema } from "../../api/schemas";
import { buttonClass, Card, EmptyState, ErrorState, PageHeader, StatCard } from "../../components/ui";
import { canReject, chunkAccounts, MIN_REJECT_REASON, parseAccountIds } from "./helpers";

const UsersSchema = z.array(UserOptionSchema);
const EvaluationsSchema = z.array(EvaluationSchema);

export default function AdminProjectDetailPage() {
  const { projectId } = useParams();
  const id = Number(projectId);
  const qc = useQueryClient();

  const [memberId, setMemberId] = useState<number | "">("");
  const [accountText, setAccountText] = useState("");
  const [reasons, setReasons] = useState<Record<number, string>>({});

  const project = useQuery({
    queryKey: ["project", id],
    queryFn: async () => ProjectDetailSchema.parse(await api<unknown>(`/api/projects/${id}`)),
    enabled: Number.isFinite(id),
  });

  const qaUsers = useQuery({
    queryKey: ["users", "qa"],
    queryFn: async () => UsersSchema.parse(await api<unknown>("/api/users?role=qa")),
  });

  const evaluations = useQuery({
    queryKey: ["evaluations", id],
    queryFn: async () => EvaluationsSchema.parse(await api<unknown>(`/api/projects/${id}/evaluations`)),
    enabled: Number.isFinite(id),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["project", id] });
    qc.invalidateQueries({ queryKey: ["evaluations", id] });
  };

  const addMember = useMutation({
    mutationFn: async (userId: number) =>
      api<unknown>(`/api/projects/${id}/members`, { method: "POST", body: JSON.stringify({ user_id: userId }) }),
    onSuccess: () => {
      setMemberId("");
      refresh();
    },
  });

  const addAccounts = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const chunk of chunkAccounts(ids)) {
        await api<unknown>(`/api/projects/${id}/accounts`, {
          method: "POST",
          body: JSON.stringify({ account_ids: chunk }),
        });
      }
    },
    onSuccess: () => {
      setAccountText("");
      refresh();
    },
  });

  const review = useMutation({
    mutationFn: async (vars: { evaluationId: number; action: "accept" | "reject"; reason?: string }) =>
      api<unknown>(`/api/evaluations/${vars.evaluationId}/review`, {
        method: "POST",
        body: JSON.stringify({ action: vars.action, reason: vars.reason ?? "" }),
      }),
    onSuccess: () => refresh(),
  });

  if (project.isError) return <ErrorState text="Project not found." />;
  if (!project.data) return <p className="text-ink-600">Loading project…</p>;

  const memberIds = new Set(project.data.members.map((m) => m.user_id));
  const addableUsers = (qaUsers.data ?? []).filter((u) => !memberIds.has(u.id));
  const accountIds = parseAccountIds(accountText);

  const inputClass = "rounded-lg bg-white px-3 py-2 text-sm text-ink-900 ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="space-y-6">
      <PageHeader title={project.data.name} />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="QA members" value={project.data.members.length} />
        <StatCard label="Accounts" value={project.data.accounts.length} />
      </div>

      <Card title="QA members">
        <ul className="mb-4 divide-y divide-line text-sm">
          {project.data.members.map((m) => (
            <li key={m.user_id} className="py-2 text-ink-900">{m.email}</li>
          ))}
          {project.data.members.length === 0 && <li className="py-2 text-ink-400">No members yet.</li>}
        </ul>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-64 flex-1 flex-col text-sm font-medium text-ink-900">
            Add QA user
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value ? Number(e.target.value) : "")}
              className={`mt-1.5 ${inputClass}`}
            >
              <option value="">Select a QA user</option>
              {addableUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.email}</option>
              ))}
            </select>
          </label>
          <button
            disabled={memberId === "" || addMember.isPending}
            onClick={() => memberId !== "" && addMember.mutate(memberId)}
            className={buttonClass()}
          >
            Add member
          </button>
        </div>
        {qaUsers.data && qaUsers.data.length === 0 && (
          <p className="mt-3 text-sm text-ink-600">No active QA users. Create one with the CLI (role qa) first.</p>
        )}
        {addMember.isError && <div className="mt-3"><ErrorState text="Could not add the member." /></div>}
      </Card>

      <Card title="Accounts">
        <p className="mb-3 text-sm text-ink-600">Paste account IDs separated by spaces, commas or new lines.</p>
        <textarea
          value={accountText}
          onChange={(e) => setAccountText(e.target.value)}
          rows={4}
          className={`w-full font-mono ${inputClass}`}
        />
        <div className="mt-3 flex items-center gap-3">
          <button disabled={accountIds.length === 0 || addAccounts.isPending} onClick={() => addAccounts.mutate(accountIds)} className={buttonClass()}>
            Add {accountIds.length} account{accountIds.length === 1 ? "" : "s"}
          </button>
          {addAccounts.isError && <span className="text-sm text-brand-600">Could not add accounts.</span>}
        </div>
        <p className="mt-4 break-all font-mono text-xs text-ink-600">
          {project.data.accounts.join(", ") || "No accounts yet."}
        </p>
      </Card>

      <Card title="QA evaluations" flush>
        {evaluations.isError && <div className="px-5 pb-5"><ErrorState text="Could not load evaluations." /></div>}
        {evaluations.data && evaluations.data.length === 0 && <EmptyState text="No evaluations yet." />}
        {evaluations.data && evaluations.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-600">
                  <th className="px-5 py-3 font-medium">Account</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Tags</th>
                  <th className="px-5 py-3 font-medium">Notes</th>
                  <th className="px-5 py-3 font-medium">Review</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.data.map((e) => (
                  <tr key={e.id} className="border-b border-line align-top last:border-0">
                    <td className="px-5 py-3 font-mono text-xs text-ink-900">{e.account_id}</td>
                    <td className="px-5 py-3 text-ink-900">
                      {e.status}
                      {e.reject_reason && <div className="mt-1 text-xs text-brand-600">{e.reject_reason}</div>}
                    </td>
                    <td className="px-5 py-3 text-xs text-ink-600">{e.tags.join(", ")}</td>
                    <td className="px-5 py-3 text-xs text-ink-600">{e.notes}</td>
                    <td className="px-5 py-3">
                      {e.status === "submitted" ? (
                        <div className="space-y-2">
                          <button
                            onClick={() => review.mutate({ evaluationId: e.id, action: "accept" })}
                            disabled={review.isPending}
                            className={buttonClass("secondary")}
                          >
                            Accept
                          </button>
                          <div className="flex gap-2">
                            <input
                              value={reasons[e.id] ?? ""}
                              onChange={(ev) => setReasons({ ...reasons, [e.id]: ev.target.value })}
                              placeholder={`Reject reason (${MIN_REJECT_REASON}+ chars)`}
                              className={inputClass}
                            />
                            <button
                              disabled={!canReject(reasons[e.id] ?? "") || review.isPending}
                              onClick={() => review.mutate({ evaluationId: e.id, action: "reject", reason: reasons[e.id] })}
                              className={buttonClass("secondary")}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-400">{e.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {review.isError && (
          <div className="px-5 pb-5 pt-3"><ErrorState text="Review failed. The evaluation may have changed." /></div>
        )}
      </Card>
    </div>
  );
}
