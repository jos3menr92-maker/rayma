/**
 * trendMath.js — pure math + config for the Income vs. Spending trend page.
 * All series are computed locally (zero AI coins) from already-loaded data.
 */
import { getMonthName } from "@/utils/formatLocalized";

export const SERIES = [
  { key: "income", color: "hsl(var(--primary))", labelKey: "income", fallback: "Income" },
  { key: "spending", color: "hsl(var(--destructive))", labelKey: "spending", fallback: "Spending" },
  { key: "netFlow", color: "hsl(var(--chart-4))", labelKey: "netFlow", fallback: "Net Flow" },
  { key: "billsPaid", color: "hsl(var(--chart-3))", labelKey: "billsPaidSeries", fallback: "Bills Paid" },
  { key: "debtPaid", color: "hsl(var(--chart-2))", labelKey: "debtPaidSeries", fallback: "Debt Paid" },
];

export const RANGES = [
  { key: "3m", months: 3, labelKey: "range_3m", fallback: "3M" },
  { key: "6m", months: 6, labelKey: "range_6m", fallback: "6M" },
  { key: "1y", months: 12, labelKey: "range_1y", fallback: "1Y" },
];

export function isValidSeriesKey(key) {
  return SERIES.some((s) => s.key === key);
}

function monthKey(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key, locale) {
  const [y, m] = key.split("-");
  return `${getMonthName(parseInt(m, 10) - 1, locale, "short")} ${y.slice(2)}`;
}

/**
 * Builds one row per month for the last `months` months.
 * Spending = bank transactions (splits override the parent amount, like the
 * rest of the app); billsPaid/debtPaid come from the payments table.
 */
export function buildMonthlySeries({ incomes = [], transactions = [], transactionSplits = [], payments = [] }, months = 12, locale = "en") {
  const splitByTx = transactionSplits.reduce((acc, sp) => {
    if (!sp.transaction_id) return acc;
    acc[sp.transaction_id] = (acc[sp.transaction_id] || 0) + Math.abs(sp.amount || 0);
    return acc;
  }, {});

  const buckets = {};
  const get = (key) => {
    if (!buckets[key]) buckets[key] = { income: 0, spending: 0, billsPaid: 0, debtPaid: 0 };
    return buckets[key];
  };

  incomes.forEach((inc) => {
    if (!inc.week_start) return;
    get(monthKey(inc.week_start)).income += inc.amount || 0;
  });

  transactions.forEach((tx) => {
    if (!tx.date) return;
    const split = splitByTx[tx.id] || 0;
    const spent = split > 0 ? split : tx.amount < 0 ? Math.abs(tx.amount) : 0;
    if (spent > 0) get(monthKey(tx.date)).spending += spent;
  });

  payments.forEach((p) => {
    if (!p.payment_date) return;
    const b = get(monthKey(p.payment_date));
    if (p.payment_type === "bill") b.billsPaid += p.amount || 0;
    else b.debtPaid += p.amount || 0;
  });

  const now = new Date();
  const data = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const b = buckets[key] || { income: 0, spending: 0, billsPaid: 0, debtPaid: 0 };
    data.push({ monthKey: key, month: monthLabel(key, locale), ...b, netFlow: b.income - b.spending });
  }
  return data;
}