import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "./ui";

// Colours from the design tokens in index.css.
const BRAND = "#b71c22";
const INK = "#1d2024";
const MUTED = "#9aa0a8";
const OK = "#1b8a5f";
const WARN = "#b7770d";
const INFO = "#2f6fbd";
const PALETTE = [BRAND, INK, WARN, INFO, OK, MUTED];

export type Row = { name: string; value: number };

/** Horizontal bars, one per row. Used for alerts by rule and top accounts. */
export function HorizontalBars({ rows, empty, color = BRAND }: { rows: Row[]; empty: string; color?: string }) {
  if (rows.length === 0) return <EmptyState text={empty} />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 34)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12, fill: INK }} />
        <Tooltip />
        <Bar dataKey="value" fill={color} radius={[0, 6, 6, 0]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Vertical columns. Used for the score distribution. */
export function Columns({ rows, empty, color = INK }: { rows: Row[]; empty: string; color?: string }) {
  if (rows.length === 0) return <EmptyState text={empty} />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e7e8ea" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: MUTED }} />
        <YAxis tick={{ fontSize: 12, fill: MUTED }} width={36} />
        <Tooltip />
        <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Two series side by side per label, for example cases opened against approvals. */
export function PairedBars({
  rows,
  seriesA,
  seriesB,
  empty,
}: {
  rows: { label: string; a: number; b: number }[];
  seriesA: string;
  seriesB: string;
  empty: string;
}) {
  if (rows.length === 0) return <EmptyState text={empty} />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e7e8ea" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: MUTED }} />
        <YAxis tick={{ fontSize: 12, fill: MUTED }} width={36} />
        <Tooltip />
        <Legend iconType="circle" />
        <Bar dataKey="a" name={seriesA} fill={INK} radius={[4, 4, 0, 0]} />
        <Bar dataKey="b" name={seriesB} fill={BRAND} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** A line over days. Used for the alert trend. */
export function TrendLine({ rows, label, empty }: { rows: { label: string; value: number }[]; label: string; empty: string }) {
  if (rows.length === 0) return <EmptyState text={empty} />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e7e8ea" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: MUTED }} />
        <YAxis tick={{ fontSize: 12, fill: MUTED }} width={36} />
        <Tooltip />
        <Line type="monotone" dataKey="value" name={label} stroke={BRAND} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Donut for a small set of categories, for example approvals against closures. */
export function Donut({ rows, empty }: { rows: Row[]; empty: string }) {
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  if (total === 0) return <EmptyState text={empty} />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {rows.map((r, i) => (
            <Cell key={r.name} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
}

export const CHART_COLORS = { BRAND, INK, MUTED, OK, WARN, INFO };
