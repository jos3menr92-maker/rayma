/**
 * payoffStrategies.js — THE multi-loan cascade brain for the Debt Payoff
 * Simulator (Strategy tab). Pure orchestration only: every interest/payment
 * primitive comes from loanEngine (paymentPerPeriod / monthlyObligation), so
 * this file decides WHO gets money next — never HOW interest works.
 *
 * Parity invariant (regression-tested): simulateCascade with ONE loan and
 * extraMonthly = X must reproduce loanEngine.simulateWithExtra(loan, X)
 * exactly — same payoff months, same total interest.
 *
 * How it works: event-driven clock. Each loan pays on its own true cadence
 * (weekly / biweekly / monthly); interest accrues linearly between events
 * (balance × APR/12 × elapsed months — for a loan paying its own period this
 * is EXACTLY loanEngine's per-period rate). When a loan dies, its freed
 * monthly-equivalent payment rolls into the next strategy target together
 * with the user's extra budget.
 */

import { paymentPerPeriod, monthlyObligation } from "@/utils/loanEngine";

const FREQ_PERIODS_PER_YEAR = { weekly: 52, biweekly: 26, monthly: 12 };
const periodsPerYear = (f) => FREQ_PERIODS_PER_YEAR[f] || 12;
const num = (v) => { const n = typeof v === "number" ? v : parseFloat(v); return Number.isFinite(n) ? n : 0; };

const MONTH_CAP = 600; // 50-year horizon
const EVENT_CAP = 20000;

function pickFocus(alive, strategy) {
  if (alive.length === 0) return null;
  const sorted = strategy === "snowball"
    ? [...alive].sort((a, b) => a.balance - b.balance || b.apr - a.apr)
    : [...alive].sort((a, b) => b.apr - a.apr || a.balance - b.balance);
  return sorted[0];
}

/**
 * Simulate a full multi-loan payoff plan.
 * @param {Array} loans raw loan objects (active only)
 * @param {Object} opts
 *   - strategy: "avalanche" (highest APR first) | "snowball" (smallest balance first)
 *   - extraMonthly: extra budget applied to the current focus loan
 *   - cascadeFreed: roll freed payments into the next target (false = minimums-only baseline)
 * @returns per-loan payoffs, total interest, payoff order, month timeline, freed rolls, warnings
 */
export function simulateCascade(loans, { strategy = "avalanche", extraMonthly = 0, cascadeFreed = true } = {}) {
  const pool = (loans || []).map((loan) => {
    const freq = loan.payment_frequency || "monthly";
    const ppy = periodsPerYear(freq);
    return {
      id: loan.id,
      loan,
      name: loan.name,
      apr: num(loan.interest_rate),
      ppy,
      minPerPeriod: paymentPerPeriod(loan),
      balance: num(loan.current_balance) || num(loan.original_amount),
      periodLenMonths: 12 / ppy,
      dueIn: 12 / ppy,
      accrued: 0,
      totalInterest: 0,
      payoffMonths: null,
      dead: false,
      warnings: [],
    };
  });

  // Loans already at zero die at month 0
  pool.forEach((p) => {
    if (p.balance <= 0) { p.balance = 0; p.payoffMonths = 0; p.dead = true; }
  });

  const alive = () => pool.filter((p) => !p.dead);
  const totalBalance = () => alive().reduce((s, p) => s + p.balance, 0);

  let t = 0;
  let freedMonthly = 0;
  let events = 0;
  const freedRolls = [];
  const rawTimeline = [{ t: 0, total: totalBalance() }];

  while (alive().length > 0 && t < MONTH_CAP && events < EVENT_CAP) {
    const currentAlive = alive();
    const next = currentAlive.reduce((a, b) => (a.dueIn <= b.dueIn ? a : b));
    if (next.dueIn > t) {
      const dt = next.dueIn - t;
      t = next.dueIn;
      for (const p of currentAlive) {
        const interest = p.balance * (p.apr / 1200) * dt;
        p.accrued += interest;
        p.totalInterest += interest;
      }
    }

    const focus = pickFocus(currentAlive, strategy);
    let pay = next.minPerPeriod;
    if (cascadeFreed && focus === next) {
      pay += (num(extraMonthly) + freedMonthly) * (12 / next.ppy);
    }

    const interest = next.accrued;
    next.accrued = 0;
    if (next.minPerPeriod <= 0 && !next.warnings.includes("no_payment")) next.warnings.push("no_payment");
    if (pay - interest < 0 && !next.warnings.includes("below_interest")) next.warnings.push("below_interest");

    const principal = Math.min(Math.max(pay - interest, 0), next.balance);
    next.balance = Math.max(next.balance - principal, 0);
    next.dueIn += next.periodLenMonths;
    events++;

    if (next.balance <= 0.005) {
      next.dead = true;
      next.payoffMonths = t;
      if (cascadeFreed) {
        const freed = monthlyObligation(next.loan);
        freedMonthly += freed;
        const nextFocus = pickFocus(alive(), strategy);
        freedRolls.push({
          fromId: next.id,
          fromName: next.name,
          freedMonthly: freed,
          atMonth: t,
          toId: nextFocus ? nextFocus.id : null,
          toName: nextFocus ? nextFocus.name : null,
        });
      }
    }
    rawTimeline.push({ t, total: totalBalance() });
  }

  // Downsample the timeline to ≤80 chart points (keep the final point)
  const timeline = [];
  const step = Math.max(1, Math.ceil(rawTimeline.length / 80));
  const r2m = (x) => Math.round(x * 100) / 100;
  for (let i = 0; i < rawTimeline.length; i += step) {
    timeline.push({ month: Math.round(rawTimeline[i].t * 10) / 10, balance: r2m(rawTimeline[i].total) });
  }
  const last = rawTimeline[rawTimeline.length - 1];
  if (timeline[timeline.length - 1].month !== Math.round(last.t * 10) / 10) {
    timeline.push({ month: Math.round(last.t * 10) / 10, balance: r2m(last.total) });
  }

  const results = pool.map((p) => ({
    id: p.id,
    name: p.name,
    payoffMonths: p.dead ? p.payoffMonths : null, // null = never within the horizon
    totalInterest: r2m(p.totalInterest),
    warnings: [...new Set(p.warnings)],
  }));

  const anyNever = results.some((r) => r.payoffMonths === null);
  const payoffList = results.filter((r) => r.payoffMonths !== null);

  return {
    strategy,
    extraMonthly: num(extraMonthly),
    loans: results,
    order: payoffList.sort((a, b) => a.payoffMonths - b.payoffMonths).map((r) => r.id),
    monthsToDebtFree: anyNever ? null : (payoffList.length ? Math.max(...payoffList.map((r) => r.payoffMonths)) : 0),
    totalInterest: r2m(results.reduce((s, r) => s + r.totalInterest, 0)),
    totalMonthlyMinimums: (loans || []).reduce((s, l) => s + monthlyObligation(l), 0),
    timeline,
    freedRolls,
    warnings: [...new Set(results.flatMap((r) => r.warnings))],
  };
}

/**
 * Full three-way comparison for the Strategy tab:
 * minimums-only baseline vs avalanche vs snowball (both cascade freed payments).
 */
export function compareStrategies(loans, extraMonthly = 0) {
  return {
    minimums: simulateCascade(loans, { strategy: "avalanche", extraMonthly: 0, cascadeFreed: false }),
    avalanche: simulateCascade(loans, { strategy: "avalanche", extraMonthly, cascadeFreed: true }),
    snowball: simulateCascade(loans, { strategy: "snowball", extraMonthly, cascadeFreed: true }),
  };
}