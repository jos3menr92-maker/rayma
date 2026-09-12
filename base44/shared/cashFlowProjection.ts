import { realIncomeEntries } from './incomeMath.ts';

/**
 * cashFlowProjection.ts — THE portable mirror of the app's ONE forecast brain:
 * src/utils/financeMath.js (dailySpendRate + projectCashFlow) plus
 * loanEngine.js (paymentPerPeriod). Backend jobs (deficitAlerts) compute the
 * EXACT same 30-day projection the Finance page's forecast card shows —
 * never a variant. Keep in lockstep with the frontend files when rules change:
 *   - newest-active-template paycheck streams (double-count guard),
 *   - obligation cycles anchored to real due days / payment history,
 *   - paid-cycle skipping, savings-goal contributions,
 *   - everyday-spend rate excluding internal flows.
 */

const MS_DAY = 86400000;
const FREQ_PERIODS_PER_YEAR: Record<string, number> = { weekly: 52, biweekly: 26, monthly: 12 };
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const num = (v: any): number => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
const parseDay = (s: any): Date | null => {
  if (!s) return null;
  const d = new Date(String(s).slice(0, 10) + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
};
const startOfDay = (d: Date): Date => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const dayKey = (d: Date): string => {
  const x = startOfDay(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
const daysInMonth = (y: number, m: number): number => new Date(y, m + 1, 0).getDate();

function stepMonthly(d: Date): Date {
  const day = d.getDate();
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return new Date(next.getFullYear(), next.getMonth(), Math.min(day, daysInMonth(next.getFullYear(), next.getMonth())));
}

/** All occurrences of an every-N-days cycle inside [from, end], anchored to a real date. */
function anchoredOccurrences(anchor: Date | null, stepDays: number, from: Date, end: Date): Date[] {
  const out: Date[] = [];
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
function monthlyOccurrences(anchor: Date | null, from: Date, end: Date): Date[] {
  const out: Date[] = [];
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

/** Mirror of loanEngine.paymentPerPeriod — stored amount → per-period payment. */
export function paymentPerPeriod(loan: any): number {
  const pmt = num(loan?.monthly_payment);
  const freq = loan?.payment_frequency || 'monthly';
  const type = loan?.payment_amount_type || 'per_period';
  if (type === 'monthly_equivalent' && freq !== 'monthly') {
    return pmt * (12 / (FREQ_PERIODS_PER_YEAR[freq] || 12));
  }
  return pmt;
}

/** Average everyday spending per day over the last `windowDays`, split-aware —
 * excludes income, savings transfers, loan payments, and the app-logged
 * "Paid Bill:/Paid Loan:" placeholders (already projected as obligations). */
export function dailySpendRate(
  { transactions = [], transactionSplits = [] }: { transactions?: any[]; transactionSplits?: any[] } = {},
  now: Date = new Date(),
  windowDays = 30,
): number {
  const today = startOfDay(now);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - (windowDays - 1));
  const inWindow = (v: any) => { const d = parseDay(v); return !!d && d >= cutoff && d <= today; };

  const isInternal = (tx: any) => {
    const cat = tx.category || '';
    return cat === 'income' || cat === 'loan_payment' || cat === 'savings' || /^(Paid Bill:|Paid Loan:)/i.test(String(tx.description || ''));
  };

  const windowTxs = (transactions || []).filter((tx: any) => inWindow(tx.date));
  const internalTxIds = new Set(windowTxs.filter(isInternal).map((tx: any) => tx.id));
  const windowSplits = (transactionSplits || []).filter((s: any) => inWindow(s.date));
  const splitParentIds = new Set(windowSplits.map((s: any) => s.transaction_id).filter(Boolean));

  let total = 0;
  windowSplits.forEach((s: any) => {
    if (s.transaction_id && internalTxIds.has(s.transaction_id)) return;
    if (['income', 'loan_payment', 'savings'].includes(s.category || '')) return;
    total += Math.abs(num(s.amount));
  });
  windowTxs.forEach((tx: any) => {
    if (internalTxIds.has(tx.id)) return;
    if (splitParentIds.has(tx.id)) return; // counted via its splits
    if (num(tx.amount) >= 0) return; // only spending
    total += Math.abs(tx.amount);
  });
  return total / windowDays;
}

/** Day-by-day cash projection — mirrors financeMath.projectCashFlow.
 * Returns { startBalance, dailySpend, days[], finalBalance, lowestBalance,
 *           lowestDate, hasIncomeData, estimatedIncome } */
export function projectCashFlow(
  {
    loans = [],
    bills = [],
    incomes = [],
    payments = [],
    transactions = [],
    transactionSplits = [],
    savingsGoals = [],
    bankAccounts = [],
  }: Record<string, any[]> = {},
  startDate: Date = new Date(),
  horizonDays = 30,
) {
  const from = startOfDay(startDate);
  const end = new Date(from);
  end.setDate(end.getDate() + horizonDays - 1);

  // 1) Real money: today's bank balance is the starting line.
  const startBalance = (bankAccounts || [])
    .filter((a: any) => a.is_active !== false)
    .reduce((s: number, a: any) => s + num(a.balance), 0);

  // 2) Paychecks: recurring templates on their real cadence; otherwise
  //    per-frequency averages of recent real paychecks (flagged as estimates).
  // Only the NEWEST active template drives projected paychecks — matches the
  // auto-log cron (older templates are never streamed → no double counting).
  const templates = (incomes || [])
    .filter((i: any) => i.is_recurring && i.recurring_active !== false && !i.recurring_source_id)
    .sort((a: any, b: any) => String(b.week_start || '').localeCompare(String(a.week_start || '')));
  const streams: any[] = [];
  for (const tpl of templates.slice(0, 1)) {
    streams.push({
      amount: num(tpl.amount),
      freq: tpl.recurring_frequency || tpl.frequency || 'weekly',
      anchor: parseDay(tpl.week_start) || from,
      name: tpl.note || tpl.source || null,
    });
  }
  let estimatedIncome = false;
  if (streams.length === 0 && (incomes || []).length > 0) {
    estimatedIncome = true;
    const recent = realIncomeEntries(incomes)
      .map((i: any) => ({ ...i, d: parseDay(i.week_start) }))
      .filter((i: any) => i.d)
      .sort((a: any, b: any) => b.d - a.d)
      .slice(0, 12);
    const groups: Record<string, any> = {};
    for (const r of recent) {
      const f = r.recurring_frequency || r.frequency || 'weekly';
      groups[f] ||= { sum: 0, n: 0, latest: null };
      groups[f].sum += num(r.amount);
      groups[f].n += 1;
      if (!groups[f].latest || r.d > groups[f].latest) groups[f].latest = r.d;
    }
    for (const [f, g] of Object.entries(groups)) {
      streams.push({ amount: g.sum / g.n, freq: f, anchor: g.latest, name: null });
    }
  }

  // 3) True cycle anchors: most recent payment per entity.
  const lastPayment: Record<string, Date> = {};
  for (const p of payments || []) {
    const d = parseDay(p.payment_date);
    if (!d) continue;
    const key = p.payment_type === 'bill' ? `bill|${p.bill_id}` : `loan|${p.loan_id}`;
    if (!lastPayment[key] || d > lastPayment[key]) lastPayment[key] = d;
  }
  // Paid up to 7 days early (or on due day) → this monthly cycle is already covered.
  const cycleCovered = (key: string, date: Date) => {
    const last = lastPayment[key];
    if (!last) return false;
    const cutoff = new Date(date);
    cutoff.setDate(cutoff.getDate() - 7);
    return last >= cutoff && last <= date;
  };
  // Weekly/biweekly cycles: a payment strictly after the PREVIOUS occurrence
  // means this cycle is already paid.
  const periodCovered = (key: string, date: Date, periodDays: number) => {
    const last = lastPayment[key];
    if (!last) return false;
    const prev = new Date(date);
    prev.setDate(prev.getDate() - periodDays);
    return last > prev && last <= date;
  };

  const eventsByDay: Record<string, any[]> = {};
  const addEvent = (date: Date, ev: any) => {
    if (!date || date < from || date > end) return;
    (eventsByDay[dayKey(date)] ||= []).push(ev);
  };

  const occurrences = (freq: string, anchor: Date | null) =>
    freq === 'monthly' ? monthlyOccurrences(anchor, from, end)
      : anchoredOccurrences(anchor, freq === 'biweekly' ? 14 : 7, from, end);

  const dueDayDates = (dueDay: number) => {
    const dates: Date[] = [];
    let m = new Date(from.getFullYear(), from.getMonth(), 1);
    for (let i = 0; i < 2; i++) {
      dates.push(new Date(m.getFullYear(), m.getMonth(), Math.min(dueDay, daysInMonth(m.getFullYear(), m.getMonth()))));
      m.setMonth(m.getMonth() + 1);
    }
    return dates;
  };
  const weekdayDates = (dayOfWeek: string) => {
    const dates: Date[] = [];
    for (let d = new Date(from); d <= end; d.setDate(d.getDate() + 1)) {
      if (WEEKDAY_NAMES[d.getDay()] === dayOfWeek) dates.push(new Date(d));
    }
    return dates;
  };

  // 4) Loans — per-period amounts from the loan engine, on their real cycle.
  for (const loan of (loans || []).filter((l: any) => l.status !== 'paid_off')) {
    const pmt = paymentPerPeriod(loan);
    const freq = loan.payment_frequency || 'monthly';
    const key = `loan|${loan.id}`;
    let dates: Date[];
    if (freq === 'monthly' && loan.due_day) dates = dueDayDates(num(loan.due_day));
    else if (freq === 'weekly' && loan.due_day_of_week) dates = weekdayDates(loan.due_day_of_week);
    else dates = occurrences(freq, lastPayment[key] || parseDay(loan.start_date) || from);
    dates.forEach((date: Date) => {
      if (freq === 'monthly' && loan.due_day && cycleCovered(key, date)) return;
      if (freq !== 'monthly' && periodCovered(key, date, freq === 'biweekly' ? 14 : 7)) return;
      addEvent(date, { name: loan.name, amount: -pmt });
    });
  }

  // 5) Bills — same cycle logic (bills have no start date; unpaid ones anchor to today).
  for (const bill of (bills || []).filter((b: any) => b.is_active !== false)) {
    const amt = num(bill.amount);
    const freq = bill.payment_frequency || 'monthly';
    const key = `bill|${bill.id}`;
    let dates: Date[];
    if (freq === 'monthly' && bill.due_day) dates = dueDayDates(num(bill.due_day));
    else if (freq === 'weekly' && bill.due_day_of_week) dates = weekdayDates(bill.due_day_of_week);
    else dates = occurrences(freq, lastPayment[key] || from);
    dates.forEach((date: Date) => {
      if (freq === 'monthly' && bill.due_day && cycleCovered(key, date)) return;
      if (freq !== 'monthly' && periodCovered(key, date, freq === 'biweekly' ? 14 : 7)) return;
      addEvent(date, { name: bill.name, amount: -amt });
    });
  }

  // 6) Paychecks on their scheduled days — strictly future ones only.
  for (const s of streams) {
    occurrences(s.freq, s.anchor)
      .filter((date: Date) => date > from)
      .forEach((date: Date) => addEvent(date, { name: s.name, amount: num(s.amount), income: true }));
  }

  // 7) Committed savings-goal contributions (weekly, starting next week).
  for (const g of (savingsGoals || []).filter((g: any) => g.status !== 'completed' && num(g.weekly_contribution) > 0)) {
    anchoredOccurrences(new Date(from.getTime() + 7 * MS_DAY), 7, from, end)
      .forEach((date: Date) => addEvent(date, { name: g.name, amount: -num(g.weekly_contribution) }));
  }

  // 8) Walk the horizon: balance = bank balance + paychecks − obligations − savings − everyday spend.
  const dailySpend = dailySpendRate({ transactions, transactionSplits }, from);
  let balance = startBalance;
  const days: any[] = [];
  for (let i = 0; i < horizonDays; i++) {
    const date = new Date(from);
    date.setDate(from.getDate() + i);
    const events = eventsByDay[dayKey(date)] || [];
    const income = events.filter((e: any) => e.amount > 0).reduce((s: number, e: any) => s + e.amount, 0);
    const outflow = events.filter((e: any) => e.amount < 0).reduce((s: number, e: any) => s + Math.abs(e.amount), 0);
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