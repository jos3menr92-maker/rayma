import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { FileText, Info, TrendingUp, Calculator, Home, GraduationCap, Heart, AlertTriangle, Sparkles } from "lucide-react";
import TaxProfileEditor, { TAX_EVENT_TYPES } from "@/components/tax/TaxProfileEditor";

// 2025 US Federal Tax Brackets
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
  head_of_household: [
    { rate: 0.10, upTo: 17000 },
    { rate: 0.12, upTo: 64850 },
    { rate: 0.22, upTo: 103350 },
    { rate: 0.24, upTo: 197300 },
    { rate: 0.32, upTo: 250500 },
    { rate: 0.35, upTo: 626350 },
    { rate: 0.37, upTo: Infinity },
  ],
};

const STANDARD_DEDUCTION = { single: 15000, married: 30000, head_of_household: 22500 };
const STUDENT_LOAN_CAP = 2500;
const MEDICAL_AGI_THRESHOLD = 0.075;
const CTC_PER_CHILD = 2000;
const CTC_PHASE_OUT = { single: 200000, married: 400000, head_of_household: 200000 };

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

function calculateCTC(dependents, income, filingStatus) {
  if (dependents <= 0) return 0;
  const credit = dependents * CTC_PER_CHILD;
  const phaseOutStart = CTC_PHASE_OUT[filingStatus] || 200000;
  if (income <= phaseOutStart) return credit;
  const reduction = Math.floor((income - phaseOutStart) / 1000) * 50;
  return Math.max(0, credit - reduction);
}

function getEventCredits(events) {
  return events.reduce((sum, e) => {
    const info = TAX_EVENT_TYPES[e.event_type];
    if (!info || info.treatment !== "credit") return sum;
    let credit = (e.amount || 0) * (info.rate || 0);
    if (info.max) credit = Math.min(credit, info.max);
    return sum + credit;
  }, 0);
}

function getEventDeductions(events) {
  return events.reduce((sum, e) => {
    const info = TAX_EVENT_TYPES[e.event_type];
    if (!info || info.treatment !== "deduction") return sum;
    return sum + (e.amount || 0);
  }, 0);
}

export default function TaxSummary() {
  const { formatCurrency: fmt } = useCurrency();
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const tr = t(lang, key); return tr !== key ? tr : fallback; }, [lang]);

  const { loans, incomes, transactions } = useFinancialData();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [taxProfile, setTaxProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    base44.entities.TaxProfile.list()
      .then(profiles => {
        if (profiles.length > 0) setTaxProfile(profiles[0]);
        setProfileLoaded(true);
      })
      .catch(() => setProfileLoaded(true));
  }, []);

  async function handleProfileChange(updated) {
    try {
      if (updated?.id) {
        const result = await base44.entities.TaxProfile.update(updated.id, {
          filing_status: updated.filing_status,
          dependents: updated.dependents,
          tax_events: updated.tax_events,
        });
        setTaxProfile(result);
      } else {
        const result = await base44.entities.TaxProfile.create({
          filing_status: updated?.filing_status || "single",
          dependents: updated?.dependents || 0,
          tax_events: updated?.tax_events || [],
        });
        setTaxProfile(result);
      }
    } catch (err) {
      console.error("Failed to save tax profile:", err);
    }
  }

  const filingStatus = taxProfile?.filing_status || "single";
  const dependents = taxProfile?.dependents || 0;
  const yearStr = String(year);
  const yearEvents = (taxProfile?.tax_events || []).filter(e => !e.date || String(e.date).startsWith(yearStr));

  // --- Income ---
  const yearIncomes = incomes.filter(i => i.week_start?.startsWith(yearStr));
  const yearIncomeTx = transactions.filter(tx => tx.amount > 0 && tx.date?.startsWith(yearStr));
  const totalIncome =
    yearIncomes.reduce((s, i) => s + (i.amount || 0), 0) +
    yearIncomeTx.reduce((s, tx) => s + tx.amount, 0);

  // --- Deductions ---
  const activeLoans = loans.filter(l => l.status !== "paid_off");
  const mortgageInterest = activeLoans
    .filter(l => l.category === "mortgage")
    .reduce((s, l) => s + ((l.current_balance || 0) * (l.interest_rate || 0) / 100), 0);
  const studentInterest = Math.min(
    activeLoans
      .filter(l => l.category === "student")
      .reduce((s, l) => s + ((l.current_balance || 0) * (l.interest_rate || 0) / 100), 0),
    STUDENT_LOAN_CAP
  );
  const medicalExpenses = transactions
    .filter(tx => tx.category === "health" && tx.amount < 0 && tx.date?.startsWith(yearStr))
    .reduce((s, tx) => s + Math.abs(tx.amount), 0);
  const medicalDeduction = Math.max(0, medicalExpenses - totalIncome * MEDICAL_AGI_THRESHOLD);
  const eventDeductions = getEventDeductions(yearEvents);

  const itemizedDeductions = mortgageInterest + studentInterest + medicalDeduction + eventDeductions;
  const standardDeduction = STANDARD_DEDUCTION[filingStatus];
  const usedDeduction = Math.max(standardDeduction, itemizedDeductions);
  const usingStandard = standardDeduction >= itemizedDeductions;

  // --- Tax calculation ---
  const taxableIncome = Math.max(0, totalIncome - usedDeduction);
  const brackets = BRACKETS[filingStatus];
  const marginalRate = getBracketRate(taxableIncome, brackets);
  const baseTax = calculateTax(taxableIncome, brackets);

  // --- Credits ---
  const childTaxCredit = calculateCTC(dependents, totalIncome, filingStatus);
  const eventCredits = getEventCredits(yearEvents);
  const totalCredits = childTaxCredit + eventCredits;
  const estimatedTax = Math.max(0, baseTax - totalCredits);
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

        {/* Tax Profile Editor */}
        {profileLoaded && (
          <TaxProfileEditor profile={taxProfile} onProfileChange={handleProfileChange} />
        )}

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
            {eventDeductions > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> {T("eventDeductions", "Event Deductions")}
                </span>
                <span className="text-foreground font-medium">{fmt(eventDeductions)}</span>
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
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{T("baseFederalTax", "Base Federal Tax")}</span>
              <span className="text-sm font-medium text-foreground">{fmt(baseTax)}</span>
            </div>
            {totalCredits > 0 && (
              <>
                <div className="flex items-center justify-between bg-primary/5 rounded-xl px-3 py-2">
                  <span className="text-xs font-medium text-primary">{T("taxCredits", "Tax Credits")}</span>
                  <span className="text-sm font-semibold text-primary">−{fmt(totalCredits)}</span>
                </div>
                {childTaxCredit > 0 && (
                  <div className="flex items-center justify-between text-xs pl-3">
                    <span className="text-muted-foreground">{T("childTaxCreditLabel", "Child Tax Credit")} ×{dependents}</span>
                    <span className="text-muted-foreground">{fmt(childTaxCredit)}</span>
                  </div>
                )}
                {eventCredits > 0 && (
                  <div className="flex items-center justify-between text-xs pl-3">
                    <span className="text-muted-foreground">{T("eventCredits", "Event Credits")}</span>
                    <span className="text-muted-foreground">{fmt(eventCredits)}</span>
                  </div>
                )}
              </>
            )}
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
            {T("taxEstimatorFullDisclaimer", "Uses simplified 2025 US federal tax brackets and standard deductions. Does not account for state taxes, capital gains, or all situations. Deduction/credit amounts are estimates. For educational purposes only — not tax advice. Consult a qualified tax professional.")}
          </p>
        </div>
      </motion.div>
    </div>
  );
}