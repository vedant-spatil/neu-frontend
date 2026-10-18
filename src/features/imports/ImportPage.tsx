import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api, API_BASE } from "../../api/client";
import { getToken } from "../../auth/session";

const ReportSchema = z.object({
  rows: z.number(),
  missing_columns: z.array(z.string()),
  errors: z.record(z.number()),
  non_usd_rows: z.number(),
});
const ImportSchema = z.object({
  id: z.number(),
  filename: z.string(),
  status: z.string(),
  size_bytes: z.number(),
  report: ReportSchema.partial(),
  created_at: z.string(),
});
const UploadSchema = z.object({ id: z.number(), status: z.string(), duplicate: z.boolean() });

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importId, setImportId] = useState<number | null>(null);

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
    onSuccess: (u) => setImportId(u.id),
  });

  const validate = useMutation({
    mutationFn: async (id: number) =>
      api<unknown>(`/api/imports/${id}/validate`, { method: "POST" }),
  });

  const imp = useQuery({
    queryKey: ["import", importId],
    enabled: importId !== null,
    queryFn: async () => ImportSchema.parse(await api<unknown>(`/api/imports/${importId}`)),
  });

  return (
    <section className="space-y-4">
      <h1 className="text-lg font-semibold">Import transactions (CSV)</h1>
      <p className="text-sm text-slate-600">
        Admin only. The file is checked before anything is loaded. Loading into the database is run
        by the backend loader, not from this page.
      </p>

      <div className="flex items-center gap-3">
        <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button disabled={!file || upload.isPending}
                onClick={() => file && upload.mutate(file)}
                className="rounded bg-slate-900 px-3 py-1 text-white disabled:opacity-50">Upload</button>
        {importId !== null && (
          <button disabled={validate.isPending} onClick={() => validate.mutate(importId)}
                  className="rounded border px-3 py-1 disabled:opacity-50">Validate</button>
        )}
      </div>

      {upload.isError && <p role="alert" className="text-red-600">Upload failed.</p>}

      {imp.data && (
        <div className="rounded bg-white p-4 shadow text-sm space-y-2">
          <div><b>File</b> {imp.data.filename} · {(imp.data.size_bytes / 1e6).toFixed(1)} MB · <b>status</b> {imp.data.status}</div>
          {imp.data.report.rows !== undefined && <div>Rows checked: {imp.data.report.rows}</div>}
          {imp.data.report.missing_columns && imp.data.report.missing_columns.length > 0 && (
            <div className="text-red-600">Missing columns: {imp.data.report.missing_columns.join(", ")}</div>
          )}
          {imp.data.report.errors && Object.keys(imp.data.report.errors).length > 0 && (
            <ul className="text-red-600">
              {Object.entries(imp.data.report.errors).map(([k, v]) => <li key={k}>{k}: {v}</li>)}
            </ul>
          )}
          {imp.data.report.non_usd_rows !== undefined && imp.data.report.non_usd_rows > 0 && (
            <div className="text-amber-700">Non-USD rows (ignored by alert rules): {imp.data.report.non_usd_rows}</div>
          )}
        </div>
      )}
    </section>
  );
}
