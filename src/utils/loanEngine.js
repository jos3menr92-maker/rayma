/**
 * loanEngine.js — Single source of truth for ALL loan math in Rayma AI.
 *
 * Three modes, driven by the loan's `category`:
 *   - amortizing : fixed-term installment loans (mortgage, auto, student, personal, medical)
 *                  → standard amortization formula (P&I split each period)
 *   - revolving  : credit cards & lines of credit
 *                  → interest charged on remaining balance, payment reduces principal
 *   - simple    : flat / simple-interest loans (other / unknown)
 *                  → straight-line interest, balance ÷ term
 *
 * No React, no API, no AI — pure arithmetic. Every loan-facing component
 * (AddLoan, EditLoanForm, LoanDetail, DebtPayoffSimulator, Onboarding, chat)
 * should import from here instead of re-implementing math.
 */

// ─── category → mode mapping ───────────────────────────────
const CATEGORY_MODES = {
  mortgage: "amortizing",
  auto: "amortizing",
  student: "amortizing",
  personal: "amortizing",
  medical: "amortizing",
  credit_card: "revolving",
  line_of_credit: "revolving",
  lease: "amortizing",
  bankruptcy: "amortizing",
  other: "simple",
};

export function getLoanMode(category) {
  return CATEGORY_MODES[category] || "simple";
}

// ─── numeric helpers ────────────────────────────────────────
function num(v) {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

const FREQ_PERIODS_PER_YEAR = { weekly: 52, biweekly: 26, monthly: 12 };

function periodsPerYear(freq) {
  return FREQ_PERIODS_PER_YEAR[freq] || 12;
}

// Convert any-frequency payment to a monthly equivalent for comparison/calc
export function toMonthly(amount, freq) {
  return num(amount) * (periodsPerYear(freq) / 12);
}

// Convert a stored payment amount to the actual per-period payment,
// accounting for the payment_amount_type convention:
//   - per_period        : stored value IS the per-period amount (default).
//   - monthly_equivalent: stored value is the monthly figure → convert to per-period.
export function paymentPerPeriod(loan) {
  const pmt = num(loan?.monthly_payment);
  const freq = loan?.payment_frequency || "monthly";
  const type = loan?.payment_amount_type || "per_period";
  if (type === "monthly_equivalent" && freq !== "monthly") {
    return pmt * (12 / periodsPerYear(freq));
  }
  return pmt;
}

// Monthly-equivalent obligation of a loan, honoring payment_amount_type:
//   - per_period        : convert the per-period payment up to a monthly figure.
//   - monthly_equivalent: the stored value is already monthly (no conversion).
// Used by Dashboard / recap / budget so weekly & biweekly loans are counted
// at their true monthly weight, not their raw per-period amount.
export function monthlyObligation(loan) {
  const pmt = num(loan?.monthly_payment);
  const type = loan?.payment_amount_type || "per_period";
  const freq = loan?.payment_frequency || "monthly";
  if (type === "monthly_equivalent") return pmt;
  return pmt * (periodsPerYear(freq) / 12);
}

// ─── amortizing (installment loans) ─────────────────────────
/**
 * Standard amortization: fixed payment that fully retires the loan over `termMonths`.
 * @returns { monthlyPayment, totalInterest, totalPaid, schedule[] }
 */
export function computeAmortization({ principal, annualRate, termMonths, paymentFrequency = "monthly" }) {
  const P = num(principal);
  const r = (num(annualRate) / 100) / periodsPerYear(paymentFrequency);
  const n = num(termMonths);
  if (P <= 0 || n <= 0) return { monthlyPayment: 0, totalInterest: 0, totalPaid: 0, schedule: [] };

  let paymentPerPeriod;
  if (r === 0) {
    paymentPerPeriod = P / n;
  } else {
    paymentPerPeriod = P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }

  const periodsPerYr = periodsPerYear(paymentFrequency);
  const monthlyPayment = paymentPerPeriod * (periodsPerYr / 12);
  const totalPaid = paymentPerPeriod * n;
  const totalInterest = Math.max(totalPaid - P, 0);

  // Compact schedule: every period for ≤24 periods, otherwise monthly samples
  const schedule = [];
  let balance = P;
  let accInterest = 0;
  const step = n <= 24 ? 1 : Math.ceil(n / 24);
  for (let i = 1; i <= n; i++) {
    const interest = balance * r;
    const principalPart = paymentPerPeriod - interest;
    balance = Math.max(balance - principalPart, 0);
    accInterest += interest;
    if (i % step === 0 || i === n || balance <= 0) {
      schedule.push({ period: i, balance: Math.round(balance), interest: Math.round(accInterest) });
    }
    if (balance <= 0) break;
  }

  return {
    monthlyPayment: Number(monthlyPayment.toFixed(2)),
    totalInterest: Number(totalInterest.toFixed(2)),
    totalPaid: Number(totalPaid.toFixed(2)),
    schedule,
  };
}

// ─── revolving (credit cards) ───────────────────────────────
/**
 * Revolving credit: interest accrues on balance each period; payment reduces principal.
 * No fixed term — payoff depends on payment vs. interest floor.
 * @returns { months, totalInterest, schedule[] } or null if payment never retires debt
 */
export function computeRevolving({ balance, annualRate, monthlyPayment, paymentFrequency = "monthly", extraPayment = 0 }) {
  const B = num(balance);
  const r = (num(annualRate) / 100) / periodsPerYear(paymentFrequency);
  const pmt = num(monthlyPayment) + num(extraPayment);
  if (B <= 0 || pmt <= 0) return { months: 0, totalInterest: 0, schedule: [] };

  // If payment doesn't cover first period's interest, debt grows forever
  const firstInterest = B * r;
  if (pmt <= firstInterest) return null;

  let remaining = B;
  let months = 0;
  let totalInterest = 0;
  const schedule = [];
  const cap = 600; // 50 yr safety
  const step = 12;

  while (remaining > 0 && months < cap) {
    const interest = remaining * r;
    const principalPart = Math.min(pmt - interest, remaining);
    remaining = Math.max(remaining - principalPart, 0);
    totalInterest += interest;
    months++;
    if (months % step === 0 || remaining <= 0) {
      schedule.push({ period: months, balance: Math.round(remaining), interest: Math.round(totalInterest) });
    }
  }
  return { months, totalInterest: Number(totalInterest.toFixed(2)), schedule };
}

// ─── simple interest (flat) ─────────────────────────────────
/**
 * Simple/flat interest: totalInterest = P × rate × (termMonths/12).
 * @returns { totalInterest, monthlyPayment, totalPaid }
 */
export function computeSimple({ principal, annualRate, termMonths, paymentFrequency = "monthly" }) {
  const P = num(principal);
  const rate = num(annualRate) / 100;
  const n = num(termMonths);
  const totalInterest = P * rate * (n / 12);
  const totalPaid = P + totalInterest;
  const monthlyPayment = n > 0 ? totalPaid / n : 0;
  return {
    totalInterest: Number(totalInterest.toFixed(2)),
    monthlyPayment: Number(monthlyPayment.toFixed(2)),
    totalPaid: Number(totalPaid.toFixed(2)),
  };
}

// ─── unified projection (mode-aware) ────────────────────────
/**
 * Given a loan object, project its full payoff using the right mode.
 * @returns { mode, months, payoffDate, totalInterest, monthlyPayment, schedule, warning? }
 */
export function projectPayoff(loan) {
  const mode = getLoanMode(loan?.category);
  const freq = loan?.payment_frequency || "monthly";
  const balance = num(loan?.current_balance) || num(loan?.original_amount);
  const rate = num(loan?.interest_rate);
  const pmt = paymentPerPeriod(loan);
  const term = num(loan?.term_months);

  if (balance <= 0) {
    return { mode, months: 0, payoffDate: null, totalInterest: 0, monthlyPayment: 0, schedule: [], warning: null };
  }

  if (mode === "amortizing") {
    if (term > 0) {
      const a = computeAmortization({ principal: balance, annualRate: rate, termMonths: term, paymentFrequency: freq });
      return { mode, ...a, months: term, payoffDate: addPeriods(term, freq), warning: null };
    }
    // No term but has payment → simulate like revolving (same math, fixed payment)
    const sim = computeRevolving({ balance, annualRate: rate, monthlyPayment: pmt, paymentFrequency: freq });
    if (!sim) return { mode, months: null, payoffDate: null, totalInterest: null, monthlyPayment: pmt, schedule: [], warning: "payment-below-interest" };
    return { mode, ...sim, monthlyPayment: pmt, payoffDate: addPeriods(sim.months, freq), warning: null };
  }

  if (mode === "revolving") {
    const sim = computeRevolving({ balance, annualRate: rate, monthlyPayment: pmt, paymentFrequency: freq });
    if (!sim) return { mode, months: null, payoffDate: null, totalInterest: null, monthlyPayment: pmt, schedule: [], warning: "payment-below-interest" };
    return { mode, ...sim, payoffDate: addPeriods(sim.months, freq), warning: null };
  }

  // simple
  if (term > 0) {
    const s = computeSimple({ principal: balance, annualRate: rate, termMonths: term, paymentFrequency: freq });
    return { mode, ...s, months: term, payoffDate: addPeriods(term, freq), schedule: [], warning: null };
  }
  const sim = computeRevolving({ balance, annualRate: rate, monthlyPayment: pmt, paymentFrequency: freq });
  if (!sim) return { mode, months: null, payoffDate: null, totalInterest: null, monthlyPayment: pmt, schedule: [], warning: "payment-below-interest" };
  return { mode, ...sim, payoffDate: addPeriods(sim.months, freq), warning: null };
}

/**
 * Mode-aware simulation with an extra monthly payment — for the Debt Payoff Simulator.
 * @returns { months, totalInterest, schedule, monthlyPayment, warning? }
 */
export function simulateWithExtra(loan, extraPayment = 0) {
  const mode = getLoanMode(loan?.category);
  const freq = loan?.payment_frequency || "monthly";
  const balance = num(loan?.current_balance) || num(loan?.original_amount);
  const rate = num(loan?.interest_rate);
  const basePmt = paymentPerPeriod(loan);
  const term = num(loan?.term_months);

  if (mode === "amortizing" && term > 0) {
    const boosted = basePmt + num(extraPayment);
    const sim = computeRevolving({ balance, annualRate: rate, monthlyPayment: boosted, paymentFrequency: freq });
    if (!sim) return { months: null, totalInterest: null, schedule: [], monthlyPayment: boosted, warning: "payment-below-interest" };
    return { ...sim, monthlyPayment: boosted };
  }

  const sim = computeRevolving({ balance, annualRate: rate, monthlyPayment: basePmt, paymentFrequency: freq, extraPayment });
  if (!sim) return { months: null, totalInterest: null, schedule: [], monthlyPayment: basePmt, warning: "payment-below-interest" };
  return { ...sim, monthlyPayment: basePmt + num(extraPayment) };
}

// ─── amortization-aware payment application ─────────────────
/**
 * Split a payment into principal vs. interest for the current balance,
 * then return the new balance. Used by payLoan() and the debt simulator.
 * @returns { principalPaid, interestPaid, newBalance, mode }
 */
export function applyPayment(loan, paymentAmount) {
  const mode = getLoanMode(loan?.category);
  const freq = loan?.payment_frequency || "monthly";
  const balance = num(loan?.current_balance) || num(loan?.original_amount);
  const rate = num(loan?.interest_rate);
  const pmt = num(paymentAmount);

  if (balance <= 0 || pmt <= 0) {
    return { principalPaid: 0, interestPaid: 0, newBalance: balance, mode };
  }

  const r = (rate / 100) / periodsPerYear(freq);
  const interestPortion = balance * r;
  const principalPortion = Math.min(Math.max(pmt - interestPortion, 0), balance);
  const newBalance = Math.max(balance - principalPortion, 0);

  return {
    principalPaid: Number(principalPortion.toFixed(2)),
    interestPaid: Number(interestPortion.toFixed(2)),
    newBalance: Number(newBalance.toFixed(2)),
    mode,
  };
}

// ─── suggested payment by category ──────────────────────────
/**
 * Suggest a monthly payment (and term) for a new loan based on category defaults.
 * Credit cards: suggest a payoff term of 12-24 months.
 * Amortizing: suggest a standard term by category.
 */
const CATEGORY_DEFAULTS = {
  mortgage: { term: 360, rate: 6.8 },
  auto: { term: 60, rate: 7.3 },
  student: { term: 120, rate: 5.5 },
  personal: { term: 36, rate: 11.5 },
  medical: { term: 24, rate: 0 },
  credit_card: { term: 18, rate: 24.9 },
  line_of_credit: { term: null, rate: 8 },
  lease: { term: 24, rate: 0 },
  bankruptcy: { term: 60, rate: 0 },
  other: { term: 12, rate: 12 },
};

export function suggestDefaults(category) {
  return CATEGORY_DEFAULTS[category] || CATEGORY_DEFAULTS.other;
}

export function suggestPayment(category, balance) {
  const { term, rate } = suggestDefaults(category);
  const a = computeAmortization({ principal: num(balance), annualRate: rate, termMonths: term });
  return { suggestedPayment: a.monthlyPayment, suggestedTerm: term, suggestedRate: rate };
}

// ─── date helper ────────────────────────────────────────────
function addPeriods(periods, freq) {
  const d = new Date();
  if (freq === "weekly") d.setDate(d.getDate() + periods * 7);
  else if (freq === "biweekly") d.setDate(d.getDate() + periods * 14);
  else d.setMonth(d.getMonth() + periods);
  return d;
}

// ─── summary card builder ───────────────────────────────────
/**
 * Produce a localized, mode-aware summary for LoanDetail / chat.
 * @returns { lines: [{label, value, tone?}], mode, warning? }
 */
export function buildLoanSummary(loan, { fmt, T }) {
  const mode = getLoanMode(loan?.category);
  const proj = projectPayoff(loan);
  const lines = [];

  lines.push({ label: T("loanMode", "Loan type"), value: T(`mode_${mode}`, mode) });

  if (proj.warning === "payment-below-interest") {
    lines.push({
      label: T("paymentTooLow", "Payment below interest"),
      value: T("paymentTooLowDesc", "Increase payment to ever pay off"),
      tone: "destructive",
    });
    return { lines, mode, warning: proj.warning };
  }

  if (proj.months > 0) {
    lines.push({
      label: T("payoffIn", "Payoff in"),
      value: `${proj.months} ${T("months", "months")}`,
      tone: "primary",
    });
  }
  if (proj.payoffDate) {
    lines.push({
      label: T("payoffDate", "Payoff date"),
      value: proj.payoffDate.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
    });
  }
  if (proj.totalInterest > 0) {
    lines.push({ label: T("totalInterest", "Total interest"), value: fmt(proj.totalInterest), tone: "destructive" });
  }
  if (proj.monthlyPayment > 0) {
    lines.push({ label: T("monthlyPayment", "Monthly payment"), value: fmt(proj.monthlyPayment) });
  }
  return { lines, mode, warning: null };
}