import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { z } from "zod";
import { api } from "../../api/client";
import { CaseSchema, ProjectSummarySchema } from "../../api/schemas";
import { useMe } from "../../auth/useAuth";
import { buttonClass, Card, ErrorState, PageHeader, StatusBadge } from "../../components/ui";
import { validProjectName } from "../projects/helpers";

const PageSchema = z.object({
  total: z.number(),
  offset: z.number(),
  limit: z.number(),
  items: z.array(CaseSchema),
});
const ProjectListSchema = z.array(ProjectSummarySchema);
const AddResultSchema = z.object({
  project_name: z.string(),
  added: z.array(z.string()),
  already_present: z.array(z.string()),
  missing_case_ids: z.array(z.number()),
});

const PAGE_SIZE = 25;
const STATUSES = ["open", "awaiting_review", "approved", "closed", "failed", "superseded"];

export default function CasesList() {
  const me = useMe();
  const qc = useQueryClient();
  const isAdmin = me.data?.role === "admin";

  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [panelOpen, setPanelOpen] = useState(false);
  const [projectChoice, setProjectChoice] = useState<string>("new");
  const [newName, setNewName] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const query = new URLSearchParams({
    offset: String(page * PAGE_SIZE),
    limit: String(PAGE_SIZE),
    ...(status ? { status } : {}),
  }).toString();

  const cases = useQuery({
    queryKey: ["cases", page, status],
    queryFn: async () => PageSchema.parse(await api<unknown>(`/api/cases?${query}`)),
    placeholderData: keepPreviousData,
  });

  const projects = useQuery({
    queryKey: ["projects"],
    enabled: isAdmin && panelOpen,
    queryFn: async () => ProjectListSchema.parse(await api<unknown>("/api/projects")),
  });

  const addToProject = useMutation({
    mutationFn: async () => {
      const ids = [...selected];
      const body = projectChoice === "new"
        ? { case_ids: ids, project_name: newName.trim() }
        : { case_ids: ids, project_id: Number(projectChoice) };
      return AddResultSchema.parse(await api<unknown>("/api/projects/accounts-from-cases", {
        method: "POST",
        body: JSON.stringify(body),
      }));
    },
    onSuccess: (r) => {
      setResult(
        `Added ${r.added.length} account${r.added.length === 1 ? "" : "s"} to ${r.project_name}. ` +
        `${r.already_present.length} already in the project` +
        (r.missing_case_ids.length ? `; ${r.missing_case_ids.length} case(s) not found.` : "."),
      );
      setSelected(new Set());
      setPanelOpen(false);
      setNewName("");
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const totalPages = cases.data ? Math.max(1, Math.ceil(cases.data.total / PAGE_SIZE)) : 1;
  const pageIds = cases.data?.items.map((c) => c.id) ?? [];
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const canAdd = projectChoice !== "new" || validProjectName(newName);

  function toggle(id: number) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    setSelected((cur) => {
      const next = new Set(cur);
      if (allOnPage) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Cases (${cases.data?.total ?? 0})`}
        subtitle="Every case opened from an alert, with its current status."
        actions={
          <label className="flex items-center gap-2 text-sm text-ink-600">
            Status
            <select
              className="rounded-lg bg-white px-3 py-2 text-ink-900 ring-1 ring-line"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(0); setSelected(new Set()); }}
            >
              <option value="">All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </label>
        }
      />

      {result && (
        <div className="rounded-xl bg-ok-50 px-4 py-3 text-sm text-ok-600" role="status">{result}</div>
      )}
      {cases.isError && <ErrorState text="Could not load cases." />}
      {cases.isLoading && <p className="text-ink-600">Loading cases...</p>}

      {isAdmin && selected.size > 0 && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="font-medium text-ink-900">{selected.size} case{selected.size === 1 ? "" : "s"} selected</span>
            <div className="flex gap-2">
              <button className={buttonClass("secondary")} onClick={() => setSelected(new Set())}>Clear</button>
              <button className={buttonClass()} onClick={() => setPanelOpen((open) => !open)}>Add to project</button>
            </div>
          </div>
          {panelOpen && (
            <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4 text-sm">
              <label className="flex min-w-56 flex-col font-medium text-ink-900">
                Project
                <select
                  className="mt-1.5 rounded-lg bg-white px-3 py-2 text-ink-900 ring-1 ring-line"
                  value={projectChoice}
                  onChange={(e) => setProjectChoice(e.target.value)}
                >
                  <option value="new">New project…</option>
                  {projects.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              {projectChoice === "new" && (
                <label className="flex min-w-64 flex-1 flex-col font-medium text-ink-900">
                  New project name (3+ characters)
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    maxLength={120}
                    className="mt-1.5 rounded-lg bg-white px-3 py-2 text-ink-900 ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </label>
              )}
              <button
                className={buttonClass()}
                disabled={!canAdd || addToProject.isPending}
                onClick={() => addToProject.mutate()}
              >
                Add accounts
              </button>
              {addToProject.isError && <span className="text-brand-600">Could not add the accounts.</span>}
            </div>
          )}
        </Card>
      )}

      {cases.data && (
        <Card flush>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-600">
                  {isAdmin && (
                    <th className="w-10 px-5 py-3">
                      <input type="checkbox" aria-label="Select all on this page" checked={allOnPage}
                             onChange={toggleAllOnPage} disabled={pageIds.length === 0} />
                    </th>
                  )}
                  <th className="px-5 py-3 font-medium">Case</th>
                  <th className="px-5 py-3 font-medium">Alert</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Score</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {cases.data.items.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0 hover:bg-page/60">
                    {isAdmin && (
                      <td className="px-5 py-3">
                        <input type="checkbox" aria-label={`Select case ${c.id}`} checked={selected.has(c.id)}
                               onChange={() => toggle(c.id)} />
                      </td>
                    )}
                    <td className="px-5 py-3 font-semibold text-ink-900">Case {c.id}</td>
                    <td className="px-5 py-3 text-ink-600">Alert {c.alert_id}</td>
                    <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-3 font-semibold text-ink-900">{c.risk_score.toFixed(2)}</td>
                    <td className="px-5 py-3 text-right">
                      <Link to={`/cases/${c.id}`} className="font-medium text-brand-600 hover:underline">Open</Link>
                    </td>
                  </tr>
                ))}
                {cases.data.items.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-5 py-10 text-center text-ink-400">
                      No cases match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <nav className="flex items-center justify-end gap-3 text-sm text-ink-600">
        <button className={buttonClass("secondary")} disabled={page === 0}
                onClick={() => { setPage((p) => p - 1); setSelected(new Set()); }}>
          Previous
        </button>
        <span>Page {page + 1} of {totalPages}</span>
        <button className={buttonClass("secondary")} disabled={page + 1 >= totalPages}
                onClick={() => { setPage((p) => p + 1); setSelected(new Set()); }}>
          Next
        </button>
      </nav>
    </div>
  );
}
