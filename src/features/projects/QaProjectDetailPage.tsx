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

  if (project.isError) return <p role="alert" className="text-red-600">Project not found.</p>;
  if (!project.data) return <p className="text-sm text-slate-600">Loading project…</p>;

  const canSubmit = selected !== null && picked.length > 0 && !submit.isPending;
  const editable = selected !== null && (selected.status === "not_started" || needsResubmit(selected.status));

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{project.data.name}</h1>
        <p className="text-sm text-slate-600">Pick an account, choose tags, and submit for admin review.</p>
      </div>

      {accounts.isError && <p role="alert" className="text-red-600">Could not load accounts.</p>}
      {accounts.data && accounts.data.length === 0 && (
        <p className="text-sm text-slate-600">No accounts in this project yet.</p>
      )}
      {accounts.data && accounts.data.length > 0 && (
        <table className="w-full text-sm">
          <thead className="text-left text-slate-600">
            <tr>
              <th className="py-1">Account</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {accounts.data.map((a) => (
              <tr key={a.account_id} className="border-t">
                <td className="py-2 font-mono text-xs">{a.account_id}</td>
                <td>
                  {a.status}
                  {a.evaluation_id !== null && rejectReasons.has(a.evaluation_id) && (
                    <div className="text-xs text-red-700">Rejected: {rejectReasons.get(a.evaluation_id)}</div>
                  )}
                </td>
                <td className="text-right">
                  <button onClick={() => open(a)}
                          className="rounded border px-2 py-1 text-xs hover:bg-slate-100">
                    {needsResubmit(a.status) ? "Resubmit" : a.status === "not_started" ? "Review" : "View"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <div className="rounded bg-white p-4 shadow space-y-3">
          <h2 className="font-semibold">Account <span className="font-mono text-sm">{selected.account_id}</span></h2>
          <p className="text-sm text-slate-600">Status: {selected.status}</p>

          {editable ? (
            <>
              <fieldset className="space-y-1 text-sm">
                <legend className="font-medium">Tags</legend>
                {tags.data?.tags.map((t) => (
                  <label key={t} className="mr-4 inline-flex items-center gap-1">
                    <input type="checkbox" checked={picked.includes(t)} onChange={() => toggleTag(t)} />
                    {t}
                  </label>
                ))}
              </fieldset>
              <label className="flex flex-col text-sm">
                Notes
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                          className="mt-1 rounded border p-2" />
              </label>
              <div className="flex items-center gap-3">
                <button disabled={!canSubmit}
                        onClick={() => selected && submit.mutate({ account: selected, tags: picked, notes })}
                        className="rounded bg-slate-900 px-3 py-1 text-white disabled:opacity-50">
                  {needsResubmit(selected.status) ? "Resubmit" : "Submit evaluation"}
                </button>
                <button onClick={() => setSelected(null)} className="rounded border px-3 py-1">Cancel</button>
              </div>
              {submit.isError && <p role="alert" className="text-red-600">Submit failed. Try again.</p>}
            </>
          ) : (
            <p className="text-sm text-slate-600">This account is {selected.status}. No changes needed.</p>
          )}
        </div>
      )}
    </section>
  );
}
