import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../../api/client";
import { ProjectSummarySchema } from "../../api/schemas";
import { Card, EmptyState, ErrorState, PageHeader } from "../../components/ui";

const ProjectListSchema = z.array(ProjectSummarySchema);

export default function QaProjectsPage() {
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: async () => ProjectListSchema.parse(await api<unknown>("/api/projects")),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="My projects" subtitle="Projects you are a QA member of." />

      {projects.isError && <ErrorState text="Could not load projects." />}

      <Card title="Projects" flush>
        {projects.data && projects.data.length === 0 && (
          <EmptyState text="You are not a member of any project yet." />
        )}
        {projects.data && projects.data.length > 0 && (
          <ul className="divide-y divide-line">
            {projects.data.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="font-medium text-ink-900">{p.name}</span>
                <Link to={`/qa/projects/${p.id}`} className="font-medium text-brand-600 hover:underline">
                  Review accounts
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
