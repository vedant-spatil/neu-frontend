import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../../api/client";
import {
  EvaluationSchema,
  ProjectDetailSchema,
  QaAccountSchema,
  TagsSchema,
  type QaAccount,
} from "../../api/schemas";
import { buttonClass, Card, EmptyState, ErrorState, PageHeader, StatusBadge } from "../../components/ui";
import { needsResubmit } from "./helpers";

const QaAccountsSchema = z.array(QaAccountSchema);
const EvaluationsSchema = z.array(EvaluationSchema);

export default function QaProjectDetailPage() {
  const { projectId } = useParams();
  const id = Number(projectId);
  const qc = useQueryClient();

  const [selected, setSelected] = useState<QaAccount | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const project = useQuery({
    queryKey: ["project", id],
    queryFn: async () => ProjectDetailSchema.parse(await api<unknown>(`/api/projects/${id}`)),
    enabled: Number.isFinite(id),
  });

  const accounts = useQuery({
    queryKey: ["qa-accounts", id],
    queryFn: async () => QaAccountsSchema.parse(await api<unknown>(`/api/qa/projects/${id}/accounts`)),
    enabled: Number.isFinite(id),
  });

  const myEvaluations = useQuery({
    queryKey: ["qa-evaluations"],
    queryFn: async () => EvaluationsSchema.parse(await api<unknown>("/api/qa/evaluations")),
  });

  const tags = useQuery({
    queryKey: ["tags"],
    queryFn: async () => TagsSchema.parse(await api<unknown>("/api/tags")),
  });

  const rejectReasons = useMemo(() => {
    const map = new Map<number, string>();
    for (const e of myEvaluations.data ?? []) {
      if (e.reject_reason) map.set(e.id, e.reject_reason);
    }
    return map;
  }, [myEvaluations.data]);

  const submit = useMutation({
    mutationFn: async (vars: { account: QaAccount; tags: string[]; notes: string }) => {
      const body = JSON.stringify({ tags: vars.tags, notes: vars.notes });
      if (needsResubmit(vars.account.status) && vars.account.evaluation_id !== null) {
        return api<unknown>(`/api/qa/evaluations/${vars.account.evaluation_id}/resubmit`, { method: "POST", body });
      }
      const query = `account_id=${encodeURIComponent(vars.account.account_id)}`;
      return api<unknown>(`/api/qa/projects/${id}/evaluations?${query}`, { method: "POST", body });
    },
    onSuccess: () => {
      setSelected(null);
      setPicked([]);
      setNotes("");
      qc.invalidateQueries({ queryKey: ["qa-accounts", id] });
      qc.invalidateQueries({ queryKey: ["qa-evaluations"] });
    },
  });

  function open(account: QaAccount) {
    setSelected(account);
    setPicked([]);
    setNotes("");
  }

  function toggleTag(tag: string) {
    setPicked((cur) => (cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]));
  }

  if (project.isError) return <ErrorState text="Project not found." />;
  if (!project.data) return <p className="text-ink-600">Loading project…</p>;

  const canSubmit = selected !== null && picked.length > 0 && !submit.isPending;
  const editable = selected !== null && (selected.status === "not_started" || needsResubmit(selected.status));

  return (
    <div className="space-y-6">
      <PageHeader title={project.data.name} subtitle="Pick an account, choose tags, and submit for admin review." />

      {accounts.isError && <ErrorState text="Could not load accounts." />}

      <Card title="Accounts" flush>
        {accounts.data && accounts.data.length === 0 && <EmptyState text="No accounts in this project yet." />}
        {accounts.data && accounts.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-600">
                  <th className="px-5 py-3 font-medium">Account</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {accounts.data.map((a) => (
                  <tr
                    key={a.account_id}
                    onClick={() => open(a)}
                    className="cursor-pointer border-b border-line last:border-0 hover:bg-page/60"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-ink-900">{a.account_id}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={a.status} />
                      {a.evaluation_id !== null && rejectReasons.has(a.evaluation_id) && (
                        <div className="mt-1 text-xs text-brand-600">Rejected: {rejectReasons.get(a.evaluation_id)}</div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-medium text-brand-600">
                      {needsResubmit(a.status) ? "Resubmit" : a.status === "not_started" ? "Review" : "View"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selected && (
        <Card title={<span>Account <span className="font-mono text-sm">{selected.account_id}</span></span>}>
          <p className="mb-4 text-sm text-ink-600">Status: <StatusBadge status={selected.status} /></p>

          {editable ? (
            <div className="space-y-5 text-sm">
              <fieldset className="flex flex-wrap gap-2">
                <legend className="mb-2 font-medium text-ink-900">Tags</legend>
                {tags.data?.tags.map((t) => {
                  const checked = picked.includes(t);
                  return (
                    <label
                      key={t}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 ring-1 ${
                        checked ? "bg-brand-50 text-brand-600 ring-brand-500" : "text-ink-900 ring-line hover:bg-page"
                      }`}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleTag(t)} />
                      {t}
                    </label>
                  );
                })}
              </fieldset>
              <label className="block">
                <span className="mb-1 block font-medium text-ink-900">Notes</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg bg-white p-3 text-ink-900 ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-500"
                />
              </label>
              <div className="flex items-center gap-3">
                <button
                  disabled={!canSubmit}
                  onClick={() => selected && submit.mutate({ account: selected, tags: picked, notes })}
                  className={buttonClass()}
                >
                  {needsResubmit(selected.status) ? "Resubmit" : "Submit evaluation"}
                </button>
                <button onClick={() => setSelected(null)} className={buttonClass("secondary")}>Cancel</button>
              </div>
              {submit.isError && <ErrorState text="Submit failed. Try again." />}
            </div>
          ) : (
            <p className="text-sm text-ink-600">This account is {selected.status}. No changes needed.</p>
          )}
        </Card>
      )}
    </div>
  );
}
