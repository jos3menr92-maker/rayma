import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { t } from "@/lib/i18n";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { getMonthName } from "@/utils/formatLocalized";
import { supabase } from "@/lib/supabaseClient";
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

  const { loans: ctxLoans, payments: ctxPayments, bills: ctxBills, supaUser } = useFinancialData();

  useEffect(() => {
    if (!ctxLoans && !ctxPayments && !ctxBills) return;
    loadData(ctxLoans, ctxPayments, ctxBills);
  }, [ctxLoans, ctxPayments, ctxBills, type, locale, supaUser?.id]);

  async function loadData(loans, payments, bills) {
    setLoading(true);

    const uid = supaUser?.id;
    const [incomeRes, txRes, splitRes] = await Promise.all([
      uid
        ? supabase.from("incomes").select("amount,week_start").eq("user_id", uid).order("week_start", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      uid
        ? supabase.from("transactions").select("id,date,amount").eq("user_id", uid).order("date", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      uid
        ? supabase.from("transaction_splits").select("transaction_id,amount").eq("user_id", uid)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (incomeRes.error) console.error("Income fetch error:", incomeRes.error);
    if (txRes.error) console.error("Transactions fetch error:", txRes.error);
    if (splitRes.error) console.error("Transaction splits fetch error:", splitRes.error);

    const incomes = incomeRes.data || [];
    const transactions = txRes.data || [];
    const splits = splitRes.data || [];

    const splitByTx = splits.reduce((acc, sp) => {
      if (!acc[sp.transaction_id]) acc[sp.transaction_id] = 0;
      acc[sp.transaction_id] += Math.abs(sp.amount || 0);
      return acc;
    }, {});

    const incomeByMonth = {};
    incomes.forEach((inc) => {
      if (!inc.week_start) return;
      const key = getMonthKey(inc.week_start);
      if (!incomeByMonth[key]) incomeByMonth[key] = 0;
      incomeByMonth[key] += inc.amount || 0;
    });

    const spendingByMonth = {};
    transactions.forEach((tx) => {
      if (!tx.date) return;
      const key = getMonthKey(tx.date);
      const parentSpending = tx.amount < 0 ? Math.abs(tx.amount) : 0;
      const splitSpending = splitByTx[tx.id] || 0;
      const totalSpending = splitSpending > 0 ? splitSpending : parentSpending;
      if (!spendingByMonth[key]) spendingByMonth[key] = 0;
      spendingByMonth[key] += totalSpending;
    });

    const allKeys = new Set();
    Object.keys(incomeByMonth).forEach((k) => allKeys.add(k));
    Object.keys(spendingByMonth).forEach((k) => allKeys.add(k));

    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      allKeys.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    const data = [...allKeys]
      .sort()
      .map((key) => {
        const income = incomeByMonth[key] || 0;
        const spending = spendingByMonth[key] || 0;
        const netFlow = income - spending;
        return {
          month: monthLabel(key, locale),
          income,
          spending,
          netFlow,
        };
      });

    setChartData(data.slice(-12));
    setLoading(false);
  }

  const maxVal = Math.max(...chartData.flatMap(d => [d.income, d.spending]), 1);
  const latest = chartData[chartData.length - 1];
  const latestNet = latest?.netFlow || 0;
  const prevNet = chartData[chartData.length - 2]?.netFlow || 0;
  const delta = latestNet - prevNet;

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

        <h1 className="text-2xl font-bold font-heading text-foreground mb-1">{T("incomeVsSpending", "Income vs. Spending")}</h1>
        <p className="text-sm text-muted-foreground mb-6">{T("incomeVsSpendingDesc", "Monthly income, spending, and net flow")}</p>

        {/* Summary */}
        <div className="bg-card border border-border rounded-3xl p-5 mb-6">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{T("currentNetFlow", "Current Net Flow")}</p>
          <p className="text-3xl font-bold font-heading text-foreground mb-1">{fmt(latestNet)}</p>
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
                  domain={[0, maxVal * 1.05]}
                />
                <Tooltip
                  formatter={(v, name) => [fmt(v), name === "income" ? T("income", "Income") : T("spending", "Spending")]}
                  labelFormatter={(label, payload) => {
                    const row = payload?.[0]?.payload;
                    const net = row?.netFlow || 0;
                    return `${label} • ${T("netFlow", "Net Flow")}: ${fmt(net)}`;
                  }}
                  contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: 11 }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="income"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="spending"
                  name="spending"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "hsl(var(--destructive))", strokeWidth: 0 }}
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
                <div key={i} className="grid grid-cols-4 gap-2 items-center px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{d.month}</span>
                  <span className="text-primary font-semibold text-right">{fmt(d.income)}</span>
                  <span className="text-destructive font-semibold text-right">{fmt(d.spending)}</span>
                  <span className={`font-semibold text-right ${d.netFlow >= 0 ? "text-foreground" : "text-destructive"}`}>{fmt(d.netFlow)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
