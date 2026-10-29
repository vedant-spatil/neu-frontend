import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../../api/client";
import { ProjectSummarySchema } from "../../api/schemas";
import { EmptyState, ErrorState, PageHeader } from "../../components/ui";
import { ProjectCard } from "./ProjectCard";

const ProjectListSchema = z.array(ProjectSummarySchema);

export default function QaProjectsPage() {
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: async () => ProjectListSchema.parse(await api<unknown>("/api/projects")),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="My projects" />

      {projects.isError && <ErrorState text="Could not load projects." />}
      {projects.data && projects.data.length === 0 && <EmptyState text="You are not a member of any project yet." />}

      {projects.data && projects.data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.data.map((p) => (
            <Link key={p.id} to={`/qa/projects/${p.id}`} className="block">
              <ProjectCard name={p.name} members={p.members ?? 0} accounts={p.accounts ?? 0} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
