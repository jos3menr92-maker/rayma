/**
 * financeMath.js — shared cross-entity financial math for Rayma AI.
 * Loans have loanEngine.js; this module covers bills and income so every
 * page computes "monthly", "per-period", and "real income" identically.
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
 * Real income entry = an actual paycheck event (manual log, confirmed scan, or
 * an auto-logged clone). Recurring TEMPLATES (is_recurring: true) are not
 * income events themselves — counting them double-counts against their clones.
 */
export function isRealIncome(entry) {
  return !!entry && !entry.is_recurring;
}

/** Sum of real income entries whose week_start falls in the given month (month is 0-based). */
export function incomeTotalForMonth(incomes, year, month) {
  return (incomes || []).reduce((sum, i) => {
    if (i.is_recurring) return sum;
    const d = parseDay(i.week_start);
    return d && d.getFullYear() === year && d.getMonth() === month ? sum + (Number(i.amount) || 0) : sum;
  }, 0);
}