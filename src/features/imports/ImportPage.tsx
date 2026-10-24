import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api, API_BASE } from "../../api/client";
import { getToken } from "../../auth/session";

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

  return (
    <section className="space-y-4">
      <h1 className="text-lg font-semibold">Import transactions (CSV)</h1>
      <p className="text-sm text-slate-600">
        Admin only. Upload a CSV, match its columns to the schema, then sync. The sync checks the file, loads it,
        and opens cases for the highest-risk alerts.
      </p>

      <div className="flex items-center gap-3">
        <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button disabled={!file || upload.isPending}
                onClick={() => file && upload.mutate(file)}
                className="rounded bg-slate-900 px-3 py-1 text-white disabled:opacity-50">Upload</button>
      </div>
      {upload.isError && <p role="alert" className="text-red-600">Upload failed.</p>}

      {columns.data && (
        <div className="rounded bg-white p-4 shadow text-sm space-y-3">
          <div className="font-semibold">Map columns to the schema</div>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-1">Schema field</th>
                <th className="py-1">CSV column</th>
              </tr>
            </thead>
            <tbody>
              {schema.map((f) => {
                const auto = columns.data.auto_mapping[f.field];
                const chosen = mapping[f.field] ?? "";
                return (
                  <tr key={f.field} className="border-b last:border-0">
                    <td className="py-1">
                      {f.field}{" "}
                      {f.required
                        ? <span className="text-xs text-red-600">required</span>
                        : <span className="text-xs text-slate-400">optional</span>}
                    </td>
                    <td className="py-1">
                      <select value={chosen} onChange={(e) => setField(f.field, e.target.value)}
                              disabled={busy} className="w-full rounded border px-2 py-1">
                        <option value="">— not mapped —</option>
                        {columns.data.columns.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {auto !== undefined && chosen === auto && (
                        <span className="text-xs text-slate-400">matched automatically</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {missing.length > 0 && (
            <div className="text-amber-700">Map these required fields first: {missing.join(", ")}</div>
          )}
          <button disabled={!canSync} onClick={() => importId !== null && sync.mutate(importId)}
                  className="rounded bg-slate-900 px-3 py-1 text-white disabled:opacity-50">Sync data</button>
          {sync.isError && <p role="alert" className="text-red-600">Sync could not start: {(sync.error as Error).message}</p>}
        </div>
      )}

      {imp.data && (
        <div className="rounded bg-white p-4 shadow text-sm space-y-2">
          <div><b>File</b> {imp.data.filename} · {(imp.data.size_bytes / 1e6).toFixed(1)} MB · <b>status</b> {imp.data.status}</div>
          {busy && (
            <div className="flex items-center gap-3">
              <button disabled={reset.isPending} onClick={() => importId !== null && reset.mutate(importId)}
                      className="rounded border px-3 py-1 disabled:opacity-50">Reset stuck import</button>
              {reset.isError && <span role="alert" className="text-red-600">{(reset.error as Error).message}</span>}
            </div>
          )}
          {typeof report.stage === "string" && <div>Stage: {report.stage}</div>}
          {typeof report.elapsed_s === "number" && <div>Elapsed: {report.elapsed_s} s</div>}
          {typeof report.process_peak_rss_mb === "number" && (
            <div>Peak memory (API process): {report.process_peak_rss_mb} MB</div>
          )}
          {validation?.rows !== undefined && <div>Rows checked: {validation.rows}</div>}
          {Object.keys(errors).length > 0 && (
            <ul className="text-red-600">
              {Object.entries(errors).map(([k, v]) => <li key={k}>{k}: {v}</li>)}
            </ul>
          )}
          {(validation?.non_usd_rows ?? 0) > 0 && (
            <div className="text-amber-700">Non-USD rows (ignored by alert rules): {validation?.non_usd_rows}</div>
          )}
          {typeof report.rows === "number" && <div>Rows loaded: {report.rows}</div>}
          {typeof report.cases_opened === "number" && <div>Cases opened: {report.cases_opened}</div>}
          {typeof report.error === "string" && <div className="text-red-600">Error: {report.error}</div>}
        </div>
      )}
    </section>
  );
}
