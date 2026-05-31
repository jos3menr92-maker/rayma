import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";

const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n || 0);

export default function NetWorthChart() {
  const [snapshots, setSnapshots] = useState([]);

  useEffect(() => {
    let cancelled = false;
    base44.entities.NetWorthSnapshot.list("snapshot_date", 24).then(data => {
      if (!cancelled) {
        setSnapshots(data.map(s => ({
          ...s,
          label: s.snapshot_date ? format(new Date(s.snapshot_date + "T00:00:00"), "MMM d") : "",
        })));
      }
    });
    return () => { cancelled = true; };
  }, []);

  if (snapshots.length < 2) return null;

  const latest = snapshots[snapshots.length - 1];
  const prev = snapshots[snapshots.length - 2];
  const change = latest.net_worth - prev.net_worth;
  const isUp = change >= 0;

  return (
    <div className="mb-6 bg-card border border-border rounded-3xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold font-heading text-foreground">Net Worth Trend</h2>
        <div className={`flex items-center gap-1 text-xs font-semibold ${isUp ? "text-primary" : "text-destructive"}`}>
          {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {isUp ? "+" : ""}{fmt(change)}
        </div>
      </div>
      <p className="text-xl font-bold font-heading text-foreground mb-3">{fmt(latest.net_worth)}</p>
      <ResponsiveContainer width="100%" height={100}>
        <LineChart data={snapshots} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip
            formatter={(v) => [fmt(v), "Net Worth"]}
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
          />
          <Line
            type="monotone"
            dataKey="net_worth"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3, fill: "hsl(var(--primary))" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}