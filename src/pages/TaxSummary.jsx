import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { FileText, Download, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const DEDUCTIBLE = ["health", "insurance", "loan_payment", "utilities"];

export default function TaxSummary() {
  const { formatCurrency: fmt } = useCurrency();
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);

  const CATEGORY_LABELS = {
    income: T("catIncome", "Income"),
    food: T("catFood", "Food & Dining"),
    transport: T("catTransport", "Transportation"),
    utilities: T("catUtilities", "Utilities"),
    subscriptions: T("catSubscriptions", "Subscriptions"),
    health: T("catHealth", "Health & Medical"),
    insurance: T("catInsurance", "Insurance"),
    rent: T("catRent", "Rent & Housing"),
    loan_payment: T("catLoanPayment", "Loan Payments"),
    savings: T("catSavings", "Savings"),
    entertainment: T("catEntertainment", "Entertainment"),
    shopping: T("catShopping", "Shopping"),
    other: T("catOther", "Other"),
  };

  const { loans, payments } = useFinancialData();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCats, setExpandedCats] = useState({});

  useEffect(() => {
    supabase.from('transactions').select('*').order('date', { ascending: false }).limit(500).then(({ data, error }) => {
      if (error) console.error("Transactions error:", error);
      setTransactions(data || []);
      setLoading(false);
    });
  }, []);

  const yearTxs = transactions.filter(t => t.date?.startsWith(String(year)));
  const yearPayments = payments.filter(p => p.payment_date?.startsWith(String(year)));

  const byCategory = {};
  yearTxs.forEach(t => {
    const cat = t.category || "other";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(t);
  });

  const totalIncome = yearTxs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalExpenses = yearTxs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalLoanPayments = yearPayments.reduce((s, p) => s + (p.amount || 0), 0);

  const deductibleTotal = yearTxs
    .filter(t => DEDUCTIBLE.includes(t.category) && t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const expenseCategories = Object.entries(byCategory)
    .filter(([cat]) => cat !== "income")
    .map(([cat, txs]) => ({
      cat,
      label: CATEGORY_LABELS[cat] || cat,
      total: txs.reduce((s, t) => s + Math.abs(t.amount), 0),
      count: txs.length,
      deductible: DEDUCTIBLE.includes(cat),
      txs,
    }))
    .sort((a, b) => b.total - a.total);

  function exportCSV() {
    const rows = [["Date", "Description", "Amount", "Category", "Deductible?"]];
    yearTxs.forEach(t => {
      rows.push([t.date, t.description, t.amount, CATEGORY_LABELS[t.category] || t.category, DEDUCTIBLE.includes(t.category) ? "Yes" : "No"]);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `tax-summary-${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function toggleCat(cat) {
    setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-heading text-foreground">{T("taxSummaryTitle", "Tax Summary")}</h1>
            <p className="text-xs text-muted-foreground">{T("annualFinancialReport", "Annual financial report")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="text-sm bg-card border border-border rounded-xl px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={exportCSV}>
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-16">{T("loading", "Loading...")}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { label: T("totalIncome", "Total Income"), value: fmt(totalIncome), color: "text-primary" },
              { label: T("totalExpenses", "Total Expenses"), value: fmt(totalExpenses), color: "text-destructive" },
              { label: T("loanPaymentsLabel", "Loan Payments"), value: fmt(totalLoanPayments), color: "text-accent" },
              { label: T("potentiallyDeductible", "Potentially Deductible"), value: fmt(deductibleTotal), color: "text-amber-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-card border border-border rounded-2xl p-4">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className={`text-lg font-bold font-heading ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{T("netCashFlow", "Net Cash Flow")} ({year})</p>
              <p className={`text-2xl font-bold font-heading ${totalIncome - totalExpenses >= 0 ? "text-primary" : "text-destructive"}`}>
                {fmt(totalIncome - totalExpenses)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{T("transactions", "Transactions")}</p>
              <p className="text-lg font-bold text-foreground">{yearTxs.length}</p>
            </div>
          </div>

          <p className="text-sm font-semibold text-foreground mb-3">{T("expenseBreakdown", "Expense Breakdown")}</p>
          <div className="space-y-2 mb-5">
            {expenseCategories.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">{T("noExpenseTransactions", "No expense transactions for {year}").replace("{year}", year)}</p>
            )}
            {expenseCategories.map(({ cat, label, total, count, deductible, txs }) => (
              <div key={cat} className="bg-card border border-border rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleCat(cat)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    {deductible && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-medium">{T("deductible", "deductible")}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{fmt(total)}</span>
                    <span className="text-xs text-muted-foreground">({count})</span>
                    {expandedCats[cat] ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                  </div>
                </button>
                {expandedCats[cat] && (
                  <div className="border-t border-border divide-y divide-border">
                    {txs.map(t => (
                      <div key={t.id} className="flex items-center justify-between px-4 py-2">
                        <div>
                          <p className="text-xs text-foreground">{t.description}</p>
                          <p className="text-[10px] text-muted-foreground">{t.date}</p>
                        </div>
                        <p className="text-xs font-medium text-destructive">{fmt(Math.abs(t.amount))}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            {T("taxDisclaimer", "This is not tax advice. Consult a tax professional for guidance on deductions. Data is based on manually entered transactions.")}
          </p>
        </>
      )}
    </div>
  );
}