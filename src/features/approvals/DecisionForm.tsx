import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";

const TYPOLOGIES = ["structuring", "money_mule", "funnel", "layering", "round_trip", "pass_through", "scatter_gather"];

export default function DecisionForm({ caseId }: { caseId: number }) {
  const [action, setAction] = useState<"approve" | "close">("close");
  const [reason, setReason] = useState("");
  const [typologies, setTypologies] = useState<string[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const qc = useQueryClient();

  const submit = useMutation({
    mutationFn: () =>
      api(`/api/cases/${caseId}/decision`, {
        method: "POST",
        body: JSON.stringify({ action, reason, typologies, reviewed }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["case", caseId] }),
  });

  const valid = reason.trim().length >= 20 && reviewed;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (valid) submit.mutate();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded bg-white p-4 shadow text-sm">
      <fieldset className="flex gap-4">
        <legend className="font-medium">Decision</legend>
        <label><input type="radio" checked={action === "approve"} onChange={() => setAction("approve")} /> Approve SAR</label>
        <label><input type="radio" checked={action === "close"} onChange={() => setAction("close")} /> Close</label>
      </fieldset>
      <fieldset className="flex flex-wrap gap-3">
        <legend className="font-medium">Typologies confirmed</legend>
        {TYPOLOGIES.map((t) => (
          <label key={t}>
            <input type="checkbox" checked={typologies.includes(t)}
                   onChange={(e) => setTypologies(e.target.checked ? [...typologies, t] : typologies.filter((x) => x !== t))} />{" "}
            {t}
          </label>
        ))}
      </fieldset>
      <label className="block">
        Reason (20 characters minimum)
        <textarea className="mt-1 w-full rounded border p-2" rows={3} value={reason}
                  onChange={(e) => setReason(e.target.value)} />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
        I reviewed the cited transactions
      </label>
      <button disabled={!valid || submit.isPending} className="rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50">
        Submit decision
      </button>
      {submit.isError && <p role="alert" className="text-red-600">Decision failed. Check the case status.</p>}
    </form>
  );
}
