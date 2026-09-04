import { SERIES } from "@/utils/trendMath";

export default function MonthlyBreakdownTable({ data, active, T, fmt }) {
  const visible = SERIES.filter((s) => active.has(s.key));

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold font-heading text-foreground">{T("monthlyBreakdown", "Monthly Breakdown")}</h2>
        <div className="flex flex-wrap gap-2">
          {visible.map((s) => (
            <span key={s.key} className="flex items-center gap-1 text-[9px] text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
              {T(s.labelKey, s.fallback)}
            </span>
          ))}
        </div>
      </div>
      <div className="divide-y divide-border">
        {[...data].reverse().map((d) => (
          <div
            key={d.monthKey}
            className="grid gap-2 items-center px-4 py-3 text-sm"
            style={{ gridTemplateColumns: `1fr repeat(${visible.length}, minmax(0, 1fr))` }}
          >
            <span className="text-muted-foreground">{d.month}</span>
            {visible.map((s) => (
              <span key={s.key} className="font-semibold text-right" style={{ color: s.color }}>
                {fmt(d[s.key] || 0)}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}