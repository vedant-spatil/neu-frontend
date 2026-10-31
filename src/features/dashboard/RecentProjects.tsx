import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { api } from "../../api/client";
import { ProjectSummarySchema } from "../../api/schemas";
import { useMe } from "../../auth/useAuth";
import { Card, EmptyState, ErrorState } from "../../components/ui";

const ProjectListSchema = z.array(ProjectSummarySchema);
const ROW_LIMIT = 8;

type Filter = "all" | "ready" | "empty";
const FILTER_LABEL: Record<Filter, string> = { all: "All projects", ready: "With accounts", empty: "No accounts yet" };
const NEXT_FILTER: Record<Filter, Filter> = { all: "ready", ready: "empty", empty: "all" };

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * The newest projects with their member and account counts. A project is Ready when it has accounts to review. The
 * rows open the project: the admin page for admins, the QA page for QA.
 */
export default function RecentProjects() {
  const me = useMe();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: async () => ProjectListSchema.parse(await api<unknown>("/api/projects")),
  });

  const base = me.data?.role === "qa" ? "/qa/projects" : "/admin/projects";
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (projects.data ?? []).filter((p) => {
      const ready = (p.accounts ?? 0) > 0;
      if (filter === "ready" && !ready) return false;
      if (filter === "empty" && ready) return false;
      return p.name.toLowerCase().includes(needle);
    });
  }, [projects.data, filter, query]);

  return (
    <Card
      title="Recent projects"
      action={<Link to={base} className="text-sm font-semibold text-brand-600 hover:underline">See all</Link>}
    >
      <div className="mb-4 flex items-center gap-3">
        <label className="relative flex-1">
          <span className="sr-only">Search projects</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
               strokeLinecap="round" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects"
            className="w-full rounded-xl bg-white py-2 pl-9 pr-3 text-sm text-ink-900 ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <button
          type="button"
          onClick={() => setFilter((f) => NEXT_FILTER[f])}
          aria-label={`Filter: ${FILTER_LABEL[filter]}. Click to change`}
          title={`Filter: ${FILTER_LABEL[filter]}`}
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ring-line ${
            filter !== "all" ? "bg-brand-50 text-brand-600" : "text-ink-600 hover:bg-page"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
               strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 5h18l-7 8v6l-4 2v-8z" />
          </svg>
        </button>
      </div>

      {projects.isError && <ErrorState text="Could not load projects." />}
      {projects.data && rows.length === 0 && (
        <EmptyState text={projects.data.length === 0 ? "No projects yet." : "No projects match."} />
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl ring-1 ring-line">
          <table className="w-full min-w-[30rem] text-sm">
            <thead className="bg-page text-left text-ink-600">
              <tr>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="py-3 font-medium">Status</th>
                <th className="py-3 text-right font-medium">Members</th>
                <th className="py-3 text-right font-medium">Accounts</th>
                <th className="px-4 py-3 text-right font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, ROW_LIMIT).map((p) => {
                const ready = (p.accounts ?? 0) > 0;
                return (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`${base}/${p.id}`)}
                    className="cursor-pointer border-t border-line transition-colors hover:bg-page/60"
                  >
                    <td className="px-4 py-3 font-semibold text-ink-900">
                      <Link to={`${base}/${p.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        ready ? "text-ok-600" : "text-ink-600"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${ready ? "bg-ok-600" : "bg-ink-400"}`} />
                        {ready ? "Ready" : "No accounts"}
                      </span>
                    </td>
                    <td className="py-3 text-right">{p.members ?? 0}</td>
                    <td className="py-3 text-right">{p.accounts ?? 0}</td>
                    <td className="px-4 py-3 text-right text-ink-600">{formatDate(p.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
