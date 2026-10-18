import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../../api/client";
import { EvaluationSchema, ProjectDetailSchema, UserOptionSchema } from "../../api/schemas";
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

  if (project.isError) return <p role="alert" className="text-red-600">Project not found.</p>;
  if (!project.data) return <p className="text-sm text-slate-600">Loading project…</p>;

  const memberIds = new Set(project.data.members.map((m) => m.user_id));
  const addableUsers = (qaUsers.data ?? []).filter((u) => !memberIds.has(u.id));
  const accountIds = parseAccountIds(accountText);

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold">{project.data.name}</h1>
        <p className="text-sm text-slate-600">
          {project.data.members.length} QA members · {project.data.accounts.length} accounts
        </p>
      </div>

      <div className="rounded bg-white p-4 shadow space-y-3">
        <h2 className="font-semibold">QA members</h2>
        <ul className="text-sm">
          {project.data.members.map((m) => (
            <li key={m.user_id}>{m.email}</li>
          ))}
          {project.data.members.length === 0 && <li className="text-slate-600">No members yet.</li>}
        </ul>
        <div className="flex items-end gap-3">
          <label className="flex flex-col text-sm">
            Add QA user
            <select value={memberId} onChange={(e) => setMemberId(e.target.value ? Number(e.target.value) : "")}
                    className="mt-1 rounded border px-2 py-1">
              <option value="">Select a QA user</option>
              {addableUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.email}</option>
              ))}
            </select>
          </label>
          <button disabled={memberId === "" || addMember.isPending}
                  onClick={() => memberId !== "" && addMember.mutate(memberId)}
                  className="rounded bg-slate-900 px-3 py-1 text-white disabled:opacity-50">Add member</button>
        </div>
        {qaUsers.data && qaUsers.data.length === 0 && (
          <p className="text-sm text-slate-600">No active QA users. Create one with the CLI (role qa) first.</p>
        )}
        {addMember.isError && <p role="alert" className="text-red-600">Could not add the member.</p>}
      </div>

      <div className="rounded bg-white p-4 shadow space-y-3">
        <h2 className="font-semibold">Accounts</h2>
        <p className="text-sm text-slate-600">Paste account IDs separated by spaces, commas or new lines.</p>
        <textarea value={accountText} onChange={(e) => setAccountText(e.target.value)} rows={4}
                  className="w-full rounded border p-2 font-mono text-sm" />
        <div className="flex items-center gap-3">
          <button disabled={accountIds.length === 0 || addAccounts.isPending}
                  onClick={() => addAccounts.mutate(accountIds)}
                  className="rounded bg-slate-900 px-3 py-1 text-white disabled:opacity-50">
            Add {accountIds.length} account{accountIds.length === 1 ? "" : "s"}
          </button>
          {addAccounts.isError && <span role="alert" className="text-red-600">Could not add accounts.</span>}
        </div>
        <p className="font-mono text-xs text-slate-600 break-all">{project.data.accounts.join(", ") || "No accounts yet."}</p>
      </div>

      <div className="rounded bg-white p-4 shadow space-y-3">
        <h2 className="font-semibold">QA evaluations</h2>
        {evaluations.isError && <p role="alert" className="text-red-600">Could not load evaluations.</p>}
        {evaluations.data && evaluations.data.length === 0 && (
          <p className="text-sm text-slate-600">No evaluations yet.</p>
        )}
        {evaluations.data && evaluations.data.length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-600">
              <tr>
                <th className="py-1">Account</th>
                <th>Status</th>
                <th>Tags</th>
                <th>Notes</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.data.map((e) => (
                <tr key={e.id} className="border-t align-top">
                  <td className="py-2 font-mono text-xs">{e.account_id}</td>
                  <td>{e.status}{e.reject_reason && <div className="text-xs text-red-700">{e.reject_reason}</div>}</td>
                  <td className="text-xs">{e.tags.join(", ")}</td>
                  <td className="text-xs">{e.notes}</td>
                  <td>
                    {e.status === "submitted" ? (
                      <div className="space-y-2">
                        <button onClick={() => review.mutate({ evaluationId: e.id, action: "accept" })}
                                disabled={review.isPending}
                                className="rounded border px-2 py-1 text-xs hover:bg-slate-100">Accept</button>
                        <div className="flex gap-2">
                          <input value={reasons[e.id] ?? ""}
                                 onChange={(ev) => setReasons({ ...reasons, [e.id]: ev.target.value })}
                                 placeholder={`Reject reason (${MIN_REJECT_REASON}+ chars)`}
                                 className="rounded border px-2 py-1 text-xs" />
                          <button disabled={!canReject(reasons[e.id] ?? "") || review.isPending}
                                  onClick={() => review.mutate({ evaluationId: e.id, action: "reject", reason: reasons[e.id] })}
                                  className="rounded border px-2 py-1 text-xs disabled:opacity-50">Reject</button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">{e.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {review.isError && <p role="alert" className="text-red-600">Review failed. The evaluation may have changed.</p>}
      </div>
    </section>
  );
}
