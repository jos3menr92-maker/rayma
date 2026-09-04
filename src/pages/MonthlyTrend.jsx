import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { t } from "@/lib/i18n";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { SERIES, RANGES, buildMonthlySeries, buildCurrentMonthSeries, isValidSeriesKey } from "@/utils/trendMath";
import RangeSelector from "@/components/trend/RangeSelector";
import SeriesToggles from "@/components/trend/SeriesToggles";
import TrendChart from "@/components/trend/TrendChart";
import MonthlyBreakdownTable from "@/components/trend/MonthlyBreakdownTable";

const DEFAULT_SERIES = ["income", "spending", "netFlow"];

function initialActive() {
  const urlParams = new URLSearchParams(window.location.search);
  const raw = urlParams.get("series");
  const valid = raw ? raw.split(",").map((s) => s.trim()).filter(isValidSeriesKey) : [];
  return new Set(valid.length ? valid : DEFAULT_SERIES);
}

export default function MonthlyTrend() {
  const { lang, locale } = useLanguage();
  const { formatCurrency: fmt, currency } = useCurrency();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const navigate = useNavigate();
  const { incomes, transactions, transactionSplits, payments, loading } = useFinancialData();

  const [range, setRange] = useState("1y");
  const [active, setActive] = useState(initialActive);
  const [view, setView] = useState("chart");

  const months = useMemo(() => RANGES.find((r) => r.key === range)?.months || 12, [range]);
  const data = useMemo(
    () => range === "month"
      ? buildCurrentMonthSeries({ incomes, transactions, transactionSplits, payments }, locale)
      : buildMonthlySeries({ incomes, transactions, transactionSplits, payments }, months, locale),
    [range, incomes, transactions, transactionSplits, payments, months, locale]
  );

  const latest = data[data.length - 1];
  const latestNet = latest?.netFlow || 0;
  const prevNet = data[data.length - 2]?.netFlow || 0;
  const delta = latestNet - prevNet;
  const hasData = data.some((d) => SERIES.some((s) => (d[s.key] || 0) !== 0));

  function toggleSeries(key) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground mb-5 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {T("back", "Back")}
        </button>

        <h1 className="text-2xl font-bold font-heading text-foreground mb-1">{T("incomeVsSpending", "Income vs. Spending")}</h1>
        <p className="text-sm text-muted-foreground mb-6">{T("incomeVsSpendingDesc", "Monthly income, spending, and net flow")}</p>

        {/* Net flow summary */}
        {hasData && (
          <div className="bg-card border border-border rounded-3xl p-5 mb-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{T("currentNetFlow", "Current Net Flow")}</p>
            <p className="text-3xl font-bold font-heading text-foreground mb-1">{fmt(latestNet)}</p>
            {range !== "month" && data.length >= 2 && (
              <p className={`text-sm font-medium ${delta >= 0 ? "text-primary" : "text-destructive"}`}>
                {delta >= 0 ? "+" : ""}{fmt(delta)} {T("vsLastMonth", "vs last month")}
              </p>
            )}
          </div>
        )}

        {/* Range presets + Chart/Table tabs */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <RangeSelector value={range} onChange={setRange} T={T} />
          <div className="flex rounded-full border border-border overflow-hidden shrink-0">
            <button
              onClick={() => setView("chart")}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${view === "chart" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {T("chartView", "Chart")}
            </button>
            <button
              onClick={() => setView("table")}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {T("tableView", "Table")}
            </button>
          </div>
        </div>

        {/* Series toggles — tap to show/hide each line */}
        <div className="mb-4">
          <SeriesToggles active={active} onToggle={toggleSeries} T={T} />
        </div>

        {view === "chart" ? (
          <div className="bg-card border border-border rounded-3xl p-4">
            {!hasData ? (
              <div className="h-48 flex items-center justify-center text-center px-4">
                <p className="text-sm text-muted-foreground">{T("notEnoughData", "Not enough data yet — keep tracking!")}</p>
              </div>
            ) : active.size === 0 ? (
              <div className="h-48 flex items-center justify-center text-center px-4">
                <p className="text-sm text-muted-foreground">{T("selectSeriesHint", "Tap a series to show or hide it")}</p>
              </div>
            ) : (
              <TrendChart data={data} active={active} T={T} fmt={fmt} locale={locale} currency={currency} />
            )}
          </div>
        ) : (
          <MonthlyBreakdownTable
            data={data}
            active={active}
            T={T}
            fmt={fmt}
            title={range === "month" ? T("dailyBreakdown", "Daily Breakdown") : T("monthlyBreakdown", "Monthly Breakdown")}
          />
        )}
      </motion.div>
    </div>
  );
}