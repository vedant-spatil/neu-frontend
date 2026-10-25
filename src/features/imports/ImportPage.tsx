import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api, API_BASE } from "../../api/client";
import { getToken } from "../../auth/session";
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

  const upload = useMutation({
    mutationFn: async (f: File) => {
      const body = new FormData();
      body.append("file", f);
      const res = await fetch(`${API_BASE}/api/imports`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken() ?? ""}` },
        body,
      });
      if (!res.ok) throw new Error(`upload failed: ${res.status}`);
      return UploadSchema.parse(await res.json());
    },
    onSuccess: (u) => {
      setMapping({});
      setImportId(u.id);
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
    queryFn: async () => ImportSchema.parse(await api<unknown>(`/api/imports/${importId}`)),
    refetchInterval: (q) => (q.state.data && BUSY.includes(q.state.data.status) ? 2000 : false),
  });

  const sync = useMutation({
    mutationFn: (id: number) =>
      api<unknown>(`/api/imports/${id}/sync`, { method: "POST", body: JSON.stringify({ mapping }) }),
    onSuccess: () => imp.refetch(),
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

  const report = imp.data?.report ?? {};
  const validation = report.validation as
    | { rows?: number; errors?: Record<string, number>; non_usd_rows?: number }
    | undefined;
  const errors = validation?.errors ?? {};

  // Step 0 upload, 1 map columns, 2 sync (once a sync has started).
  const step = imp.data ? 2 : columns.data ? 1 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import transactions"
        subtitle="Admin only. Upload a CSV, match its columns to the schema, then sync. The sync checks the file and loads it. Cases start only when an investigator opens one from the alert queue."
      />

      <Stepper steps={["Upload", "Map columns", "Sync"]} current={step} />

      <Card title="1. Upload">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-page file:px-3 file:py-2 file:text-ink-900"
          />
          <button disabled={!file || upload.isPending} onClick={() => file && upload.mutate(file)} className={buttonClass()}>
            Upload
          </button>
        </div>
        {upload.isError && <div className="mt-3"><ErrorState text="Upload failed." /></div>}
      </Card>

      {columns.data && (
        <Card title="2. Map columns">
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
                    <td className="py-2 font-mono text-ink-900">{f.field}</td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        f.required ? "bg-brand-50 text-brand-600" : "bg-line text-ink-600"
                      }`}>
                        {f.required ? "Required" : "Optional"}
                      </span>
                    </td>
                    <td className="py-2">
                      <select
                        value={chosen}
                        onChange={(e) => setField(f.field, e.target.value)}
                        disabled={busy}
                        className="w-full rounded-lg bg-white px-3 py-2 text-ink-900 ring-1 ring-line disabled:opacity-60"
                      >
                        <option value="">— not mapped —</option>
                        {columns.data.columns.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {auto !== undefined && chosen === auto && (
                        <span className="mt-1 inline-block rounded-full bg-ok-50 px-2 py-0.5 text-xs text-ok-600">
                          Matched automatically
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            {missing.length > 0 ? (
              <div className="rounded-lg bg-warn-50 px-3 py-2 text-sm text-warn-600">
                Map these required fields first: {missing.join(", ")}
              </div>
            ) : (
              <div className="rounded-lg bg-ok-50 px-3 py-2 text-sm text-ok-600">All required fields are mapped.</div>
            )}
            <button disabled={!canSync} onClick={() => importId !== null && sync.mutate(importId)} className={buttonClass()}>
              Sync data
            </button>
          </div>
          {sync.isError && (
            <div className="mt-3"><ErrorState text={`Sync could not start: ${(sync.error as Error).message}`} /></div>
          )}
        </Card>
      )}

      {imp.data && (
        <Card
          title="3. Sync progress"
          action={<StatusBadge status={imp.data.status} />}
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
              <button disabled={reset.isPending} onClick={() => importId !== null && reset.mutate(importId)} className={buttonClass("secondary")}>
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

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-ink-400">{label}</div>
      <div className="mt-1 break-all font-medium text-ink-900">{value}</div>
    </div>
  );
}
