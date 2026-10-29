import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  label: string;
  value: string;
  options: string[];
  disabled?: boolean;
  onChange: (column: string) => void;
};

/** A dropdown for one schema field: searchable, closes on outside click or Escape, marks the chosen column. */
export default function FieldSelect({ label, value, options, disabled = false, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const shown = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase())),
    [options, query],
  );

  const choose = (column: string) => {
    onChange(column);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={ref} className="relative w-full min-w-56">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-xl bg-white px-3 py-2.5 text-left text-sm text-ink-900 ring-1 ring-line transition hover:ring-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
      >
        <span className={`truncate ${value ? "" : "text-ink-400"}`}>{value || "Not mapped"}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-400" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-line">
          <div className="border-b border-line p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search columns"
              className="w-full rounded-lg bg-page px-3 py-1.5 text-sm text-ink-900 outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-auto py-1 text-sm">
            <li
              role="option"
              aria-selected={value === ""}
              onClick={() => choose("")}
              className="cursor-pointer px-3 py-2 text-ink-600 hover:bg-page"
            >
              Not mapped
            </li>
            {shown.map((c) => (
              <li
                key={c}
                role="option"
                aria-selected={c === value}
                onClick={() => choose(c)}
                className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-ink-900 hover:bg-page"
              >
                <span className="truncate">{c}</span>
                {c === value && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                       strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-brand-600" aria-hidden>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </li>
            ))}
            {shown.length === 0 && <li className="px-3 py-2 text-ink-400">No matching columns</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
