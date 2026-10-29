/** A project tile for the projects grid: name, member count and account count. */
export function ProjectCard({ name, members, accounts }: { name: string; members: number; accounts: number }) {
  return (
    <article className="h-full rounded-2xl bg-white p-5 shadow-sm ring-1 ring-line transition hover:ring-2 hover:ring-brand-500">
      <h2 className="truncate text-base font-semibold text-ink-900">{name}</h2>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-page px-3 py-2">
          <dt className="text-xs uppercase tracking-wide text-ink-400">Members</dt>
          <dd className="mt-0.5 font-semibold text-ink-900">{members}</dd>
        </div>
        <div className="rounded-xl bg-page px-3 py-2">
          <dt className="text-xs uppercase tracking-wide text-ink-400">Accounts</dt>
          <dd className="mt-0.5 font-semibold text-ink-900">{accounts}</dd>
        </div>
      </dl>
    </article>
  );
}
