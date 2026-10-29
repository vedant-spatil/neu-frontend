import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadAvatar } from "../../api/avatar";
import { api, ApiError } from "../../api/client";
import { useMe } from "../../auth/useAuth";
import Avatar from "../../components/Avatar";
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

const field =
  "mt-1.5 w-full rounded-lg bg-white px-3 py-2.5 text-ink-900 ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-500";

export default function AccountPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [picked, setPicked] = useState<File | null>(null);
  const [pictureDone, setPictureDone] = useState(false);
  const previewUrl = useMemo(() => (picked ? URL.createObjectURL(picked) : null), [picked]);

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

  const picture = useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: () => {
      setPicked(null);
      setPictureDone(true);
      qc.invalidateQueries({ queryKey: ["avatar"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setDone(false);
    const problem = accountPasswordError(current, next, confirm);
    setLocalError(problem);
    if (problem === null) change.mutate();
  }

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

        <Card title="Profile picture">
          <div className="flex flex-wrap items-center gap-5 text-sm">
            {previewUrl ? (
              <img src={previewUrl} alt="Selected picture preview" className="h-24 w-24 rounded-full object-cover ring-1 ring-line" />
            ) : (
              <Avatar size={96} />
            )}
            <div className="min-w-0 flex-1 space-y-3">
              <input
                type="file"
                accept="image/png,image/jpeg"
                aria-label="Choose a profile picture"
                onChange={(e) => {
                  setPicked(e.target.files?.[0] ?? null);
                  setPictureDone(false);
                  picture.reset();
                }}
                className="w-full text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-page file:px-3 file:py-2 file:text-ink-900"
              />
              <p className="text-xs text-ink-400">PNG or JPEG. The picture is resized to 256 px before it is saved.</p>
              <button
                type="button"
                disabled={!picked || picture.isPending}
                onClick={() => picked && picture.mutate(picked)}
                className={buttonClass()}
              >
                {picture.isPending ? "Saving…" : "Update picture"}
              </button>
              {picture.isError && <ErrorState text={(picture.error as Error).message} />}
              {pictureDone && (
                <p role="status" className="rounded-xl bg-ok-50 px-4 py-3 text-ok-600">Your picture has been updated.</p>
              )}
            </div>
          </div>
        </Card>

        <Card title="Change password" className="lg:col-span-2">
          <form onSubmit={onSubmit} className="grid gap-4 text-sm sm:grid-cols-3">
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
            <div className="space-y-3 sm:col-span-3">
              {localError && <ErrorState text={localError} />}
              {change.isError && <ErrorState text={detailOf(change.error)} />}
              {done && <p role="status" className="rounded-xl bg-ok-50 px-4 py-3 text-ok-600">Your password has been changed.</p>}
              <button disabled={change.isPending} className={buttonClass()}>
                {change.isPending ? "Saving…" : "Change password"}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
