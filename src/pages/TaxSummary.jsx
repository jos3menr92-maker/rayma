import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { FileText, Info, TrendingUp, Calculator, Home, GraduationCap, Heart, AlertTriangle } from "lucide-react";

// 2025 US Federal Tax Brackets (educational — simplified)
const BRACKETS = {
  single: [
    { rate: 0.10, upTo: 11925 },
    { rate: 0.12, upTo: 48475 },
    { rate: 0.22, upTo: 103350 },
    { rate: 0.24, upTo: 197300 },
    { rate: 0.32, upTo: 250525 },
    { rate: 0.35, upTo: 626350 },
    { rate: 0.37, upTo: Infinity },
  ],
  married: [
    { rate: 0.10, upTo: 23850 },
    { rate: 0.12, upTo: 96950 },
    { rate: 0.22, upTo: 206700 },
    { rate: 0.24, upTo: 394600 },
    { rate: 0.32, upTo: 501050 },
    { rate: 0.35, upTo: 751600 },
    { rate: 0.37, upTo: Infinity },
  ],
};

const STANDARD_DEDUCTION = { single: 15000, married: 30000 };
const STUDENT_LOAN_CAP = 2500;
const MEDICAL_AGI_THRESHOLD = 0.075;

function calculateTax(taxableIncome, brackets) {
  if (taxableIncome <= 0) return 0;
  let tax = 0;
  let prev = 0;
  for (const { rate, upTo } of brackets) {
    if (taxableIncome > prev) {
      tax += (Math.min(taxableIncome, upTo) - prev) * rate;
      prev = upTo;
    } else break;
  }
  return tax;
}

function getBracketRate(taxableIncome, brackets) {
  if (taxableIncome <= 0) return 0;
  for (const { rate, upTo } of brackets) {
    if (taxableIncome <= upTo) return rate;
  }
  return brackets[brackets.length - 1].rate;
}

export default function TaxSummary() {
  const { formatCurrency: fmt } = useCurrency();
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);

  const { loans, incomes, transactions } = useFinancialData();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [filingStatus, setFilingStatus] = useState("single");

  const yearStr = String(year);

  // --- Income ---
  const yearIncomes = incomes.filter(i => i.week_start?.startsWith(yearStr));
  const yearIncomeTx = transactions.filter(tx => tx.amount > 0 && tx.date?.startsWith(yearStr));
  const totalIncome =
    yearIncomes.reduce((s, i) => s + (i.amount || 0), 0) +
    yearIncomeTx.reduce((s, tx) => s + tx.amount, 0);

  // --- Tax-relevant deductions only ---
  const activeLoans = loans.filter(l => l.status !== "paid_off");

  // Mortgage interest (annual estimate from current balance × rate)
  const mortgageInterest = activeLoans
    .filter(l => l.category === "mortgage")
    .reduce((s, l) => s + ((l.current_balance || 0) * (l.interest_rate || 0) / 100), 0);

  // Student loan interest (capped at $2,500 for deduction)
  const studentInterestRaw = activeLoans
    .filter(l => l.category === "student")
    .reduce((s, l) => s + ((l.current_balance || 0) * (l.interest_rate || 0) / 100), 0);
  const studentInterest = Math.min(studentInterestRaw, STUDENT_LOAN_CAP);

  // Medical expenses (only deductible above 7.5% of AGI)
  const medicalExpenses = transactions
    .filter(tx => tx.category === "health" && tx.amount < 0 && tx.date?.startsWith(yearStr))
    .reduce((s, tx) => s + Math.abs(tx.amount), 0);
  const medicalDeduction = Math.max(0, medicalExpenses - totalIncome * MEDICAL_AGI_THRESHOLD);

  const itemizedDeductions = mortgageInterest + studentInterest + medicalDeduction;
  const standardDeduction = STANDARD_DEDUCTION[filingStatus];
  const usedDeduction = Math.max(standardDeduction, itemizedDeductions);
  const usingStandard = standardDeduction >= itemizedDeductions;

  // --- Tax calculation ---
  const taxableIncome = Math.max(0, totalIncome - usedDeduction);
  const brackets = BRACKETS[filingStatus];
  const marginalRate = getBracketRate(taxableIncome, brackets);
  const estimatedTax = calculateTax(taxableIncome, brackets);
  const effectiveRate = totalIncome > 0 ? (estimatedTax / totalIncome) * 100 : 0;
  const willOweTax = taxableIncome > 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-heading text-foreground">{T("taxEstimatorTitle", "Tax Estimator")}</h1>
              <p className="text-xs text-muted-foreground">{T("taxEstimatorSubtitle", "Estimate your tax bracket before tax season")}</p>
            </div>
          </div>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="text-sm bg-card border border-border rounded-xl px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Educational Disclaimer */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 mb-5 flex gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-foreground leading-relaxed">
            {T("taxEstimatorDisclaimer", "This is an educational estimate to help you understand your potential tax situation — not tax advice or an official calculation. Consult a tax professional for your actual filing.")}
          </p>
        </div>

        {/* Filing Status */}
        <div className="flex gap-2 mb-5">
          {["single", "married"].map(status => (
            <button
              key={status}
              onClick={() => setFilingStatus(status)}
              className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition-all border ${
                filingStatus === status
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              {T(status === "single" ? "filingSingle" : "filingMarried", status === "single" ? "Single" : "Married Joint")}
            </button>
          ))}
        </div>

        {/* Total Income */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <p className="text-xs text-muted-foreground">{T("totalIncome", "Total Income")} ({year})</p>
          </div>
          <p className="text-3xl font-bold font-heading text-primary">{fmt(totalIncome)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {yearIncomes.length + yearIncomeTx.length} {T("incomeSources", "income sources logged")}
          </p>
        </div>

        {/* Estimated Calculation */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">{T("estimatedCalculation", "Estimated Calculation")}</p>
          </div>

          <p className="text-xs font-medium text-muted-foreground mb-2">{T("potentialDeductions", "Potential Deductions")}</p>
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{T("standardDeduction", "Standard Deduction")}</span>
              <span className="text-foreground font-medium">{fmt(standardDeduction)}</span>
            </div>
            {mortgageInterest > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Home className="w-3 h-3" /> {T("mortgageInterest", "Mortgage Interest")}
                </span>
                <span className="text-foreground font-medium">~{fmt(mortgageInterest)}</span>
              </div>
            )}
            {studentInterest > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <GraduationCap className="w-3 h-3" /> {T("studentLoanInterest", "Student Loan Interest")}
                </span>
                <span className="text-foreground font-medium">~{fmt(studentInterest)}</span>
              </div>
            )}
            {medicalExpenses > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Heart className="w-3 h-3" /> {T("medicalExpenses", "Medical Expenses")}
                </span>
                <span className="text-foreground font-medium">~{fmt(medicalExpenses)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
              <span className="text-foreground font-medium">{T("deductionUsed", "Deduction Used")}</span>
              <span className="text-foreground font-semibold">
                {fmt(usedDeduction)}{" "}
                <span className="text-xs text-muted-foreground">
                  ({usingStandard ? T("standard", "Standard") : T("itemized", "Itemized")})
                </span>
              </span>
            </div>
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{T("taxableIncome", "Taxable Income")}</span>
              <span className="text-lg font-bold text-foreground">{fmt(taxableIncome)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{T("taxBracket", "Tax Bracket")}</span>
              <span className="text-lg font-bold text-primary">{(marginalRate * 100).toFixed(0)}%</span>
            </div>
            <div className="flex items-center justify-between bg-primary/5 rounded-xl px-3 py-2.5">
              <span className="text-sm font-semibold text-foreground">{T("estimatedFederalTax", "Estimated Federal Tax")}</span>
              <span className="text-xl font-bold text-primary">{fmt(estimatedTax)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{T("effectiveTaxRate", "Effective Tax Rate")}</span>
              <span className="text-muted-foreground">{effectiveRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className={`rounded-2xl p-4 mb-4 flex items-center gap-3 border ${
          willOweTax ? "bg-amber-500/10 border-amber-500/20" : "bg-primary/10 border-primary/20"
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            willOweTax ? "bg-amber-500/20" : "bg-primary/20"
          }`}>
            <Info className={`w-4 h-4 ${willOweTax ? "text-amber-400" : "text-primary"}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {willOweTax
                ? T("mayOweTaxes", "You may owe federal taxes")
                : T("likelyNoTax", "Likely no federal tax owed")}
            </p>
            <p className="text-xs text-muted-foreground">
              {willOweTax
                ? T("mayOweDesc", "Your income exceeds the deduction threshold. Consider setting aside money for taxes.")
                : T("noTaxDesc", "Your deductions may exceed your income for this year.")}
            </p>
          </div>
        </div>

        {/* Full Disclaimer */}
        <div className="bg-muted/50 rounded-2xl p-4">
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            {T("taxEstimatorFullDisclaimer", "Uses simplified 2025 US federal tax brackets and standard deductions. Does not account for tax credits, state taxes, capital gains, or other situations. Deduction amounts are estimates from your loan data. For educational purposes only — not tax advice. Consult a qualified tax professional.")}
          </p>
        </div>
      </motion.div>
    </div>
  );
}