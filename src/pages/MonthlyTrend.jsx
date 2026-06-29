import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { t } from "@/lib/i18n";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { getMonthName } from "@/utils/formatLocalized";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

function getMonthKey(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key, locale) {
  const [y, m] = key.split("-");
  return `${getMonthName(parseInt(m) - 1, locale, "short")} ${y.slice(2)}`;
}

function buildTypeConfig(T) {
  return {
    totalDebt: { label: T("totalDebt", "Total Debt"), color: "hsl(var(--destructive))", description: T("totalDebtDesc", "Original loan amounts over time") },
    remaining: { label: T("remainingBalance", "Remaining Balance"), color: "hsl(var(--accent))", description: T("remainingDesc", "Outstanding balance by month") },
    totalPaid: { label: T("totalPaid", "Total Paid"), color: "hsl(var(--primary))", description: T("totalPaidDesc", "Cumulative payments made") },
    monthlyDue: { label: T("monthlyDue", "Monthly Due"), color: "hsl(var(--chart-3))", description: T("monthlyDueDesc", "Total monthly obligations") },
  };
}

export default function MonthlyTrend() {
  const { lang, locale } = useLanguage();
  const { formatCurrency: fmt } = useCurrency();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const type = urlParams.get("type") || "totalPaid";

  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const TYPE_CONFIG = useMemo(() => buildTypeConfig(T), [lang]);
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.totalPaid;

  useEffect(() => { loadData(); }, [type]);

  async function loadData() {
    const [loans, payments, bills] = await Promise.all([
      base44.entities.Loan.list("-created_date", 100),
      base44.entities.Payment.list("-payment_date", 500),
      base44.entities.Bill.list("-created_date", 100),
    ]);

    const activeBills = bills.filter(b => b.is_active !== false);
    const monthlyBills = activeBills.reduce((s, b) => s + (b.amount || 0), 0);

    // Group payments by month
    const byMonth = {};
    payments.forEach(p => {
      const key = getMonthKey(p.payment_date);
      if (!byMonth[key]) byMonth[key] = 0;
      byMonth[key] += p.amount || 0;
    });

    // Build sorted month list from loan start dates + payment dates
    const allKeys = new Set();
    payments.forEach(p => allKeys.add(getMonthKey(p.payment_date)));
    loans.forEach(l => { if (l.start_date) allKeys.add(getMonthKey(l.start_date)); });

    // Fill in last 12 months at minimum
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      allKeys.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    const sortedKeys = [...allKeys].sort();

    // Calculate running totals
    const originalDebt = loans.reduce((s, l) => s + (l.original_amount || 0), 0);
    const currentBalance = loans.filter(l => l.status !== "paid_off").reduce((s, l) => s + (l.current_balance || 0), 0);
    const totalPaidToDate = loans.reduce((s, l) => s + Math.max(0, (l.original_amount || 0) - (l.current_balance || 0)), 0);

    // BUG FIX: Calculate base payments made before user started tracking individual logs
    const totalLoggedPayments = Object.values(byMonth).reduce((s, v) => s + v, 0);
    const untrackedPaid = Math.max(0, totalPaidToDate - totalLoggedPayments);

    let cumulativePaid = untrackedPaid; // Start from the untracked baseline instead of 0
    
    const data = sortedKeys.map(key => {
      const monthPaid = byMonth[key] || 0;
      cumulativePaid += monthPaid;

      // BUG FIX: In the past, the remaining balance was HIGHER. Add payments since to find past balance.
      const approxRemaining = currentBalance + (totalPaidToDate - cumulativePaid);
      const monthlyLoanPayments = loans.filter(l => l.status !== "paid_off").reduce((s, l) => s + (l.monthly_payment || 0), 0);

      return {
        month: monthLabel(key, locale),
        totalDebt: originalDebt,
        remaining: type === "remaining" ? approxRemaining : undefined,
        totalPaid: cumulativePaid,
        monthlyDue: monthlyLoanPayments + monthlyBills,
        value:
          type === "totalDebt" ? originalDebt :
          type === "remaining" ? approxRemaining :
          type === "totalPaid" ? cumulativePaid :
          monthlyLoanPayments + monthlyBills,
      };
    });

    // Only show months with meaningful data
    const filtered = type === "totalPaid"
      ? data.filter(d => d.value > 0)
      : data;

    setChartData(filtered.slice(-12));
    setLoading(false);
  }

  const maxVal = Math.max(...chartData.map(d => d.value), 1);
  const minVal = Math.min(...chartData.map(d => d.value), 0);
  const latest = chartData[chartData.length - 1]?.value || 0;
  const prev = chartData[chartData.length - 2]?.value || 0;
  const delta = latest - prev;

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground mb-5 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {T("back", "Back")}
        </button>

        <h1 className="text-2xl font-bold font-heading text-foreground mb-1">{config.label}</h1>
        <p className="text-sm text-muted-foreground mb-6">{config.description}</p>

        {/* Summary */}
        <div className="bg-card border border-border rounded-3xl p-5 mb-6">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{T("current", "Current")}</p>
          <p className="text-3xl font-bold font-heading text-foreground mb-1">{fmt(latest)}</p>
          {chartData.length >= 2 && (
            <p className={`text-sm font-medium ${delta >= 0 ? "text-primary" : "text-destructive"}`}>
              {delta >= 0 ? "+" : ""}{fmt(delta)} {T("vsLastMonth", "vs last month")}
            </p>
          )}
        </div>

        {/* Chart */}
        <div className="bg-card border border-border rounded-3xl p-4 mb-6">
          <h2 className="text-sm font-semibold font-heading text-foreground mb-4">{T("monthlyTrend", "Monthly Trend")}</h2>
          {chartData.length < 2 ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">{T("notEnoughData", "Not enough data yet — keep tracking!")}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={v => `$${Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`}
                  width={48}
                  domain={[Math.max(minVal * 0.95, 0), maxVal * 1.05]}
                />
                <Tooltip
                  formatter={v => [fmt(v), config.label]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: 11 }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={config.color}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: config.color, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Monthly breakdown table */}
        {chartData.length > 0 && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold font-heading text-foreground">{T("monthlyBreakdown", "Monthly Breakdown")}</h2>
            </div>
            <div className="divide-y divide-border">
              {[...chartData].reverse().map((d, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">{d.month}</span>
                  <span className="text-sm font-semibold text-foreground">{fmt(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}