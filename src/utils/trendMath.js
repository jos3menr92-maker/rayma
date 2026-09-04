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
  { key: "month", months: 1, labelKey: "range_month", fallback: "Month" },
  { key: "3m", months: 3, labelKey: "range_3m", fallback: "3M" },
  { key: "6m", months: 6, labelKey: "range_6m", fallback: "6M" },
  { key: "1y", months: 12, labelKey: "range_1y", fallback: "1Y" },
];

export function isValidSeriesKey(key) {
  return SERIES.some((s) => s.key === key);
}

// Robust date parsing — handles "2026-09-04" and "2026-09-04T12:00:00" alike.
// Previously a full timestamp produced an invalid date and the record was
// silently dropped from its bucket (NaN month key).
function parseDay(dateStr) {
  if (!dateStr) return null;
  const d = new Date(String(dateStr).slice(0, 10) + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function monthLabel(key, locale) {
  const [y, m] = key.split("-");
  return `${getMonthName(parseInt(m, 10) - 1, locale, "short")} ${y.slice(2)}`;
}

function buildSplitMap(transactionSplits = []) {
  const map = {};
  transactionSplits.forEach((sp) => {
    if (!sp.transaction_id) return;
    map[sp.transaction_id] = (map[sp.transaction_id] || 0) + Math.abs(sp.amount || 0);
  });
  return map;
}

function spentFromTx(tx, splitMap) {
  const split = splitMap[tx.id] || 0;
  return split > 0 ? split : tx.amount < 0 ? Math.abs(tx.amount) : 0;
}

/**
 * Aggregates sources into buckets keyed by keyOf(date); keyOf returns null
 * to skip a record (e.g. outside the current month for the daily view).
 * Spending = bank transactions (splits override the parent amount);
 * billsPaid/debtPaid come from the payments table.
 */
function aggregateSources({ incomes = [], transactions = [], transactionSplits = [], payments = [] }, keyOf) {
  const splitMap = buildSplitMap(transactionSplits);
  const buckets = {};
  const get = (key) => {
    if (!buckets[key]) buckets[key] = { income: 0, spending: 0, billsPaid: 0, debtPaid: 0 };
    return buckets[key];
  };

  incomes.forEach((inc) => {
    const d = parseDay(inc.week_start);
    const k = d && keyOf(d);
    if (k) get(k).income += inc.amount || 0;
  });

  transactions.forEach((tx) => {
    const d = parseDay(tx.date);
    const k = d && keyOf(d);
    if (!k) return;
    const spent = spentFromTx(tx, splitMap);
    if (spent > 0) get(k).spending += spent;
  });

  payments.forEach((p) => {
    const d = parseDay(p.payment_date);
    const k = d && keyOf(d);
    if (!k) return;
    const b = get(k);
    if (p.payment_type === "bill") b.billsPaid += p.amount || 0;
    else b.debtPaid += p.amount || 0;
  });

  return buckets;
}

/** One row per month for the last `months` months (current month included). */
export function buildMonthlySeries(sources, months = 12, locale = "en") {
  const buckets = aggregateSources(sources, (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
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

/**
 * Current-month view: one row per day so far this month, cumulative-to-date.
 * Restarts naturally every month (a fresh chart from the 1st).
 */
export function buildCurrentMonthSeries(sources, locale = "en") {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthName = getMonthName(now.getMonth(), locale, "short");
  const buckets = aggregateSources(sources, (d) =>
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() ? String(d.getDate()) : null
  );

  const data = [];
  let income = 0, spending = 0, billsPaid = 0, debtPaid = 0;
  for (let day = 1; day <= now.getDate(); day++) {
    const b = buckets[String(day)] || { income: 0, spending: 0, billsPaid: 0, debtPaid: 0 };
    income += b.income; spending += b.spending; billsPaid += b.billsPaid; debtPaid += b.debtPaid;
    data.push({
      monthKey: `${prefix}-${day}`,
      month: String(day),
      fullLabel: `${monthName} ${day}`,
      income, spending, billsPaid, debtPaid,
      netFlow: income - spending,
    });
  }
  return data;
}