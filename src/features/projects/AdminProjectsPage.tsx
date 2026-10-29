import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../../api/client";
import { ProjectSummarySchema } from "../../api/schemas";
import { buttonClass, Card, EmptyState, ErrorState, PageHeader } from "../../components/ui";
import { validProjectName } from "./helpers";
import { ProjectCard } from "./ProjectCard";

const ProjectListSchema = z.array(ProjectSummarySchema);

export default function AdminProjectsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: async () => ProjectListSchema.parse(await api<unknown>("/api/projects")),
  });

  const create = useMutation({
    mutationFn: async (projectName: string) =>
      api<unknown>("/api/projects", { method: "POST", body: JSON.stringify({ name: projectName.trim() }) }),
    onSuccess: () => {
      setName("");
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        actions={
          <button type="button" onClick={() => setCreating((c) => !c)} className={buttonClass()}>
            {creating ? "Cancel" : "New project"}
          </button>
        }
      />

      {creating && (
        <Card>
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
                autoFocus
                className="mt-1.5 rounded-lg bg-white px-3 py-2 text-ink-900 ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
            <button type="submit" disabled={!validProjectName(name) || create.isPending} className={buttonClass()}>
              Create project
            </button>
          </form>
          {create.isError && <div className="mt-3"><ErrorState text="Could not create the project." /></div>}
        </Card>
      )}

      {projects.isError && <ErrorState text="Could not load projects." />}
      {projects.data && projects.data.length === 0 && <EmptyState text="No projects yet. Create one to group accounts for review." />}

      {projects.data && projects.data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.data.map((p) => (
            <Link key={p.id} to={`/admin/projects/${p.id}`} className="block">
              <ProjectCard name={p.name} members={p.members ?? 0} accounts={p.accounts ?? 0} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
