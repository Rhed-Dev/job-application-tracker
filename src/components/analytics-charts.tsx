"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ACCENT_COLOR,
  SOURCE_LABELS,
  STATUS_CHART_COLORS,
  STATUS_LABELS,
  type Status,
} from "@/lib/constants";
import { formatIsoWeekLabel } from "@/lib/format";
import type { FunnelStats, SourceStats } from "@/lib/analytics";

/** Recharts client components for the analytics dashboard (dark themed). */

const AXIS = { stroke: "#52525b", fontSize: 11 } as const;
const TOOLTIP_STYLE = {
  backgroundColor: "#18181b",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px",
  fontSize: "12px",
  color: "#e4e4e7",
} as const;
const GRID_STROKE = "rgba(255,255,255,0.06)";

export function WeeklyApplicationsChart({
  data,
}: {
  data: { weekStart: string; count: number }[];
}) {
  const rows = data.map((d) => ({ ...d, week: formatIsoWeekLabel(d.weekStart) }));
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
          <defs>
            <linearGradient id="weeklyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT_COLOR} stopOpacity={0.45} />
              <stop offset="100%" stopColor={ACCENT_COLOR} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="week" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: "#a1a1aa" }}
            formatter={(value: number | string) => [value, "applications"]}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={ACCENT_COLOR}
            strokeWidth={2}
            fill="url(#weeklyFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FunnelChart({ funnel }: { funnel: FunnelStats }) {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const rows = [
    { stage: "Applied", count: funnel.applied, rate: "100%", color: STATUS_CHART_COLORS.APPLIED },
    {
      stage: "Interviewing",
      count: funnel.interviewing,
      rate: pct(funnel.interviewRate),
      color: STATUS_CHART_COLORS.INTERVIEWING,
    },
    {
      stage: "Offer",
      count: funnel.offer,
      rate: pct(funnel.offerRate),
      color: STATUS_CHART_COLORS.OFFER,
    },
  ];
  return (
    <div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={rows} margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
            <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="stage" tick={{ ...AXIS, fontSize: 12 }} tickLine={false} axisLine={false} width={88} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              formatter={(value: number | string) => [value, "applications"]}
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={22}>
              {rows.map((row) => (
                <Cell key={row.stage} fill={row.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        {rows.map((row) => (
          <div key={row.stage} className="rounded-lg bg-white/[0.03] px-2 py-1.5">
            <p className="text-sm font-semibold" style={{ color: row.color }}>
              {row.rate}
            </p>
            <p className="text-[11px] text-zinc-500">
              {row.stage === "Applied" ? "of all applied" : `from previous stage`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SourceResponseChart({ sources }: { sources: SourceStats[] }) {
  const rows = sources.map((s) => ({
    name: SOURCE_LABELS[s.source],
    rate: Math.round(s.rate * 100),
    responded: s.responded,
    total: s.total,
  }));
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={42} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            formatter={(value: number | string, _name, item) => {
              const row = item?.payload as (typeof rows)[number] | undefined;
              return [
                `${value}% (${row?.responded ?? 0}/${row?.total ?? 0} responded)`,
                "Response rate",
              ];
            }}
          />
          <Bar dataKey="rate" fill={ACCENT_COLOR} fillOpacity={0.85} radius={[6, 6, 0, 0]} barSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StageDurationChart({
  stages,
}: {
  stages: { status: Status; avgDays: number; samples: number }[];
}) {
  const rows = stages.map((s) => ({
    name: STATUS_LABELS[s.status],
    days: Math.round(s.avgDays * 10) / 10,
    samples: s.samples,
    color: STATUS_CHART_COLORS[s.status],
  }));
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={false} interval={0} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            formatter={(value: number | string, _name, item) => {
              const row = item?.payload as (typeof rows)[number] | undefined;
              return [
                `${value} days (across ${row?.samples ?? 0} application${(row?.samples ?? 0) === 1 ? "" : "s"})`,
                "Avg time in stage",
              ];
            }}
          />
          <Bar dataKey="days" radius={[6, 6, 0, 0]} barSize={36}>
            {rows.map((row) => (
              <Cell key={row.name} fill={row.color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
