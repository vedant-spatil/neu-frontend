import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "../../api/client";
import { useMe } from "../../auth/useAuth";
import { buttonClass, Card, ErrorState, PageHeader } from "../../components/ui";

export const MIN_NEW_PASSWORD = 10;

/** The first problem with the form, or null. The server checks the current password and repeats the rule. */
export function accountPasswordError(current: string, next: string, confirm: string): string | null {
  if (current.length === 0) return "Enter your current password.";
  if (next.length < MIN_NEW_PASSWORD) return `Use at least ${MIN_NEW_PASSWORD} characters for the new password.`;
  if (next === current) return "The new password must differ from the current one.";
  if (next !== confirm) return "The two new passwords do not match.";
  return null;
}

/** The server's detail message from an error, or a fallback. */
function detailOf(err: unknown): string {
  if (err instanceof ApiError) {
    try {
      const body = JSON.parse(err.message) as { detail?: unknown };
      if (typeof body.detail === "string") return body.detail;
    } catch {
      // Not JSON: fall through.
    }
  }
  return "The password could not be changed.";
}

export default function AccountPage() {
  const me = useMe();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const change = useMutation({
    mutationFn: () =>
      api("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: current, new_password: next }),
      }),
    onSuccess: () => {
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setDone(false);
    const problem = accountPasswordError(current, next, confirm);
    setLocalError(problem);
    if (problem === null) change.mutate();
  }

  const field =
    "mt-1.5 w-full rounded-lg bg-white px-3 py-2.5 text-ink-900 ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="space-y-6">
      <PageHeader title="Account" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Your details">
          <dl className="grid gap-4 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-400">Username (email)</dt>
              <dd className="mt-1 font-medium text-ink-900">{me.data?.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-400">Role</dt>
              <dd className="mt-1">
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold uppercase text-brand-600">
                  {me.data?.role ?? "—"}
                </span>
              </dd>
            </div>
          </dl>
        </Card>

        <Card title="Change password">
          <form onSubmit={onSubmit} className="space-y-4 text-sm">
            <label className="block font-medium text-ink-900">
              Current password
              <input className={field} type="password" autoComplete="current-password" value={current}
                     onChange={(e) => setCurrent(e.target.value)} />
            </label>
            <label className="block font-medium text-ink-900">
              New password (at least {MIN_NEW_PASSWORD} characters)
              <input className={field} type="password" autoComplete="new-password" value={next}
                     onChange={(e) => setNext(e.target.value)} />
            </label>
            <label className="block font-medium text-ink-900">
              Confirm new password
              <input className={field} type="password" autoComplete="new-password" value={confirm}
                     onChange={(e) => setConfirm(e.target.value)} />
            </label>
            {localError && <ErrorState text={localError} />}
            {change.isError && <ErrorState text={detailOf(change.error)} />}
            {done && <p role="status" className="rounded-xl bg-ok-50 px-4 py-3 text-ok-600">Your password has been changed.</p>}
            <button disabled={change.isPending} className={buttonClass()}>
              {change.isPending ? "Saving…" : "Change password"}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
