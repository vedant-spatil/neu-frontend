import type { SarBody } from "../features/approvals/sarPrefill";
import { Card } from "./ui";

type Props = { version: number; body: SarBody };

const formatTime = (iso?: string) => (iso ? iso.replace("T", " ").slice(0, 16) : "—");

/** The SAR draft as readable sections. The raw JSON stays behind a disclosure for auditors. */
export default function SarView({ version, body }: Props) {
  const activity = body.activity;
  const cited = body.cited_txn_ids ?? [];
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          SAR draft
          <span className="rounded-full bg-warn-50 px-2 py-0.5 text-xs font-medium text-warn-600">
            Redacted draft · v{version}
          </span>
        </span>
      }
    >
      <div className="space-y-5 text-sm text-ink-900">
        <div>
          <div className="text-xs uppercase tracking-wide text-ink-400">Subject</div>
          <div className="mt-1 font-medium">Party {body.subject?.party_token ?? "—"}</div>
        </div>

        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-400">Category</dt>
            <dd className="mt-1 font-medium">{activity?.category ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-400">Period</dt>
            <dd className="mt-1">
              {formatTime(activity?.start)} → {formatTime(activity?.end)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-400">Total amount</dt>
            <dd className="mt-1 font-semibold">
              {activity?.total_amount !== undefined
                ? activity.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })
                : "—"}
            </dd>
          </div>
        </dl>

        <div>
          <div className="text-xs uppercase tracking-wide text-ink-400">Narrative</div>
          <p className="mt-1 whitespace-pre-line leading-relaxed text-ink-900">{body.narrative ?? "No narrative."}</p>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-ink-400">Cited transactions ({cited.length})</div>
          {cited.length === 0 ? (
            <p className="mt-1 text-ink-400">None cited.</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {cited.map((id) => (
                <li key={id}>
                  <a href="#transaction-graph"
                     className="inline-flex rounded-md bg-info-50 px-2 py-1 font-mono text-xs text-info-600 hover:underline">
                    TXN {id}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <details className="rounded-xl bg-page p-3">
          <summary className="cursor-pointer text-xs font-medium text-ink-600">Raw JSON (for audit)</summary>
          <pre className="mt-3 max-h-96 overflow-auto text-xs text-ink-900">{JSON.stringify(body, null, 2)}</pre>
        </details>
      </div>
    </Card>
  );
}
