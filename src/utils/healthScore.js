/**
 * healthScore.js — THE single brain for the Financial Health score (0-100).
 * Consumed by the Dashboard card AND the Monthly Recap breakdown, so the
 * card and its "why" page can never disagree (no split-brain drift).
 *
 * Pillars: Debt-to-Income (30), Budget Adherence (25), Savings Rate (25),
 * Bill Coverage (20).
 *
 * Income lenses (matches the app-wide actuals-vs-projection doctrine):
 *   - OBLIGATIONS-AWARE ACTUALS: Savings Rate = share of the income pace that
 *     survives bills/loans AND everyday spending logged so far this month.
 *   - PACE: projected full-month income (logged paychecks + recurring-template
 *     paychecks still scheduled this month). DTI and Bill Coverage compare
 *     FULL-month obligations against this pace — month-to-date income early in
 *     a month used to zero both pillars unfairly (same fix as the Bottleneck
 *     alert: projected when a template exists, logged snapshot otherwise).
 */
import { monthlyObligation } from "@/utils/loanEngine";
import { monthlyBillAmount, incomeTotalForMonth, monthSpentByCategory } from "@/utils/financeMath";

// Canonical periods-per-month — matches getComputedFinancials' projection
// math so the score's income pace and the agent's computed metrics agree.
const PERIODS_PER_MONTH = { monthly: 1, biweekly: 26 / 12, weekly: 52 / 12 };

// "True spending" view: savings transfers (money moved to yourself) and
// app-logged bill/loan payments are internal flows — the obligations are
// already scored by the DTI & Bill Coverage pillars, counting them here
// would double-penalize.
export const HEALTH_SPEND_OPTS = { excludeCategories: ["savings", "loan_payment"], excludeDescPrefixes: ["Paid Bill:", "Paid Loan:"] };

export function computeHealthScore(
  { loans = [], bills = [], incomes = [], savingsGoals = [], budgets = [], transactions = [], transactionSplits = [] } = {},
  now = new Date()
) {
  const activeLoans = loans.filter((l) => l.status !== "paid_off");
  const activeBills = bills.filter((b) => b.is_active !== false);
  const goals = savingsGoals.filter((g) => g.status !== "completed");

  const income = incomeTotalForMonth(incomes, now.getFullYear(), now.getMonth());
  // PACE: the canonical full-month projection — the SAME frequency-normalized
  // template math as getComputedFinancials' projection object (newest active
  // template amount × periods per month). The old "logged + remaining
  // occurrences this month" lens drifted from the backend early in a month
  // (e.g. $14,157 vs $14,538 for the same template), which made the score's
  // DTI disagree with the agent's quoted numbers. No active template →
  // conservative logged snapshot.
  const activeTemplates = (incomes || [])
    .filter((i) => i.is_recurring && i.recurring_active !== false && !i.recurring_source_id)
    .sort((a, b) => String(b.week_start || "").localeCompare(String(a.week_start || "")));
  const tpl = activeTemplates[0];
  const tplAmount = Number(tpl?.amount) || 0;
  const projected = tpl && tplAmount > 0
    ? tplAmount * (PERIODS_PER_MONTH[tpl.recurring_frequency || tpl.frequency || "weekly"] || 1)
    : null;
  const paceIncome = projected ?? income;

  const spentByCat = monthSpentByCategory({ transactions, transactionSplits }, now, HEALTH_SPEND_OPTS);
  const expenses = Object.values(spentByCat).reduce((s, v) => s + v, 0);
  const totalDebt = activeLoans.reduce((s, l) => s + (l.current_balance || 0), 0);
  const monthlyDebt = activeLoans.reduce((s, l) => s + monthlyObligation(l), 0);
  const monthlyBills = activeBills.reduce((s, b) => s + monthlyBillAmount(b), 0);
  const totalObligation = monthlyDebt + monthlyBills;

  // Debt-to-Income: full-month obligations vs the income PACE.
  let debtScore;
  if (paceIncome > 0) {
    const dti = totalObligation / paceIncome;
    debtScore = dti > 0.5 ? 0 : dti > 0.35 ? 10 : dti > 0.25 ? 20 : 30;
  } else {
    debtScore = totalDebt === 0 ? 30 : 5;
  }

  // Budget Adherence: per-budgeted-category respect for its own limit.
  // Unbudgeted spending doesn't drag the score; a budget with $0 spent
  // counts as fully on track. NO budgets set = nothing measured = 0 points —
  // a missing plan is not a perfect plan (this used to silently award 25/25).
  let budgetScore = 0;
  const limited = budgets.filter((b) => (b.monthly_limit || 0) > 0);
  const budgetSpent = limited.reduce((s, b) => s + (spentByCat[b.category_key] || 0), 0);
  const budgetLimits = limited.reduce((s, b) => s + b.monthly_limit, 0);
  if (limited.length > 0) {
    const adherence =
      limited.reduce((s, b) => s + Math.min((spentByCat[b.category_key] || 0) / b.monthly_limit, 1), 0) / limited.length;
    budgetScore = Math.round(adherence * 25);
  }

  // Savings Rate: honest advisor lens — the share of income that survives
  // obligations AND everyday spending. The old definition ignored bills/loans,
  // so a heavily indebted user with little everyday spending read a false
  // "100% kept" while their paychecks were consumed by obligations (the
  // same money the DTI & Bill Coverage pillars judge — no double-penalizing
  // since everyday spending already excludes those categories).
  let savingsScore = 0;
  const savingsRate = paceIncome > 0 ? (paceIncome - totalObligation - expenses) / paceIncome : 0;
  if (savingsRate >= 0.2) savingsScore = 25;
  else if (savingsRate >= 0.1) savingsScore = 18;
  else if (savingsRate >= 0.05) savingsScore = 10;
  else if (savingsRate > 0) savingsScore = 5;
  if (goals.length > 0) savingsScore = Math.min(savingsScore + 5, 25);
  // Untracked spending = unknown savings rate. With NOTHING logged this month
  // and no budgets, the rate above is fabricated — it treats all unspent
  // income as savings while food, transport and remittances are simply not
  // logged. Score it 0 and let the UI's "log your spending" nudges do their job.
  if (expenses === 0 && limited.length === 0) savingsScore = 0;

  // Bill Coverage: can the income pace absorb the full monthly obligations.
  let coverageScore = 20;
  if (paceIncome > 0 && totalObligation > paceIncome) coverageScore = 0;
  else if (paceIncome > 0 && totalObligation > paceIncome * 0.8) coverageScore = 8;

  return {
    total: debtScore + budgetScore + savingsScore + coverageScore,
    debtScore, budgetScore, savingsScore, coverageScore,
    income, paceIncome,
    isProjectedPace: projected != null && projected !== income,
    expenses, totalDebt, totalObligation, monthlyDebt, monthlyBills,
    savingsRate, budgetMeasured: limited.length > 0, budgetCount: limited.length, budgetSpent, budgetLimits,
  };
}