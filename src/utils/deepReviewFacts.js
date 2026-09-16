/**
 * deepReviewFacts.js — deterministic inputs for the Deep Financial Review.
 *
 * The agent NEVER does payoff/score math itself (row-level AI math caused
 * double-counting bugs before). Instead we compute the facts here with the
 * app's official engines — computeHealthScore (the same brain as the
 * Dashboard card and Monthly Recap) and compareStrategies (the Debt Payoff
 * Simulator's cascade engine) — and hand them to the agent as a
 * VERIFIED DATA BLOCK, so the premium report can never drift from the app
 * or hallucinate payoff numbers.
 */
import { computeHealthScore, HEALTH_SPEND_OPTS } from "@/utils/healthScore";
import { compareStrategies } from "@/utils/payoffStrategies";
import { monthSpentByCategory } from "@/utils/financeMath";
import { monthlyObligation } from "@/utils/loanEngine";

export const DEEP_REVIEW_COST = 6;

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Builds the compact verified-facts JSON handed to the agent.
 * Pure read-only computation — no network, no side effects.
 */
export function buildDeepReviewFacts(
  { loans = [], bills = [], incomes = [], savingsGoals = [], budgetCategories = [], transactions = [], transactionSplits = [], userProfile = null } = {},
  now = new Date()
) {
  const score = computeHealthScore(
    { loans, bills, incomes, savingsGoals, budgets: budgetCategories, transactions, transactionSplits },
    now
  );
  const activeLoans = loans.filter((l) => l.status !== "paid_off");
  const namesById = Object.fromEntries(activeLoans.map((l) => [l.id, l.name]));

  const loanFacts = activeLoans.map((l) => ({
    name: l.name,
    balance: r2(l.current_balance),
    apr_pct: Number.isFinite(Number(l.interest_rate)) ? Number(l.interest_rate) : null,
    min_monthly: r2(monthlyObligation(l)),
  }));

  // Balance-weighted average APR (loans without a real APR are excluded from both sides)
  let aprNum = 0, aprDen = 0;
  for (const l of activeLoans) {
    const bal = Number(l.current_balance) || 0;
    const apr = Number(l.interest_rate);
    if (bal > 0 && Number.isFinite(apr) && apr > 0) { aprNum += bal * apr; aprDen += bal; }
  }

  // Payoff cascade — the exact engine behind the Debt Payoff Simulator.
  // minimums horizon = 60 months so the "minimums never win" story is visible.
  const cascade = activeLoans.length > 0 ? compareStrategies(activeLoans, 0, 60) : null;
  const strat = (s) => ({
    debt_free_months: s.monthsToDebtFree,
    total_interest: r2(s.totalInterest),
    payoff_order: s.order.map((id) => namesById[id]).filter(Boolean),
  });

  const spentByCat = monthSpentByCategory({ transactions, transactionSplits }, now, HEALTH_SPEND_OPTS);
  const topCats = Object.entries(spentByCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k, v]) => ({ category: k, spent: r2(v) }));

  const facts = {
    as_of: now.toISOString().split("T")[0],
    currency: userProfile?.currency || "USD",
    health_score: {
      total: score.total,
      pillars: {
        debt_to_income: score.debtScore,
        budget: score.budgetScore,
        savings_rate: score.savingsScore,
        bill_coverage: score.coverageScore,
      },
      budgets_set: score.budgetMeasured,
    },
    income: { monthly_pace: r2(score.paceIncome), is_projected: score.isProjectedPace },
    obligations: {
      monthly_total: r2(score.totalObligation),
      monthly_debt: r2(score.monthlyDebt),
      monthly_bills: r2(score.monthlyBills),
      dti_pct: score.paceIncome > 0 ? Math.round((score.totalObligation / score.paceIncome) * 100) : null,
    },
    savings: { rate_after_obligations_pct: Math.round(score.savingsRate * 100) },
    debt: {
      total_balance: r2(score.totalDebt),
      weighted_avg_apr_pct: aprDen > 0 ? r2(aprNum / aprDen) : null,
      loans: loanFacts,
    },
    payoff: cascade ? {
      minimums_only_5yr: { still_owed: r2(cascade.minimums.endBalance), interest_paid: r2(cascade.minimums.totalInterest) },
      avalanche: strat(cascade.avalanche),
      snowball: strat(cascade.snowball),
      warnings: cascade.avalanche.warnings,
    } : "no active loans",
    spending_this_month: { total_everyday: r2(score.expenses), top_categories: topCats },
  };
  return JSON.stringify(facts);
}