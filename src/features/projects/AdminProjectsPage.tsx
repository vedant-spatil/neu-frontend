import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../../api/client";
import { ProjectSummarySchema } from "../../api/schemas";
import { buttonClass, Card, EmptyState, ErrorState, PageHeader } from "../../components/ui";
import { validProjectName } from "./helpers";

const ProjectListSchema = z.array(ProjectSummarySchema);

export default function AdminProjectsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: async () => ProjectListSchema.parse(await api<unknown>("/api/projects")),
  });

  const create = useMutation({
    mutationFn: async (projectName: string) =>
      api<unknown>("/api/projects", { method: "POST", body: JSON.stringify({ name: projectName.trim() }) }),
    onSuccess: () => {
      setName("");
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        subtitle="A project groups accounts for QA review. Add QA members and accounts on the project page."
      />

      <Card title="New project">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (validProjectName(name)) create.mutate(name);
          }}
        >
          <label className="flex min-w-64 flex-1 flex-col text-sm font-medium text-ink-900">
            Project name (3+ characters)
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              className="mt-1.5 rounded-lg bg-white px-3 py-2 text-ink-900 ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <button type="submit" disabled={!validProjectName(name) || create.isPending} className={buttonClass()}>
            Create project
          </button>
        </form>
        {create.isError && <div className="mt-3"><ErrorState text="Could not create the project." /></div>}
      </Card>

      {projects.isError && <ErrorState text="Could not load projects." />}

      <Card title="Projects" flush>
        {projects.data && projects.data.length === 0 && <EmptyState text="No projects yet." />}
        {projects.data && projects.data.length > 0 && (
          <ul className="divide-y divide-line">
            {projects.data.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="font-medium text-ink-900">{p.name}</span>
                <Link to={`/admin/projects/${p.id}`} className="font-medium text-brand-600 hover:underline">Open</Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
