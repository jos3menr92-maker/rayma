import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { SERIES } from "@/utils/trendMath";

export default function TrendChart({ data, active, T, fmt, locale, currency }) {
  // Locale + currency-aware compact axis ("$1.2K", "COP 900 K") — no hardcoded "$"
  const compactFmt = useMemo(() => {
    try {
      return new Intl.NumberFormat(locale, { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 });
    } catch {
      return null;
    }
  }, [locale, currency]);

  const visible = SERIES.filter((s) => active.has(s.key));
  const labelByKey = Object.fromEntries(SERIES.map((s) => [s.key, T(s.labelKey, s.fallback)]));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
        <YAxis
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          width={52}
          tickFormatter={(v) => (compactFmt ? compactFmt.format(v) : fmt(v))}
          domain={["auto", "auto"]}
        />
        <Tooltip
          formatter={(v, name) => [fmt(v), labelByKey[name] || name]}
          contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 11 }}
          labelStyle={{ fontWeight: 600 }}
        />
        <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
        {visible.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.key}
            stroke={s.color}
            strokeWidth={2.5}
            dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}