import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSupabaseAdmin } from '../../shared/supabaseClient.ts';
import { getSupaUserIdByEmail } from '../../shared/supabaseUserLookup.ts';
import { realIncomeEntries } from '../../shared/incomeMath.ts';

// Computed financial metrics using the app's OFFICIAL math — mirrors
// src/utils/financeMath.js + loanEngine.js. The chat agent quotes these
// numbers directly instead of doing row-level math on raw records.

const PERIODS_PER_MONTH = { monthly: 1, biweekly: 26 / 12, weekly: 52 / 12 };
const FREQ_PERIODS_PER_YEAR = { weekly: 52, biweekly: 26, monthly: 12 };

const num = (v) => { const n = typeof v === 'number' ? v : parseFloat(v); return Number.isFinite(n) ? n : 0; };
const parseDay = (s) => { if (!s) return null; const d = new Date(String(s).slice(0, 10) + 'T00:00:00'); return isNaN(d.getTime()) ? null : d; };

// Same normalization as financeMath.monthlyBillAmount / loanEngine.monthlyObligation
const monthlyBillAmount = (b) => num(b?.amount) * (PERIODS_PER_MONTH[b?.payment_frequency] ?? 1);
const monthlyObligation = (l) => {
  const pmt = num(l?.monthly_payment);
  if ((l?.payment_amount_type || 'per_period') === 'monthly_equivalent') return pmt;
  return pmt * ((FREQ_PERIODS_PER_YEAR[l?.payment_frequency || 'monthly'] || 12) / 12);
};

// Canonical spending: split-aware, excludes income, savings transfers,
// loan payments, and the app-logged bill/loan payment placeholders — those
// are obligations already counted in the DTI / obligation metrics.
function monthSpending(transactions, splits, y, m) {
  const inMonth = (v) => { const d = parseDay(v); return !!d && d.getFullYear() === y && d.getMonth() === m; };
  const isInternal = (tx) =>
    ['income', 'loan_payment', 'savings'].includes(tx.category || '') ||
    /^(Paid Bill:|Paid Loan:)/i.test(String(tx.description || ''));

  const monthSplits = (splits || []).filter((s) => inMonth(s.date));
  const monthTxs = (transactions || []).filter((tx) => inMonth(tx.date));
  const internalIds = new Set(monthTxs.filter(isInternal).map((tx) => tx.id));
  const splitParentIds = new Set(monthSplits.map((s) => s.transaction_id).filter(Boolean));

  const totals = {};
  const bump = (cat, amt) => {
    if (!cat || ['income', 'loan_payment', 'savings'].includes(cat)) return;
    totals[cat] = (totals[cat] || 0) + Math.abs(num(amt));
  };
  monthSplits.forEach((s) => { if (!internalIds.has(s.transaction_id)) bump(s.category, s.amount); });
  monthTxs.forEach((tx) => {
    if (internalIds.has(tx.id) || splitParentIds.has(tx.id) || num(tx.amount) >= 0) return;
    bump(tx.category, tx.amount);
  });
  return totals;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { client: supabaseAdmin } = getSupabaseAdmin();
    const uid = await getSupaUserIdByEmail(supabaseAdmin, user.email);
    if (!uid) return Response.json({ error: 'Supabase user not found' }, { status: 404 });

    const [loansRes, billsRes, incomesRes, transactionsRes, splitsRes, assetsRes, bankRes, paymentsRes] = await Promise.all([
      supabaseAdmin.from('loans').select('*').eq('user_id', uid),
      supabaseAdmin.from('bills').select('*').eq('user_id', uid),
      supabaseAdmin.from('incomes').select('*').eq('user_id', uid).order('week_start', { ascending: false }),
      supabaseAdmin.from('transactions').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(500),
      supabaseAdmin.from('transaction_splits').select('*').eq('user_id', uid),
      supabaseAdmin.from('assets').select('*').eq('user_id', uid),
      supabaseAdmin.from('bank_accounts').select('*').eq('user_id', uid),
      supabaseAdmin.from('payments').select('*').eq('user_id', uid).order('payment_date', { ascending: false }).limit(200),
    ]);

    const loans = loansRes.data || [];
    const bills = billsRes.data || [];
    const incomes = incomesRes.data || [];
    const transactions = transactionsRes.data || [];
    const splits = splitsRes.data || [];
    const assets = assetsRes.data || [];
    const bankAccounts = bankRes.data || [];
    const payments = paymentsRes.data || [];

    const realIncomes = realIncomeEntries(incomes);
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    const monthIncomes = realIncomes.filter((i) => {
      const d = parseDay(i.week_start);
      return !!d && d.getFullYear() === y && d.getMonth() === m;
    });
    const monthlyIncome = monthIncomes.reduce((s, i) => s + num(i.amount), 0);

    const lastPaycheck = realIncomes
      .map((i) => ({ amount: num(i.amount), date: String(i.week_start || '').slice(0, 10), d: parseDay(i.week_start) }))
      .filter((i) => i.d)
      .sort((a, b) => b.d - a.d)[0] || null;
    const template = incomes.find((i) => i.is_recurring && !i.recurring_source_id) || null;

    const activeLoans = loans.filter((l) => l.status !== 'paid_off');
    const activeBills = bills.filter((b) => b.is_active !== false);
    const monthlyLoans = activeLoans.reduce((s, l) => s + monthlyObligation(l), 0);
    const monthlyBillsTotal = activeBills.reduce((s, b) => s + monthlyBillAmount(b), 0);
    const totalObligations = monthlyLoans + monthlyBillsTotal;

    // ─── Projection: what a full month/year looks like IF income continues ───
    // Same pick as the auto-log cron / projectCashFlow: the NEWEST active
    // recurring template drives projected paychecks. Without one, fall back
    // to the frequency-weighted average of the last 3 real paychecks.
    const activeTemplates = incomes
      .filter((i) => i.is_recurring && i.recurring_active !== false && !i.recurring_source_id)
      .sort((a, b) => String(b.week_start || '').localeCompare(String(a.week_start || '')));
    const projTemplate = activeTemplates[0] || null;
    let projectedMonthlyIncome = 0;
    let projectionBasis: string | null = null;
    if (projTemplate) {
      const f = projTemplate.recurring_frequency || 'weekly';
      projectedMonthlyIncome = num(projTemplate.amount) * (PERIODS_PER_MONTH[f] ?? 1);
      projectionBasis = `recurring ${f} template of ${num(projTemplate.amount)} per period`;
    } else {
      const recent = realIncomes
        .map((i) => ({ amt: num(i.amount), freq: i.recurring_frequency || i.frequency || 'weekly', d: parseDay(i.week_start) }))
        .filter((i) => i.d)
        .sort((a, b) => b.d - a.d)
        .slice(0, 3);
      if (recent.length > 0) {
        projectedMonthlyIncome = recent.reduce((s, r) => s + r.amt * (PERIODS_PER_MONTH[r.freq] ?? 1), 0) / recent.length;
        projectionBasis = `average of last ${recent.length} real paycheck(s), weighted by frequency`;
      }
    }

    const byCategory = monthSpending(transactions, splits, y, m);
    const monthlySpending = Object.values(byCategory).reduce((s, v) => s + v, 0);

    // "Bank Cash" assets are mirrors of bank balances — excluded so cash
    // isn't double-counted (bankAccounts below adds the real balances).
    // Credit-card accounts hold the amount OWED — a liability, never an asset
    // (same convention as Banking Info / financeMath.netWorthFrom).
    const activeBanks = bankAccounts.filter((a) => a.is_active !== false);
    const nonCreditBanks = activeBanks.filter((a) => String(a.account_type || '').toLowerCase() !== 'credit');
    const creditDebt = activeBanks.filter((a) => String(a.account_type || '').toLowerCase() === 'credit').reduce((s, a) => s + num(a.balance), 0);
    const assetSum = assets.filter((a) => !String(a.name || '').toLowerCase().startsWith('bank cash')).reduce((s, a) => s + num(a.amount), 0)
      + nonCreditBanks.reduce((s, a) => s + num(a.balance), 0);
    const debtSum = creditDebt + activeLoans.reduce((s, l) => s + num(l.current_balance), 0);

    // 3-month history: income-table income, canonical spending, payments made
    const history = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(y, m - i, 1);
      const hy = d.getFullYear();
      const hm = d.getMonth();
      const income = realIncomes.reduce((s, inc) => {
        const pd = parseDay(inc.week_start);
        return pd && pd.getFullYear() === hy && pd.getMonth() === hm ? s + num(inc.amount) : s;
      }, 0);
      const spend = Object.values(monthSpending(transactions, splits, hy, hm)).reduce((s, v) => s + v, 0);
      const paid = payments.reduce((s, p) => {
        const pd = parseDay(p.payment_date);
        return pd && pd.getFullYear() === hy && pd.getMonth() === hm ? s + num(p.amount) : s;
      }, 0);
      history.push({
        month: `${hy}-${String(hm + 1).padStart(2, '0')}`,
        income: Math.round(income * 100) / 100,
        spending: Math.round(spend * 100) / 100,
        paymentsMade: Math.round(paid * 100) / 100,
      });
    }

    const r2 = (v) => Math.round(num(v) * 100) / 100;
    return Response.json({
      success: true,
      asOf: `${y}-${String(m + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
      income: {
        monthlyIncome: r2(monthlyIncome),
        entriesThisMonth: monthIncomes.length,
        lastPaycheck: lastPaycheck ? { amount: r2(lastPaycheck.amount), date: lastPaycheck.date } : null,
        recurringTemplate: template ? { amount: r2(template.amount), frequency: template.recurring_frequency || 'weekly' } : null,
        note: 'Month-to-date: income actually logged so far this calendar month — partial early in the month',
      },
      projection: projectedMonthlyIncome > 0 ? {
        monthlyIncome: r2(projectedMonthlyIncome),
        annualIncome: r2(projectedMonthlyIncome * 12),
        monthlyObligations: r2(totalObligations),
        annualObligations: r2(totalObligations * 12),
        monthlyCashFlow: r2(projectedMonthlyIncome - totalObligations),
        annualCashFlow: r2((projectedMonthlyIncome - totalObligations) * 12),
        dti: Math.round((totalObligations / projectedMonthlyIncome) * 100) / 100,
        basis: projectionBasis,
        note: 'PROJECTION — money not received yet; assumes income continues on its current pattern',
      } : null,
      obligations: {
        monthlyBills: r2(monthlyBillsTotal),
        monthlyLoans: r2(monthlyLoans),
        total: r2(totalObligations),
        activeBills: activeBills.length,
        activeLoans: activeLoans.length,
      },
      spending: { monthlySpending: r2(monthlySpending), byCategory },
      cashFlow: r2(monthlyIncome - totalObligations),
      savingsRate: monthlyIncome > 0 ? Math.round(((monthlyIncome - monthlySpending) / monthlyIncome) * 100) / 100 : null,
      dti: monthlyIncome > 0 ? Math.round((totalObligations / monthlyIncome) * 100) / 100 : null,
      netWorth: { assets: r2(assetSum), debt: r2(debtSum), netWorth: r2(assetSum - debtSum) },
      history,
    });
  } catch (error) {
    console.error('[getComputedFinancials] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}