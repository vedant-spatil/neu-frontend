import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { buttonClass, Card, ErrorState } from "../../components/ui";

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

  const option = (checked: boolean) =>
    `flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm ring-1 ${
      checked ? "bg-brand-50 text-brand-600 ring-brand-500" : "text-ink-900 ring-line hover:bg-page"
    }`;

  return (
    <Card title="Decision">
      <form onSubmit={onSubmit} className="space-y-5 text-sm">
        <fieldset className="flex flex-wrap gap-3">
          <legend className="mb-2 font-medium text-ink-900">Outcome</legend>
          <label className={option(action === "approve")}>
            <input type="radio" name="action" checked={action === "approve"} onChange={() => setAction("approve")} />
            Approve SAR
          </label>
          <label className={option(action === "close")}>
            <input type="radio" name="action" checked={action === "close"} onChange={() => setAction("close")} />
            Close
          </label>
        </fieldset>

        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-2 font-medium text-ink-900">Typologies confirmed</legend>
          {TYPOLOGIES.map((t) => {
            const checked = typologies.includes(t);
            return (
              <label key={t} className={option(checked)}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setTypologies(e.target.checked ? [...typologies, t] : typologies.filter((x) => x !== t))}
                />
                {t.replace(/_/g, " ")}
              </label>
            );
          })}
        </fieldset>

        <label className="block">
          <span className="mb-1 block font-medium text-ink-900">Reason (20 characters minimum)</span>
          <textarea
            className="w-full rounded-lg bg-white p-3 text-ink-900 ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-500"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <span className="mt-1 block text-xs text-ink-400">{reason.trim().length} / 20</span>
        </label>

        <label className="flex items-center gap-2 text-ink-900">
          <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
          I reviewed the cited transactions
        </label>

        <button disabled={!valid || submit.isPending} className={buttonClass()}>
          Submit decision
        </button>
        {submit.isError && <ErrorState text="Decision failed. Check the case status." />}
      </form>
    </Card>
  );
}
