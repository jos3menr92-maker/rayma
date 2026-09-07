import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

/**
 * Three-line combined debt-over-time chart: Minimums vs Avalanche vs Snowball.
 * Series are keyed by calendar month (never by array index), and each line
 * stops at its own debt-free point.
 */
export default function StrategyComparisonChart({ runs, fmt, fmtNoDecimal, T }) {
  const series = [
    { key: T("minimumsOnlyLabel", "Minimums Only"), run: runs.minimums, stroke: "hsl(var(--muted-foreground))", dash: "4 4" },
    { key: T("avalancheLabel", "Avalanche"), run: runs.avalanche, stroke: "hsl(var(--primary))", dash: "" },
    { key: T("snowballLabel", "Snowball"), run: runs.snowball, stroke: "hsl(var(--chart-2))", dash: "" },
  ];

  const xMax = Math.min(...series.map((s) => (s.run.monthsToDebtFree != null ? s.run.monthsToDebtFree : 600)));
  const monthSet = new Set();
  series.forEach((s) => s.run.timeline.forEach((p) => { if (p.month <= xMax) monthSet.add(p.month); }));
  const months = [...monthSet].sort((a, b) => a - b);
  if (months.length < 2) return null;

  const data = months.map((m) => {
    const row = { month: m };
    series.forEach((s) => {
      let v = null;
      for (const p of s.run.timeline) {
        if (p.month <= m) v = p.balance;
        else break;
      }
      row[s.key] = v;
    });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} label={{ value: T("monthsAxisLabel", "Months"), position: "insideBottom", offset: -2, fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => fmtNoDecimal(v)} width={48} />
        <Tooltip formatter={(v) => fmt(v)} contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.stroke} strokeWidth={s.key === T("avalancheLabel", "Avalanche") ? 2 : 1.5} strokeDasharray={s.dash || undefined} dot={false} connectNulls={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}