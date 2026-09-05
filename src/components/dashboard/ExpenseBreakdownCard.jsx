import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ChevronRight } from "lucide-react";
import { useT } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { monthlyObligation } from "@/utils/loanEngine";
import { monthlyBillAmount } from "@/utils/financeMath";

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))",
  "#34d399", "#f97316", "#a78bfa", "#0ea5e9", "#f43f5e",
];

const humanize = (key) => (key || "other").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function PieWithLegend({ title, data, fmt, emptyText }) {
  const totalValue = data.reduce((s, d) => s + (d.value || 0), 0);
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">{title}</p>
      {data.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">{emptyText}</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={2} dataKey="value">
                {data.map((d, i) => <Cell key={d.name} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-1">
            {data.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-foreground truncate">{d.name}</span>
                </div>
                <span className="font-semibold text-foreground shrink-0 ml-2">
                  {fmt(d.value)}
                  {totalValue > 0 && <span className="text-muted-foreground font-normal"> · {Math.round((d.value / totalValue) * 100)}%</span>}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground text-right mt-1.5">
            {title} <span className="font-bold text-foreground">{fmt(totalValue)}</span>
          </p>
        </>
      )}
    </div>
  );
}

export default function ExpenseBreakdownCard({ loans, bills }) {
  const T = useT();
  const navigate = useNavigate();
  const { formatCurrency: fmt } = useCurrency();

  const activeLoans = useMemo(() => (loans || []).filter((l) => l.status !== "paid_off"), [loans]);
  const activeBills = useMemo(() => (bills || []).filter((b) => b.is_active !== false), [bills]);

  const monthlyLoans = useMemo(() => activeLoans.reduce((s, l) => s + monthlyObligation(l), 0), [activeLoans]);

  const expenseData = useMemo(() => {
    const byCategory = {};
    activeBills.forEach((b) => {
      const key = b.category || "other";
      byCategory[key] = (byCategory[key] || 0) + monthlyBillAmount(b);
    });
    const slices = Object.entries(byCategory)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: T(`billCategory_${k}`, humanize(k)), value: v }));
    if (monthlyLoans > 0) slices.push({ name: T("loanPayments", "Loan Payments"), value: monthlyLoans });
    return slices.sort((a, b) => b.value - a.value);
  }, [activeBills, monthlyLoans, T]);

  const loanData = useMemo(() =>
    activeLoans
      .map((l) => ({ name: l.name || T("unnamedLoan", "Unnamed Loan"), value: l.current_balance || l.remaining_balance || 0 }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value),
  [activeLoans, T]);

  const hasContent = expenseData.length > 0 || loanData.length > 0;

  return (
    <div
      className="mb-6 bg-card border border-border rounded-3xl p-4 shadow-sm cursor-pointer active:scale-[0.99] transition-transform"
      onClick={() => navigate("/monthly-recap")}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold font-heading text-foreground">{T("expenseBreakdown", "Expense Breakdown")}</h2>
        <span className="text-xs text-primary font-semibold flex items-center">
          {T("viewDetails", "Details")} <ChevronRight className="w-3 h-3 ml-0.5" />
        </span>
      </div>

      {!hasContent ? (
        <p className="text-xs text-muted-foreground py-2">
          {T("noExpensesYet", "No bills or loans yet — add one to see your breakdown.")}
        </p>
      ) : (
        <>
          <PieWithLegend
            title={T("totalMonthly", "Total Monthly")}
            data={expenseData}
            fmt={fmt}
            emptyText={T("noMonthlyData", "No monthly obligations yet.")}
          />
          {loanData.length > 0 && (
            <>
              <div className="border-t border-border my-4" />
              <PieWithLegend
                title={T("loanBalances", "Loan Balances")}
                data={loanData}
                fmt={fmt}
                emptyText={T("noActiveLoans", "No active loans.")}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}