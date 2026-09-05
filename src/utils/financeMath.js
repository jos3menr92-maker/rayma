/**
 * financeMath.js — THE single brain for cross-entity financial math in Rayma AI.
 * Loans have loanEngine.js; this module owns bills and income. Every page,
 * chart, forecast, and backend job must import from here — never re-implement
 * income/bill math locally, that's how the "split brain" bugs happened.
 */

const PERIODS_PER_MONTH = { monthly: 1, biweekly: 26 / 12, weekly: 52 / 12 };

/** Monthly-equivalent of a bill's per-period amount (honors payment_frequency). */
export function monthlyBillAmount(bill) {
  const amt = Number(bill?.amount) || 0;
  return amt * (PERIODS_PER_MONTH[bill?.payment_frequency] ?? 1);
}

const parseDay = (s) => {
  if (!s) return null;
  const d = new Date(String(s).slice(0, 10) + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Real income entries — the ONE definition of "a paycheck actually happened":
 *   - manual logs, confirmed scans, and auto-logged clones always count;
 *   - a recurring TEMPLATE also counts for its own week — it was a real
 *     paycheck when the user logged it with auto-log turned on;
 *   - legacy safety: if an auto-logged clone already covers the template's
 *     same week (from the old cron behavior), count only the clone, not both.
 *
 * Maintained together with the autoLogRecurringIncome cron, which never clones
 * the template's own week — so every paycheck is counted exactly once.
 */
export function realIncomeEntries(incomes) {
  const list = incomes || [];
  const cloneWeeks = new Set();
  for (const i of list) {
    if (i.recurring_source_id) {
      cloneWeeks.add(`${i.recurring_source_id}|${String(i.week_start || "").slice(0, 10)}`);
    }
  }
  return list.filter(i => {
    if (!i.is_recurring) return true;
    return !cloneWeeks.has(`${i.id}|${String(i.week_start || "").slice(0, 10)}`);
  });
}

/** Sum of real income entries whose week_start falls in the given month (month is 0-based). */
export function incomeTotalForMonth(incomes, year, month) {
  return realIncomeEntries(incomes).reduce((sum, i) => {
    const d = parseDay(i.week_start);
    return d && d.getFullYear() === year && d.getMonth() === month ? sum + (Number(i.amount) || 0) : sum;
  }, 0);
}

/**
 * Net worth — the ONE definition (matches takeNetWorthSnapshot):
 * assets + bank balances − active loan balances.
 */
export function netWorthFrom({ assets = [], bankAccounts = [], loans = [] } = {}) {
  const assetSum = (assets || []).reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const bankSum = (bankAccounts || []).reduce((s, a) => s + (Number(a.balance) || 0), 0);
  const debtSum = (loans || []).filter((l) => l.status !== "paid_off").reduce((s, l) => s + (Number(l.current_balance) || 0), 0);
  return { totalAssets: assetSum + bankSum, totalDebt: debtSum, netWorth: assetSum + bankSum - debtSum };
}

/**
 * Split-aware spending by category for a month — the ONE spending brain
 * (Budget Dashboard, Pacing widget, Health Score all use this).
 * Splits are the source of truth; a parent tx counts only if it has no splits.
 * Only negative parent amounts count as spending; the "income" category is excluded.
 */
export function monthSpentByCategory({ transactions = [], transactionSplits = [] } = {}, date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const inMonth = (v) => {
    const d = parseDay(v);
    return !!d && d.getFullYear() === y && d.getMonth() === m;
  };

  const monthSplits = (transactionSplits || []).filter((s) => inMonth(s.date));
  const monthTxs = (transactions || []).filter((tx) => inMonth(tx.date));
  const txIdsWithSplits = new Set(monthSplits.map((s) => s.transaction_id).filter(Boolean));

  const totals = {};
  const bump = (cat, amt) => {
    if (!cat || cat === "income") return;
    totals[cat] = (totals[cat] || 0) + Math.abs(Number(amt) || 0);
  };

  monthSplits.forEach((s) => bump(s.category, s.amount));
  monthTxs
    .filter((tx) => !txIdsWithSplits.has(tx.id) && Number(tx.amount) < 0)
    .forEach((tx) => bump(tx.category, tx.amount));
  return totals;
}

/** Total split-aware spending for a month across all categories. */
export function monthTotalSpent(sources, date = new Date()) {
  const totals = monthSpentByCategory(sources, date);
  return Object.values(totals).reduce((s, v) => s + v, 0);
}