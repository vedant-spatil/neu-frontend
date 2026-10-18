import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../../api/client";
import { ProjectSummarySchema } from "../../api/schemas";
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
    <section className="space-y-4">
      <h1 className="text-lg font-semibold">Projects</h1>
      <p className="text-sm text-slate-600">
        A project groups accounts for QA review. Add QA members and accounts on the project page.
      </p>

      <form
        className="flex items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (validProjectName(name)) create.mutate(name);
        }}
      >
        <label className="flex flex-col text-sm">
          Project name (3+ characters)
          <input value={name} onChange={(e) => setName(e.target.value)}
                 className="mt-1 rounded border px-2 py-1" maxLength={120} />
        </label>
        <button type="submit" disabled={!validProjectName(name) || create.isPending}
                className="rounded bg-slate-900 px-3 py-1 text-white disabled:opacity-50">Create project</button>
      </form>
      {create.isError && <p role="alert" className="text-red-600">Could not create the project.</p>}

      {projects.isError && <p role="alert" className="text-red-600">Could not load projects.</p>}
      {projects.data && projects.data.length === 0 && <p className="text-sm text-slate-600">No projects yet.</p>}
      {projects.data && projects.data.length > 0 && (
        <ul className="divide-y rounded bg-white shadow">
          {projects.data.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>{p.name}</span>
              <Link to={`/admin/projects/${p.id}`} className="text-slate-900 underline">Open</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
