// Rules shared by the admin and QA project pages. They mirror the backend checks in
// app/api/routers/projects.py so the UI can explain a problem before the request is sent.

export const MAX_ACCOUNTS_PER_REQUEST = 200; // AccountsIn.account_ids max_length
export const MIN_REJECT_REASON = 10; // review endpoint: reject needs a reason of 10+ characters
export const MIN_PROJECT_NAME = 3; // ProjectIn.name min_length

/** Splits pasted account IDs on whitespace or commas, drops blanks and duplicates, keeps order. */
export function parseAccountIds(text: string): string[] {
  const ids = text.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  return [...new Set(ids)];
}

export function canReject(reason: string): boolean {
  return reason.trim().length >= MIN_REJECT_REASON;
}

export function validProjectName(name: string): boolean {
  return name.trim().length >= MIN_PROJECT_NAME;
}

/** A QA user can resubmit only when the latest evaluation for the account was rejected. */
export function needsResubmit(status: string): boolean {
  return status === "rejected";
}

/** Chunks account IDs into requests of at most MAX_ACCOUNTS_PER_REQUEST. */
export function chunkAccounts(ids: string[]): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += MAX_ACCOUNTS_PER_REQUEST) {
    out.push(ids.slice(i, i + MAX_ACCOUNTS_PER_REQUEST));
  }
  return out;
}
