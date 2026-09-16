import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getSupabaseAdmin } from '../../shared/supabaseClient.ts';

/**
 * Read-only per-account financial integrity audit.
 * Loads every Supabase user's financial data separately and reports:
 * counts, key figures, seed/test-data contamination signatures, math
 * anomalies (balance > original, stale snapshots vs live net worth),
 * duplicates, and recurring income templates. No data is modified.
 */
const SEED_LOAN_NAMES = ['honda civic auto loan', 'sallie mae student loan', 'discover personal loan'];
const SEED_BANK_NAMES = ['chase checking', 'ally savings', 'amex gold card', 'fidelity brokerage'];
const SEED_BILL_PAIRS = [
  ['netflix', 15.49], ['electric bill', 125], ['rent', 1450],
  ['car insurance', 95], ['gym membership', 39.99], ['internet (comcast)', 79.99],
];
const SEED_ASSET_AMOUNTS = [4250.75, 18500, 52300, 12500, 6000];
const SEED_INCOME_AMOUNT = 2400;

function monthlyFactor(freq) {
  if (freq === 'weekly') return 52 / 12;
  if (freq === 'biweekly') return 26 / 12;
  return 1;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (caller.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const { client: supabase } = getSupabaseAdmin();

    // Optional email filter — audit a single account instead of all of them
    // detail=false omits the per-record lists, keeping counts + figures + findings
    let targetEmail = null;
    let detail = true;
    try {
      const body = await req.json();
      targetEmail = body && body.email ? String(body.email).toLowerCase() : null;
      detail = body && body.detail === false ? false : true;
    } catch { targetEmail = null; }

    // Collect every Supabase auth user (paginated)
    const authUsers = [];
    let page = 1;
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
      if (error) throw new Error('listUsers failed: ' + error.message);
      authUsers.push(...data.users);
      if (data.users.length === 0 || authUsers.length >= (data.total || 0)) break;
      page += 1;
    }

    const now = new Date();
    const monthStartISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const isThisMonth = (d) => Boolean(d) && String(d).slice(0, 7) === monthStartISO.slice(0, 7);

    const targets = targetEmail ? authUsers.filter(u => String(u.email || '').toLowerCase() === targetEmail) : authUsers;
    const reports = [];
    for (const u of targets) {
      const uid = u.id;
      const load = async (table, orderCol) => {
        const { data, error } = await supabase.from(table).select('*').eq('user_id', uid).order(orderCol, { ascending: false }).limit(500);
        if (error) return { __error: error.message };
        return data || [];
      };

      const [loansRaw, billsRaw, incomesRaw, paymentsRaw, txRaw, assetsRaw, goalsRaw, banksRaw, snapsRaw, adjRaw, budgetsRaw, splitsRaw] = await Promise.all([
        load('loans', 'created_at'), load('bills', 'created_at'), load('incomes', 'week_start'),
        load('payments', 'payment_date'), load('transactions', 'date'), load('assets', 'created_at'),
        load('savings_goals', 'created_at'), load('bank_accounts', 'created_at'),
        load('net_worth_snapshots', 'snapshot_date'), load('loan_adjustments', 'date'),
        load('budget_categories', 'created_at'), load('transaction_splits', 'created_at'),
      ]);
      const { data: profile } = await supabase.from('profiles').select('id, preferred_name, onboarding_complete, created_at').eq('id', uid).maybeSingle();

      const errTable = [loansRaw, billsRaw, incomesRaw, paymentsRaw, txRaw, assetsRaw, goalsRaw, banksRaw, snapsRaw, adjRaw, budgetsRaw, splitsRaw].find(r => Array.isArray(r) === false);
      if (errTable) {
        reports.push({ email: u.email, error: 'Table load failed — check app logs' });
        continue;
      }

      const loans = loansRaw; const bills = billsRaw; const incomes = incomesRaw;
      const payments = paymentsRaw; const tx = txRaw; const assets = assetsRaw;
      const goals = goalsRaw; const banks = banksRaw; const snaps = snapsRaw;
      const splits = splitsRaw;

      const findings = [];
      const seedHits = { loans: [], bills: [], banks: [], assets: [], income: 0, txNotes: 0, goalNotes: 0 };

      for (const l of loans) {
        const n = String(l.name || '').toLowerCase();
        if (SEED_LOAN_NAMES.includes(n)) seedHits.loans.push(l.name);
      }
      for (const b of bills) {
        const n = String(b.name || '').toLowerCase();
        if (SEED_BILL_PAIRS.some(([bn, amt]) => n === bn && Math.abs((b.amount || 0) - amt) < 0.005)) seedHits.bills.push(b.name);
      }
      for (const b of banks) {
        if (SEED_BANK_NAMES.includes(String(b.name || '').toLowerCase())) seedHits.banks.push(b.name);
      }
      for (const a of assets) {
        if (SEED_ASSET_AMOUNTS.some(amt => Math.abs((a.amount || 0) - amt) < 0.005)) seedHits.assets.push(a.name);
      }
      for (const t of tx) if (String(t.notes || '') === 'Test transaction') seedHits.txNotes += 1;
      for (const g of goals) if (String(g.notes || '') === 'Test goal') seedHits.goalNotes += 1;
      for (const i of incomes) if ((i.amount || 0) === SEED_INCOME_AMOUNT && String(i.note || '').toLowerCase().includes('bi-weekly')) seedHits.income += 1;

      const seedSignals = seedHits.loans.length + seedHits.bills.length + seedHits.banks.length + seedHits.assets.length + seedHits.txNotes + seedHits.goalNotes + seedHits.income;
      if (seedSignals > 0) {
        findings.push({
          type: 'SEED_TEST_DATA',
          detail: `${seedSignals} records match the seedTestData signature`,
          matches: seedHits,
        });
      }

      // Math anomalies on loans
      for (const l of loans) {
        const bal = l.current_balance || 0;
        const orig = l.original_amount || 0;
        if (bal > orig + 1) findings.push({ type: 'BALANCE_EXCEEDS_ORIGINAL', detail: `${l.name}: balance ${bal} > original ${orig}` });
        if ((l.status || '') === 'active' && bal <= 0) findings.push({ type: 'ACTIVE_ZERO_BALANCE', detail: `${l.name}: active but balance ${bal}` });
        if ((l.status || '') === 'paid_off' && bal > 1) findings.push({ type: 'PAID_WITH_BALANCE', detail: `${l.name}: paid_off but balance ${bal}` });
      }

      // Duplicates by name
      const dupNames = (arr, label) => {
        const seen = {};
        for (const r of arr) {
          const k = String(r.name || '').toLowerCase().trim();
          if (!k) continue;
          seen[k] = (seen[k] || 0) + 1;
        }
        for (const [k, c] of Object.entries(seen)) {
          if (c > 1) findings.push({ type: 'DUPLICATE_NAME', detail: `${label}: "${k}" appears ${c}x` });
        }
      };
      dupNames(loans, 'Loan');
      dupNames(bills, 'Bill');

      // Live vs snapshot net worth
      const activeLoans = loans.filter(l => (l.status || 'active') !== 'paid_off');
      const liveAssets = assets.reduce((s, a) => s + (a.amount || 0), 0) + banks.reduce((s, b) => s + ((b.is_active === false) ? 0 : (b.balance || 0)), 0);
      const liveLiabilities = activeLoans.reduce((s, l) => s + (l.current_balance || 0), 0);
      const liveNetWorth = liveAssets - liveLiabilities;
      const latestSnap = (snaps && snaps[0]) || null;
      const snapNetWorth = latestSnap ? (latestSnap.net_worth != null ? latestSnap.net_worth : ((latestSnap.total_assets || 0) - (latestSnap.total_liabilities || 0))) : null;
      if (latestSnap && Math.abs((snapNetWorth || 0) - liveNetWorth) > 1) {
        findings.push({
          type: 'SNAPSHOT_VS_LIVE',
          detail: `Latest snapshot (${latestSnap.snapshot_date}) net worth ${snapNetWorth} vs live ${liveNetWorth} — delta ${(snapNetWorth || 0) - liveNetWorth}`,
        });
      }

      // Recurring income templates
      const recurringTemplates = incomes.filter(i => i.is_recurring && i.recurring_active);
      for (const t of recurringTemplates) {
        findings.push({
          type: 'INCOME_TEMPLATE',
          detail: `${t.source || 'Income'}: ${t.amount} every ${t.recurring_frequency || 'weekly'} (drives the projected monthly income)`,
        });
      }

      const monthlyOblig = {
        bills: bills.filter(b => b.is_active !== false).reduce((s, b) => s + (b.amount || 0) * monthlyFactor(b.payment_frequency), 0),
        loans: activeLoans.reduce((s, l) => s + ((l.payment_amount_type === 'monthly_equivalent') ? (l.monthly_payment || 0) : (l.monthly_payment || 0) * monthlyFactor(l.payment_frequency)), 0),
      };
      monthlyOblig.total = monthlyOblig.bills + monthlyOblig.loans;

      const monthIncome = incomes.filter(i => isThisMonth(i.week_start)).reduce((s, i) => s + (i.amount || 0), 0);
      const monthPayments = payments.filter(p => isThisMonth(p.payment_date)).reduce((s, p) => s + (p.amount || 0), 0);
      const monthTxCount = tx.filter(t => isThisMonth(t.date)).length;

      const report = {
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at || null,
        profile: profile ? { preferred_name: profile.preferred_name, onboarding_complete: profile.onboarding_complete } : null,
        counts: {
          loans: loans.length, bills: bills.length, incomes: incomes.length, payments: payments.length,
          transactions: tx.length, splits: splits.length, assets: assets.length, goals: goals.length,
          banks: banks.length, snapshots: snaps.length, adjustments: adjRaw.length, budgets: budgetsRaw.length,
        },
        loans: loans.map(l => ({
          name: l.name, category: l.category, status: l.status, original_amount: l.original_amount,
          current_balance: l.current_balance, interest_rate: l.interest_rate, monthly_payment: l.monthly_payment,
          payment_frequency: l.payment_frequency, payment_amount_type: l.payment_amount_type,
          due_day: l.due_day, created_at: l.created_at,
        })),
        bills: bills.map(b => ({ name: b.name, amount: b.amount, frequency: b.payment_frequency, due_day: b.due_day, is_active: b.is_active, category: b.category, created_at: b.created_at })),
        assets: assets.map(a => ({ name: a.name, amount: a.amount, type: a.type, notes: a.notes })),
        banks: banks.map(b => ({ name: b.name, balance: b.balance, is_active: b.is_active })),
        recurringTemplates: recurringTemplates.map(t => ({ source: t.source, amount: t.amount, frequency: t.recurring_frequency, week_start: t.week_start })),
        figures: {
          monthIncome, monthPayments, monthTxCount,
          monthlyObligations: monthlyOblig,
          liveAssets, liveLiabilities, liveNetWorth,
          latestSnapshot: latestSnap ? { date: latestSnap.snapshot_date, net_worth: snapNetWorth } : null,
        },
        snapshotsLast5: snaps.slice(0, 5).map(s => ({
          date: s.snapshot_date,
          net_worth: s.net_worth != null ? s.net_worth : ((s.total_assets || 0) - (s.total_liabilities || 0)),
        })),
        findings,
      };
      if (!detail) {
        delete report.loans; delete report.bills; delete report.assets;
        delete report.banks; delete report.snapshotsLast5;
        report.recurringTemplates = report.recurringTemplates.slice(0, 3);
      }
      reports.push(report);
    }

    return Response.json({ success: true, userCount: authUsers.length, reports });
  } catch (error) {
    console.error('[auditUserIntegrity] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}