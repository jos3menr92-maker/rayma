/**
 * healthScore.js — THE single brain for the Financial Health score (0-100).
 * Consumed by the Dashboard card AND the Monthly Recap breakdown, so the
 * card and its "why" page can never disagree (no split-brain drift).
 *
 * Pillars: Debt-to-Income (30), Budget Adherence (25), Savings Rate (25),
 * Bill Coverage (20).
 *
 * Income lenses (matches the app-wide actuals-vs-projection doctrine):
 *   - ACTUALS: income & everyday spending logged so far this month — the
 *     Savings Rate window (both sides partial → internally consistent).
 *   - PACE: projected full-month income (logged paychecks + recurring-template
 *     paychecks still scheduled this month). DTI and Bill Coverage compare
 *     FULL-month obligations against this pace — month-to-date income early in
 *     a month used to zero both pillars unfairly (same fix as the Bottleneck
 *     alert: projected when a template exists, logged snapshot otherwise).
 */
import { monthlyObligation } from "@/utils/loanEngine";
import { monthlyBillAmount, incomeTotalForMonth, projectedIncomeForMonth, monthSpentByCategory } from "@/utils/financeMath";

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
  const projected = projectedIncomeForMonth(incomes, now);
  const paceIncome = projected ?? income; // no active template → conservative logged snapshot

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
  // counts as fully on track.
  let budgetScore = 25;
  const limited = budgets.filter((b) => (b.monthly_limit || 0) > 0);
  const budgetSpent = limited.reduce((s, b) => s + (spentByCat[b.category_key] || 0), 0);
  const budgetLimits = limited.reduce((s, b) => s + b.monthly_limit, 0);
  if (limited.length > 0) {
    const adherence =
      limited.reduce((s, b) => s + Math.min((spentByCat[b.category_key] || 0) / b.monthly_limit, 1), 0) / limited.length;
    budgetScore = Math.round(adherence * 25);
  }

  // Savings Rate: actuals window — kept share of logged income after
  // everyday spending (official definition, matches getComputedFinancials).
  let savingsScore = 0;
  const savingsRate = income > 0 ? (income - expenses) / income : 0;
  if (savingsRate >= 0.2) savingsScore = 25;
  else if (savingsRate >= 0.1) savingsScore = 18;
  else if (savingsRate >= 0.05) savingsScore = 10;
  else if (savingsRate > 0) savingsScore = 5;
  if (goals.length > 0) savingsScore = Math.min(savingsScore + 5, 25);

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
    savingsRate, budgetCount: limited.length, budgetSpent, budgetLimits,
  };
}