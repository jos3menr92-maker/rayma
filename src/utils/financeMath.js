/**
 * financeMath.js — THE single brain for cross-entity financial math in Rayma AI.
 * Loans have loanEngine.js; this module owns bills and income. Every page,
 * chart, forecast, and backend job must import from here — never re-implement
 * income/bill math locally, that's how the "split brain" bugs happened.
 */

import { paymentPerPeriod } from "@/utils/loanEngine";

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

/* ─── 30-day cash-flow projection (the ONE forecast brain) ─────
 * Consumer: CashFlowForecast (Finance page). Anchors the projection to the
 * user's REAL bank balance, schedules paychecks on their actual cadence
 * (recurring templates first, per-frequency averages as fallback), anchors
 * weekly/biweekly obligations to their true payment cycle (most recent
 * payment > loan start date > today), skips cycles already paid early,
 * subtracts active savings-goal contributions, and layers an everyday-spending
 * rate derived from split-aware transaction history.
 */

const MS_DAY = 86400000;
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const dayKey = (d) => {
  const x = startOfDay(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

function stepMonthly(d) {
  const day = d.getDate();
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return new Date(next.getFullYear(), next.getMonth(), Math.min(day, daysInMonth(next.getFullYear(), next.getMonth())));
}

/** All occurrences of an every-N-days cycle inside [from, end], anchored to a real date. */
function anchoredOccurrences(anchor, stepDays, from, end) {
  const out = [];
  if (!anchor) return out;
  let t = startOfDay(anchor).getTime();
  const fromT = from.getTime();
  if (t < fromT) t += Math.ceil((fromT - t) / (stepDays * MS_DAY)) * stepDays * MS_DAY;
  while (t <= end.getTime() && out.length < 13) {
    out.push(new Date(t));
    t += stepDays * MS_DAY;
  }
  return out;
}

/** All occurrences of a monthly cycle inside [from, end], anchored to a real date. */
function monthlyOccurrences(anchor, from, end) {
  const out = [];
  if (!anchor) return out;
  let d = startOfDay(anchor);
  let guard = 0;
  while (d < from && guard++ < 1200) d = stepMonthly(d);
  while (d <= end && out.length < 3) {
    out.push(new Date(d));
    d = stepMonthly(d);
  }
  return out;
}

/**
 * Average everyday spending per day over the last `windowDays`, split-aware
 * (same rules as monthSpentByCategory). Excludes income, savings transfers,
 * loan payments, and the transactions the app auto-logs for bill/loan
 * payments ("Paid Bill:", "Paid Loan:") — those are already projected as
 * scheduled obligations, so counting them here would double-charge them.
 */
export function dailySpendRate({ transactions = [], transactionSplits = [] } = {}, now = new Date(), windowDays = 30) {
  const today = startOfDay(now);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - (windowDays - 1));
  const inWindow = (v) => { const d = parseDay(v); return !!d && d >= cutoff && d <= today; };

  const isInternal = (tx) => {
    const cat = tx.category || "";
    return cat === "income" || cat === "loan_payment" || cat === "savings" || /^(Paid Bill:|Paid Loan:)/i.test(String(tx.description || ""));
  };

  const windowTxs = (transactions || []).filter((tx) => inWindow(tx.date));
  const internalTxIds = new Set(windowTxs.filter(isInternal).map((tx) => tx.id));
  const windowSplits = (transactionSplits || []).filter((s) => inWindow(s.date));
  const splitParentIds = new Set(windowSplits.map((s) => s.transaction_id).filter(Boolean));

  let total = 0;
  windowSplits.forEach((s) => {
    if (s.transaction_id && internalTxIds.has(s.transaction_id)) return;
    if (["income", "loan_payment", "savings"].includes(s.category || "")) return;
    total += Math.abs(Number(s.amount) || 0);
  });
  windowTxs.forEach((tx) => {
    if (internalTxIds.has(tx.id)) return;
    if (splitParentIds.has(tx.id)) return; // counted via its splits
    if ((Number(tx.amount) || 0) >= 0) return; // only spending
    total += Math.abs(Number(tx.amount));
  });
  return total / windowDays;
}

/**
 * Day-by-day cash projection. Returns:
 * { startBalance, dailySpend, days[], finalBalance, lowestBalance, lowestDate,
 *   hasIncomeData, estimatedIncome }
 */
export function projectCashFlow(
  { loans = [], bills = [], incomes = [], payments = [], transactions = [], transactionSplits = [], savingsGoals = [], bankAccounts = [] } = {},
  startDate = new Date(),
  horizonDays = 30
) {
  const from = startOfDay(startDate);
  const end = new Date(from);
  end.setDate(end.getDate() + horizonDays - 1);

  // 1) Real money: today's bank balance is the starting line.
  const startBalance = (bankAccounts || [])
    .filter((a) => a.is_active !== false)
    .reduce((s, a) => s + (Number(a.balance) || 0), 0);

  // 2) Paychecks: recurring templates on their real cadence; otherwise
  //    per-frequency averages of recent real paychecks (flagged as estimates).
  const streams = [];
  for (const tpl of (incomes || []).filter((i) => i.is_recurring && i.recurring_active !== false && !i.recurring_source_id)) {
    streams.push({
      amount: Number(tpl.amount) || 0,
      freq: tpl.recurring_frequency || tpl.frequency || "weekly",
      anchor: parseDay(tpl.week_start) || from,
      name: tpl.note || tpl.source || null,
    });
  }
  let estimatedIncome = false;
  if (streams.length === 0 && (incomes || []).length > 0) {
    estimatedIncome = true;
    const recent = realIncomeEntries(incomes)
      .map((i) => ({ ...i, d: parseDay(i.week_start) }))
      .filter((i) => i.d)
      .sort((a, b) => b.d - a.d)
      .slice(0, 12);
    const groups = {};
    for (const r of recent) {
      const f = r.recurring_frequency || r.frequency || "weekly";
      groups[f] ||= { sum: 0, n: 0, latest: null };
      groups[f].sum += Number(r.amount) || 0;
      groups[f].n += 1;
      if (!groups[f].latest || r.d > groups[f].latest) groups[f].latest = r.d;
    }
    for (const [f, g] of Object.entries(groups)) {
      streams.push({ amount: g.sum / g.n, freq: f, anchor: g.latest, name: null });
    }
  }

  // 3) True cycle anchors: most recent payment per entity.
  const lastPayment = {};
  for (const p of payments || []) {
    const d = parseDay(p.payment_date);
    if (!d) continue;
    const key = p.payment_type === "bill" ? `bill|${p.bill_id}` : `loan|${p.loan_id}`;
    if (!lastPayment[key] || d > lastPayment[key]) lastPayment[key] = d;
  }
  // Paid up to 7 days early (or on due day) → this monthly cycle is already covered.
  const cycleCovered = (key, date) => {
    const last = lastPayment[key];
    if (!last) return false;
    const cutoff = new Date(date);
    cutoff.setDate(cutoff.getDate() - 7);
    return last >= cutoff && last <= date;
  };

  const eventsByDay = {};
  const addEvent = (date, ev) => {
    if (!date || date < from || date > end) return;
    (eventsByDay[dayKey(date)] ||= []).push(ev);
  };

  const occurrences = (freq, anchor) =>
    freq === "monthly" ? monthlyOccurrences(anchor, from, end)
      : anchoredOccurrences(anchor, freq === "biweekly" ? 14 : 7, from, end);

  const dueDayDates = (dueDay) => {
    const dates = [];
    let m = new Date(from.getFullYear(), from.getMonth(), 1);
    for (let i = 0; i < 2; i++) {
      dates.push(new Date(m.getFullYear(), m.getMonth(), Math.min(dueDay, daysInMonth(m.getFullYear(), m.getMonth()))));
      m.setMonth(m.getMonth() + 1);
    }
    return dates;
  };
  const weekdayDates = (dayOfWeek) => {
    const dates = [];
    for (let d = new Date(from); d <= end; d.setDate(d.getDate() + 1)) {
      if (WEEKDAY_NAMES[d.getDay()] === dayOfWeek) dates.push(new Date(d));
    }
    return dates;
  };

  // 4) Loans — per-period amounts from the loan engine, on their real cycle.
  for (const loan of (loans || []).filter((l) => l.status !== "paid_off")) {
    const pmt = paymentPerPeriod(loan);
    const freq = loan.payment_frequency || "monthly";
    const key = `loan|${loan.id}`;
    let dates;
    if (freq === "monthly" && loan.due_day) dates = dueDayDates(loan.due_day);
    else if (freq === "weekly" && loan.due_day_of_week) dates = weekdayDates(loan.due_day_of_week);
    else dates = occurrences(freq, lastPayment[key] || parseDay(loan.start_date) || from);
    dates.forEach((date) => {
      if (freq === "monthly" && loan.due_day && cycleCovered(key, date)) return;
      addEvent(date, { name: loan.name, amount: -pmt });
    });
  }

  // 5) Bills — same cycle logic (bills have no start date; unpaid ones anchor to today).
  for (const bill of (bills || []).filter((b) => b.is_active !== false)) {
    const amt = Number(bill.amount) || 0;
    const freq = bill.payment_frequency || "monthly";
    const key = `bill|${bill.id}`;
    let dates;
    if (freq === "monthly" && bill.due_day) dates = dueDayDates(bill.due_day);
    else if (freq === "weekly" && bill.due_day_of_week) dates = weekdayDates(bill.due_day_of_week);
    else dates = occurrences(freq, lastPayment[key] || from);
    dates.forEach((date) => {
      if (freq === "monthly" && bill.due_day && cycleCovered(key, date)) return;
      addEvent(date, { name: bill.name, amount: -amt });
    });
  }

  // 6) Paychecks on their scheduled days — strictly future ones only,
  //    so today's paycheck (already in the bank balance) isn't counted twice.
  for (const s of streams) {
    occurrences(s.freq, s.anchor)
      .filter((date) => date > from)
      .forEach((date) => addEvent(date, { name: s.name, amount: Number(s.amount) || 0, income: true }));
  }

  // 7) Committed savings-goal contributions (weekly, starting next week).
  for (const g of (savingsGoals || []).filter((g) => g.status !== "completed" && Number(g.weekly_contribution) > 0)) {
    anchoredOccurrences(new Date(from.getTime() + 7 * MS_DAY), 7, from, end)
      .forEach((date) => addEvent(date, { name: g.name, amount: -(Number(g.weekly_contribution) || 0) }));
  }

  // 8) Walk the horizon: balance = bank balance + paychecks − obligations − savings − everyday spend.
  const dailySpend = dailySpendRate({ transactions, transactionSplits }, from);
  let balance = startBalance;
  const days = [];
  for (let i = 0; i < horizonDays; i++) {
    const date = new Date(from);
    date.setDate(from.getDate() + i);
    const events = eventsByDay[dayKey(date)] || [];
    const income = events.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
    const outflow = events.filter((e) => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);
    balance += income - outflow - dailySpend;
    days.push({ date, balance, income, outflow, variableSpend: dailySpend, events });
  }

  const finalBalance = days.length ? days[days.length - 1].balance : startBalance;
  let lowest = days[0];
  for (const d of days) if (d.balance < lowest.balance) lowest = d;

  return {
    startBalance,
    dailySpend,
    days,
    finalBalance,
    lowestBalance: lowest ? lowest.balance : startBalance,
    lowestDate: lowest ? lowest.date : null,
    hasIncomeData: streams.length > 0 || (incomes || []).length > 0,
    estimatedIncome,
  };
}