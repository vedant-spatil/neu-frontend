import type { ReactNode } from "react";

/**
 * A white panel with a soft shadow. Optional title and action (for example a "See all" link).
 * `flush` removes the padding, for tables that should reach the card edges (the header keeps its own padding).
 */
export function Card({
  id,
  title,
  action,
  children,
  className = "",
  flush = false,
}: {
  id?: string;
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  flush?: boolean;
}) {
  const pad = flush ? "" : "p-5";
  return (
    <section id={id} className={`rounded-2xl bg-white shadow-sm ring-1 ring-line ${pad} ${className}`}>
      {(title || action) && (
        <header className={`mb-4 flex items-center justify-between gap-3 ${flush ? "px-5 pt-5" : ""}`}>
          {title && <h2 className="text-base font-semibold text-ink-900">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/** One number with a label, and an optional trend pill (for example "+4.2% vs last week"). */
export function StatCard({
  label,
  value,
  trend,
  icon,
}: {
  label: string;
  value: number | string;
  trend?: { text: string; tone: "up" | "down" | "neutral" };
  icon?: ReactNode;
}) {
  // Coloured text only, no background: the trend reads as a label, not a badge.
  const tone = {
    up: "text-ok-600",
    down: "text-brand-600",
    neutral: "text-info-600",
  }[trend?.tone ?? "neutral"];
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-line">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-600">{label}</span>
        {icon}
      </div>
      <div className="mt-2 text-3xl font-semibold text-ink-900">{value}</div>
      {trend && (
        <span className={`mt-3 inline-flex text-xs font-medium ${tone}`}>{trend.text}</span>
      )}
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  open: "bg-info-50 text-info-600",
  awaiting_review: "bg-warn-50 text-warn-600",
  approved: "bg-ok-50 text-ok-600",
  closed: "bg-line text-ink-600",
  superseded: "bg-line text-ink-600",
  failed: "bg-brand-50 text-brand-600",
  validating: "bg-info-50 text-info-600",
  loading: "bg-info-50 text-info-600",
  triaging: "bg-info-50 text-info-600",
  triaged: "bg-ok-50 text-ok-600",
  rejected: "bg-brand-50 text-brand-600",
};

// Shown labels. The stored status values don't change. "open" means the workflow is still running.
const STATUS_LABEL: Record<string, string> = {
  open: "Running",
  awaiting_review: "Awaiting review",
};

const STATUS_HINT: Record<string, string> = {
  open: "The workflow is still running: triage, flow tracer, screening, typology and the SAR draft.",
  awaiting_review: "The workflow has finished. An investigator must approve or close the case.",
};

/**
 * Status label for a case or import. By default a coloured pill; `plain` shows only the coloured text, for tables
 * where the colour alone carries the status. Unknown statuses get neutral text.
 */
export function StatusBadge({ status, plain = false }: { status: string; plain?: boolean }) {
  const tone = STATUS_TONE[status] ?? "bg-line text-ink-600";
  const label = STATUS_LABEL[status] ?? status.replace(/_/g, " ");
  if (plain) {
    const text = tone.split(" ").find((c) => c.startsWith("text-")) ?? "text-ink-600";
    return (
      <span title={STATUS_HINT[status]} className={`text-xs font-medium ${text}`}>
        {label}
      </span>
    );
  }
  return (
    <span title={STATUS_HINT[status]} className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}

/** Small rule badge, for example R3 fan in. */
export function RuleBadge({ rule }: { rule: string }) {
  return <span className="mr-1 inline-flex rounded bg-brand-50 px-1.5 py-0.5 font-mono text-xs text-brand-600">{rule}</span>;
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-600">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-ink-400">{text}</p>;
}

export function ErrorState({ text }: { text: string }) {
  return (
    <div role="alert" className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-600">
      {text}
    </div>
  );
}

/** Numbered steps, for example upload, map columns, sync. Steps before `current` are done. */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-3 text-sm">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-3">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                done ? "bg-ok-600 text-white" : active ? "bg-brand-600 text-white" : "bg-line text-ink-600"
              }`}
            >
              {i + 1}
            </span>
            <span className={active ? "font-medium text-ink-900" : "text-ink-600"}>{label}</span>
            {i < steps.length - 1 && <span className="mx-1 h-px w-8 bg-line" />}
          </li>
        );
      })}
    </ol>
  );
}

/** Primary (red) and secondary (outlined) buttons, with a disabled style. */
export function buttonClass(kind: "primary" | "secondary" = "primary"): string {
  return kind === "primary"
    ? "rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-ink-400"
    : "rounded-lg px-4 py-2 text-sm font-medium text-ink-900 ring-1 ring-line hover:bg-page disabled:opacity-50";
}
