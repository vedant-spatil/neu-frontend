import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../../api/client";
import { ProjectSummarySchema } from "../../api/schemas";

const ProjectListSchema = z.array(ProjectSummarySchema);

export default function QaProjectsPage() {
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: async () => ProjectListSchema.parse(await api<unknown>("/api/projects")),
  });

  return (
    <section className="space-y-4">
      <h1 className="text-lg font-semibold">My projects</h1>
      <p className="text-sm text-slate-600">Projects you are a QA member of.</p>

      {projects.isError && <p role="alert" className="text-red-600">Could not load projects.</p>}
      {projects.data && projects.data.length === 0 && (
        <p className="text-sm text-slate-600">You are not a member of any project yet.</p>
      )}
      {projects.data && projects.data.length > 0 && (
        <ul className="divide-y rounded bg-white shadow">
          {projects.data.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>{p.name}</span>
              <Link to={`/qa/projects/${p.id}`} className="text-slate-900 underline">Review accounts</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
