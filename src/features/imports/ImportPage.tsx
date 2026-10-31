import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../../api/client";
import { uploadFile } from "../../api/upload";
import FieldSelect from "../../components/FieldSelect";
import { buttonClass, Card, ErrorState, PageHeader, StatusBadge, Stepper } from "../../components/ui";

const ImportSchema = z.object({
  id: z.number(),
  filename: z.string(),
  status: z.string(),
  size_bytes: z.number(),
  report: z.record(z.any()),
  created_at: z.string(),
});
const UploadSchema = z.object({ id: z.number(), status: z.string(), duplicate: z.boolean() });
const ColumnsSchema = z.object({
  columns: z.array(z.string()),
  auto_mapping: z.record(z.string()),
  schema: z.array(z.object({ field: z.string(), required: z.boolean() })),
});

// Statuses while the backend is still working on a sync. The page polls until one of these clears.
const BUSY = ["validating", "loading", "triaging"];

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importId, setImportId] = useState<number | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  // Upload progress: `sent` is the fraction of the file the browser has sent; `saving` means every byte has left the
  // browser and the server is still hashing and writing it.
  const [sent, setSent] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  // The import whose sync the admin started in this visit. Progress is shown only for that import, or while a sync runs.
  const [syncStarted, setSyncStarted] = useState<number | null>(null);

  const upload = useMutation({
    mutationFn: (f: File) => {
      setSent(0);
      setSaving(false);
      return uploadFile(
        "/api/imports",
        f,
        (fraction) => setSent(fraction),
        () => setSaving(true),
      ).then((raw) => UploadSchema.parse(raw));
    },
    onSuccess: (u) => {
      setMapping({});
      setImportId(u.id);
    },
    onSettled: () => {
      setSent(null);
      setSaving(false);
    },
  });

  const columns = useQuery({
    queryKey: ["import-columns", importId],
    enabled: importId !== null,
    queryFn: async () => ColumnsSchema.parse(await api<unknown>(`/api/imports/${importId}/columns`)),
  });

  // Start from the automatic mapping (names that match after removing "_", "-" and spaces, lowercased).
  useEffect(() => {
    if (columns.data) setMapping(columns.data.auto_mapping);
  }, [columns.data]);

  const imp = useQuery({
    queryKey: ["import", importId],
    enabled: importId !== null,
    // Fetched so a sync already running is shown; a finished import is not shown until Sync data is clicked.
    queryFn: async () => ImportSchema.parse(await api<unknown>(`/api/imports/${importId}`)),
    refetchInterval: (q) => (q.state.data && BUSY.includes(q.state.data.status) ? 2000 : false),
  });

  const sync = useMutation({
    mutationFn: (id: number) =>
      api<unknown>(`/api/imports/${id}/sync`, { method: "POST", body: JSON.stringify({ mapping }) }),
    onSuccess: (_, id) => {
      setSyncStarted(id);
      imp.refetch();
    },
  });

  // Marks a busy import as failed when no sync is running for it (for example after a crash). Data already
  // written is not rolled back; the next sync replaces it.
  const reset = useMutation({
    mutationFn: (id: number) => api<unknown>(`/api/imports/${id}/reset`, { method: "POST" }),
    onSuccess: () => imp.refetch(),
  });

  const schema = columns.data?.schema ?? [];
  const missing = schema.filter((f) => f.required && !mapping[f.field]).map((f) => f.field);
  const busy = imp.data !== undefined && BUSY.includes(imp.data.status);
  const canSync = importId !== null && missing.length === 0 && !busy && !sync.isPending;

  const setField = (field: string, column: string) =>
    setMapping((m) => {
      const next = { ...m };
      if (column) next[field] = column;
      else delete next[field];
      return next;
    });

  // A CSV column can feed one field only: a field's choices leave out the columns other fields already use.
  const optionsFor = (field: string): string[] => {
    const taken = new Set(Object.entries(mapping).filter(([f]) => f !== field).map(([, c]) => c));
    return (columns.data?.columns ?? []).filter((c) => !taken.has(c));
  };

  const report = imp.data?.report ?? {};
  const validation = report.validation as
    | { rows?: number; errors?: Record<string, number>; non_usd_rows?: number }
    | undefined;
  const errors = validation?.errors ?? {};

  // The report is written when a stage or a rule group finishes, so the age of the last write shows whether the sync
  // is still moving.
  const updatedAt = typeof report.updated_at === "string" ? Date.parse(report.updated_at) : NaN;
  const quietSeconds = Number.isNaN(updatedAt) ? null : Math.max(0, Math.round((Date.now() - updatedAt) / 1000));

  // Step 0 upload, 1 map columns, 2 sync (once a sync has started).
  const step = imp.data ? 2 : columns.data ? 1 : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Import transactions" />

      {upload.isPending && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/30 px-4">
          <div role="dialog" aria-modal="true" aria-labelledby="upload-title"
               className="w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-lg ring-1 ring-line">
            <div className="flex justify-center">
              <RedRing fraction={saving ? null : sent} />
            </div>
            <h2 id="upload-title" className="mt-4 text-sm font-semibold text-ink-900">
              {saving ? "Saving the file" : "Sending the file"}
            </h2>
            <p className="mt-1 text-sm text-ink-600">
              {saving ? "Large files take a minute or two." : `${Math.round((sent ?? 0) * 100)}% sent`}
            </p>
          </div>
        </div>,
        document.body,
      )}

      <Stepper steps={["Upload", "Map columns", "Sync"]} current={step} />

      <Card title="1. Upload">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <input
            type="file"
            accept=".csv"
            disabled={upload.isPending}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-page file:px-3 file:py-2 file:text-ink-900"
          />
          <button disabled={!file || upload.isPending} onClick={() => file && upload.mutate(file)} className={buttonClass()}>
            Upload
          </button>
        </div>

        {upload.isError && <div className="mt-3"><ErrorState text={`Upload failed. ${(upload.error as Error).message}`} /></div>}
      </Card>

      {columns.data && (
        <Card title="2. Map columns">
          <p className="mb-4 flex items-center gap-2 text-sm text-ink-600">
            <InfoIcon />
            {missing.length > 0
              ? `Map these required fields first: ${missing.join(", ")}`
              : "All required fields are mapped."}
          </p>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-600">
                <th className="py-2 font-medium">Field</th>
                <th className="py-2 font-medium">Requirement</th>
                <th className="py-2 font-medium">CSV column</th>
              </tr>
            </thead>
            <tbody>
              {schema.map((f) => {
                const auto = columns.data.auto_mapping[f.field];
                const chosen = mapping[f.field] ?? "";
                return (
                  <tr key={f.field} className="border-b border-line last:border-0">
                    <td className="py-3 font-mono text-ink-900">{f.field}</td>
                    <td className="py-3">
                      <span className={`text-xs font-medium ${
                        f.required ? "text-brand-600" : "text-ink-600"
                      }`}>
                        {f.required ? "Required" : "Optional"}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <FieldSelect
                          label={`CSV column for ${f.field}`}
                          value={chosen}
                          options={optionsFor(f.field)}
                          disabled={busy}
                          onChange={(column) => setField(f.field, column)}
                        />
                        {auto !== undefined && chosen === auto && <AutoTick />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
            <button disabled={!canSync} onClick={() => importId !== null && sync.mutate(importId)} className={buttonClass()}>
              Sync data
            </button>
          </div>
          {sync.isError && (
            <div className="mt-3"><ErrorState text={`Sync could not start: ${(sync.error as Error).message}`} /></div>
          )}
        </Card>
      )}

      {imp.data && (syncStarted === importId || busy) && (
        <Card
          title="3. Sync progress"
          action={<StatusBadge status={imp.data.status} plain />}
        >
          <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="File" value={imp.data.filename} />
            <Stat label="Size" value={`${(imp.data.size_bytes / 1e6).toFixed(1)} MB`} />
            <Stat label="Stage" value={typeof report.stage === "string" ? report.stage : "—"} />
            <Stat label="Elapsed" value={typeof report.elapsed_s === "number" ? `${report.elapsed_s} s` : "—"} />
            <Stat label="Rows loaded" value={typeof report.rows === "number" ? report.rows.toLocaleString() : "—"} />
            <Stat label="Cases opened" value={typeof report.cases_opened === "number" ? report.cases_opened : "—"} />
            <Stat label="Peak memory (API)" value={typeof report.process_peak_rss_mb === "number" ? `${report.process_peak_rss_mb} MB` : "—"} />
            <Stat label="Rows checked" value={validation?.rows !== undefined ? validation.rows.toLocaleString() : "—"} />
          </div>

          {busy && (
            <div className="mt-5 flex items-center gap-3">
              <RedRing fraction={null} small />
              <span className="text-sm text-ink-600">
                Working on the file{typeof report.stage === "string" ? `: ${report.stage}` : ""}
                {quietSeconds !== null && ` · last update ${quietSeconds}s ago`}
                {quietSeconds !== null && quietSeconds > 300 && (
                  <span className="text-brand-600"> · no progress for 5 minutes; check the API logs or reset</span>
                )}
              </span>
              <button disabled={reset.isPending} onClick={() => importId !== null && reset.mutate(importId)} className={`ml-auto ${buttonClass("secondary")}`}>
                Reset stuck import
              </button>
              {reset.isError && <span className="text-sm text-brand-600">{(reset.error as Error).message}</span>}
            </div>
          )}

          {Object.keys(errors).length > 0 && (
            <div className="mt-5">
              <ErrorState text={`Validation problems: ${Object.entries(errors).map(([k, v]) => `${k} (${v})`).join(", ")}`} />
            </div>
          )}
          {(validation?.non_usd_rows ?? 0) > 0 && (
            <div className="mt-3 rounded-xl bg-warn-50 px-4 py-3 text-sm text-warn-600">
              Non-USD rows (ignored by alert rules): {validation?.non_usd_rows}
            </div>
          )}
          {typeof report.error === "string" && (
            <div className="mt-3"><ErrorState text={`Error: ${report.error}`} /></div>
          )}
        </Card>
      )}
    </div>
  );
}

/** A red progress ring. With a null fraction it spins, for work whose length is not known. */
function RedRing({ fraction, small = false }: { fraction: number | null; small?: boolean }) {
  const size = small ? 24 : 44;
  const r = small ? 9 : 18;
  const c = 2 * Math.PI * r;
  const offset = fraction === null ? c * 0.75 : c * (1 - Math.min(1, Math.max(0, fraction)));
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`shrink-0 ${fraction === null ? "animate-spin" : ""}`}
      role="img"
      aria-label={fraction === null ? "Working" : `${Math.round(fraction * 100)} percent`}
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={small ? 3 : 4}
              className="text-line" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={small ? 3 : 4}
              strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`} className="text-brand-600" />
    </svg>
  );
}

/** A small green tick at the end of a dropdown: the value was matched to the field automatically. */
function AutoTick() {
  return (
    <span
      title="Matched automatically"
      aria-label="Matched automatically"
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ok-50 text-ok-600"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
           strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" className="shrink-0 text-ink-400" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-ink-600">{label}</div>
      <div className="mt-1 break-all text-ink-900">{value}</div>
    </div>
  );
}
