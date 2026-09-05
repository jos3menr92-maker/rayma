/**
 * Pure raw-math preview helpers for financial log forms.
 * No React, no API, no AI — just arithmetic so the form can show a
 * live "smart-keyboard" preview the user can tap to paste into fields.
 *
 * Each function returns { lines: [{label, value, tone}], chips: [{label, field, value}] }
 * where `tone` is 'primary' | 'destructive' | 'muted'.
 * `chips[].value` is the string to paste into `field` when accepted.
 *
 * Helpers { fmt, T, locale } are passed in so labels stay localized.
 */

const FREQ_MULTIPLIER = { weekly: 52, biweekly: 26, monthly: 12 };

function num(v) {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function nextDueDate(freq, base = new Date()) {
  if (freq === "weekly") return addDays(base, 7);
  if (freq === "biweekly") return addDays(base, 14);
  return addMonths(base, 1);
}

// ---------- LOANS ----------
export function computeLoanPreview(form, { fmt, T, locale = "en-US" }) {
  const lines = [];
  const chips = [];
  const balance = num(form.current_balance) || num(form.original_amount);
  const original = num(form.original_amount) || balance;
  const rate = num(form.interest_rate);
  const payment = num(form.monthly_payment);
  const payments = num(form.total_payments);
  const freq = form.payment_frequency || "monthly";

  if (balance <= 0) return { lines, chips };

  const paid = Math.max(original - balance, 0);
  if (original > 0 && paid > 0) {
    lines.push({ label: T("previewPaidSoFar", "Paid so far"), value: fmt(paid) });
  }

  // Derive payment from payments, or payments from payment
  let derivedPayment = payment;
  let derivedPayments = payments;
  if (payment <= 0 && payments > 0) {
    derivedPayment = balance / payments;
    chips.push({
      label: T("previewSetPayment", "Set payment = {n}").replace("{n}", fmt(derivedPayment)),
      field: "monthly_payment",
      value: String(derivedPayment.toFixed(2)),
    });
  } else if (payment > 0 && payments <= 0) {
    derivedPayments = Math.ceil(balance / payment);
    chips.push({
      label: T("previewSetPayments", "Set payments = {n}").replace("{n}", derivedPayments),
      field: "total_payments",
      value: String(derivedPayments),
    });
  }

  // Total interest + payoff date
  if (derivedPayment > 0 && derivedPayments > 0) {
    const totalPaid = derivedPayment * derivedPayments;
    const totalInterest = Math.max(totalPaid - balance, 0);
    if (totalInterest > 0) {
      lines.push({ label: T("previewTotalInterest", "Total interest"), value: fmt(totalInterest), tone: "destructive" });
    }
    let payoff;
    if (freq === "weekly") payoff = addDays(new Date(), derivedPayments * 7);
    else if (freq === "biweekly") payoff = addDays(new Date(), derivedPayments * 14);
    else payoff = addMonths(new Date(), derivedPayments);
    lines.push({
      label: T("previewPaidOff", "Paid off"),
      value: payoff.toLocaleDateString(locale, { month: "short", year: "numeric" }),
    });
  }

  // Interest suggestion chip (the 15% alert fix)
  if (rate <= 0) {
    chips.push({
      label: T("previewEstimateInterest", "Estimate 15% interest"),
      field: "interest_rate",
      value: "15",
    });
  }

  // Due date suggestion chip — only if the form actually has a due-date field
  const hasDueField = "due_date" in form || "next_payment_date" in form;
  const dueEmpty = !form.due_date && !form.next_payment_date;
  if (hasDueField && dueEmpty) {
    const d = nextDueDate(freq);
    chips.push({
      label: T("previewSetDueDate", "Set due date {n}").replace(
        "{n}",
        d.toLocaleDateString(locale, { month: "short", day: "numeric" })
      ),
      field: "due_date" in form ? "due_date" : "next_payment_date",
      value: d.toISOString().split("T")[0],
    });
  }

  return { lines, chips };
}

// ---------- BILLS ----------
export function computeBillPreview(form, { fmt, T, locale = "en-US" }) {
  const lines = [];
  const chips = [];
  const amount = num(form.amount);
  const freq = form.payment_frequency || "monthly";
  if (amount <= 0) return { lines, chips };

  const mult = FREQ_MULTIPLIER[freq] || 12;
  lines.push({ label: T("previewAnnualCost", "Annual cost"), value: fmt(amount * mult) });

  const d = nextDueDate(freq);
  lines.push({
    label: T("previewNextDue", "Next due"),
    value: d.toLocaleDateString(locale, { month: "short", day: "numeric" }),
  });

  return { lines, chips };
}

// ---------- SAVINGS GOALS ----------
export function computeSavingsPreview(form, { fmt, T, locale = "en-US" }) {
  const lines = [];
  const chips = [];
  const target = num(form.target_amount);
  const saved = num(form.current_saved);
  const weekly = num(form.weekly_contribution);
  if (target <= 0) return { lines, chips };

  const remaining = Math.max(target - saved, 0);
  if (saved > 0) lines.push({ label: T("previewRemaining", "Remaining"), value: fmt(remaining) });

  if (weekly > 0 && remaining > 0) {
    const weeks = Math.ceil(remaining / weekly);
    const done = addDays(new Date(), weeks * 7);
    lines.push({
      label: T("previewDoneBy", "Done by"),
      value: done.toLocaleDateString(locale, { month: "short", year: "numeric" }),
      tone: weeks * 7 > 365 ? "destructive" : "primary",
    });
  }

  if (form.target_date && remaining > 0 && weekly <= 0) {
    const targetDate = new Date(form.target_date);
    const daysLeft = Math.ceil((targetDate - new Date()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 0) {
      const weeksLeft = Math.max(Math.ceil(daysLeft / 7), 1);
      const needed = remaining / weeksLeft;
      chips.push({
        label: T("previewSetWeekly", "Set weekly = {n}").replace("{n}", fmt(needed)),
        field: "weekly_contribution",
        value: String(needed.toFixed(2)),
      });
    }
  }

  return { lines, chips };
}

// ---------- ASSETS ----------
const ASSET_TYPE_HINTS = [
  { keys: ["401", "ira", "roth", "brokerage", "stock", "etf", "invest"], type: "investment" },
  { keys: ["home", "house", "property", "land"], type: "property" },
  { keys: ["savings", "saving", "emergency"], type: "savings" },
];
export function computeAssetPreview(form, { fmt, T }) {
  const lines = [];
  const chips = [];
  const amount = num(form.amount);
  if (amount > 0) {
    lines.push({ label: T("previewNetWorthImpact", "Net worth +"), value: fmt(amount), tone: "primary" });
  }
  const name = (form.name || "").toLowerCase();
  const hint = ASSET_TYPE_HINTS.find(h => h.keys.some(k => name.includes(k)));
  if (hint && form.type !== hint.type) {
    chips.push({
      label: T("previewSetType", "Set type: {n}").replace("{n}", hint.type),
      field: "type",
      value: hint.type,
    });
  }
  return { lines, chips };
}

// ---------- BANK ACCOUNTS ----------
export function computeBankAccountPreview(form, { fmt, T }) {
  const lines = [];
  const chips = [];
  const balance = num(form.balance);
  if (balance !== 0) {
    lines.push({
      label: T("previewNetWorthImpact", "Net worth +"),
      value: fmt(Math.abs(balance)),
      tone: "primary",
    });
  }
  return { lines, chips };
}

// ---------- BUDGET CATEGORIES ----------
export function computeBudgetPreview(form, { fmt, T, monthlySpent = 0 }) {
  const lines = [];
  const chips = [];
  const limit = num(form.monthly_limit);
  if (limit <= 0) return { lines, chips };

  lines.push({ label: T("previewSpentThisMonth", "Spent this month"), value: fmt(monthlySpent) });
  const remaining = limit - monthlySpent;
  lines.push({
    label: T("previewRemaining", "Remaining"),
    value: fmt(Math.abs(remaining)),
    tone: remaining < 0 ? "destructive" : "primary",
  });

  if (monthlySpent > 0) {
    const suggested = Math.ceil((monthlySpent * 1.1) / 10) * 10;
    chips.push({
      label: T("previewSetLimit", "Set limit = {n}").replace("{n}", fmt(suggested)),
      field: "monthly_limit",
      value: String(suggested),
    });
  }
  return { lines, chips };
}

// ---------- INCOME ----------
export function computeIncomePreview(form, { fmt, T }) {
  const lines = [];
  const chips = [];
  const amount = num(form.amount);
  const freq = form.recurring_frequency || "weekly";
  if (amount <= 0) return { lines, chips };

  // Same brain constants as financeMath (52/12, 26/12) — no private multipliers
  const monthlyEquiv = freq === "weekly" ? (amount * 52) / 12 : freq === "biweekly" ? (amount * 26) / 12 : amount;
  lines.push({ label: T("previewMonthlyEquiv", "Monthly equiv."), value: fmt(monthlyEquiv), tone: "primary" });
  lines.push({ label: T("previewAnnualEquiv", "Annual"), value: fmt(monthlyEquiv * 12) });
  return { lines, chips };
}

// ---------- TRANSACTIONS (chips only; balance preview stays in the dialog) ----------
const TX_CATEGORY_KEYWORDS = {
  food: ["grocery", "groceries", "food", "restaurant", "market", "coffee", "bakery"],
  transport: ["gas", "fuel", "uber", "lyft", "transit", "parking", "taxi", "bus", "shell", "chevron"],
  utilities: ["electric", "water", "internet", "cable", "phone", "utility"],
  subscriptions: ["netflix", "spotify", "hulu", "disney", "subscription"],
  health: ["pharmacy", "doctor", "clinic", "medical", "dental"],
  shopping: ["walmart", "target", "amazon", "store", "mall"],
};
export function computeTransactionPreview(form, { fmt, T }) {
  const chips = [];
  if (form.category === "other" && form.description) {
    const r = form.description.toLowerCase();
    for (const [cat, keys] of Object.entries(TX_CATEGORY_KEYWORDS)) {
      if (keys.some(k => r.includes(k))) {
        chips.push({
          label: T("previewSetCategory", "Set category: {n}").replace("{n}", cat),
          field: "category",
          value: cat,
        });
        break;
      }
    }
  }
  return { lines: [], chips };
}