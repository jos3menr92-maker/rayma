import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSupabaseAdmin } from '../../shared/supabaseClient.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { client: supabaseAdmin } = getSupabaseAdmin();

    // Resolve Supabase UUID from Base44 user email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ search: user.email });
    if (listError) throw listError;
    const supabaseUser = users.find(u => u.email === user.email);
    if (!supabaseUser) {
      return Response.json({ error: 'Supabase user not found for email: ' + user.email }, { status: 404 });
    }
    const uid = supabaseUser.id;
    const now = new Date();
    const isoDate = (d) => d.toISOString().split('T')[0];
    const results = {};

    // --- Bank Accounts ---
    const bankAccounts = [
      { user_id: uid, name: 'Chase Checking', institution: 'Chase', account_type: 'checking', balance: 4250.75, currency: 'USD', link_method: 'manual', is_active: true, last_synced: isoDate(now) },
      { user_id: uid, name: 'Ally Savings', institution: 'Ally', account_type: 'savings', balance: 18500.00, currency: 'USD', link_method: 'manual', is_active: true, last_synced: isoDate(now) },
      { user_id: uid, name: 'Amex Gold Card', institution: 'American Express', account_type: 'credit', balance: -1245.30, currency: 'USD', link_method: 'manual', is_active: true, last_synced: isoDate(now) },
      { user_id: uid, name: 'Fidelity Brokerage', institution: 'Fidelity', account_type: 'investment', balance: 32100.50, currency: 'USD', link_method: 'manual', is_active: true, last_synced: isoDate(now) },
    ];
    const { error: baErr } = await supabaseAdmin.from('bank_accounts').insert(bankAccounts);
    results.bank_accounts = baErr ? `Error: ${baErr.message}` : `${bankAccounts.length} rows inserted`;

    // --- Loans ---
    const loans = [
      { user_id: uid, name: 'Honda Civic Auto Loan', lender: 'Honda Financial', original_amount: 28000, current_balance: 18500, interest_rate: 5.9, monthly_payment: 480, payment_frequency: 'monthly', due_day: 15, start_date: '2024-03-15', category: 'auto', status: 'active' },
      { user_id: uid, name: 'Sallie Mae Student Loan', lender: 'Sallie Mae', original_amount: 45000, current_balance: 32000, interest_rate: 6.8, monthly_payment: 380, payment_frequency: 'monthly', due_day: 5, start_date: '2022-09-01', category: 'student', status: 'active' },
      { user_id: uid, name: 'Discover Personal Loan', lender: 'Discover', original_amount: 8000, current_balance: 3200, interest_rate: 11.5, monthly_payment: 250, payment_frequency: 'monthly', due_day: 22, start_date: '2025-01-10', category: 'personal', status: 'active' },
    ];
    const { error: lnErr } = await supabaseAdmin.from('loans').insert(loans);
    results.loans = lnErr ? `Error: ${lnErr.message}` : `${loans.length} rows inserted`;

    // --- Bills ---
    const bills = [
      { user_id: uid, name: 'Netflix', amount: 15.49, payment_frequency: 'monthly', due_day: 1, category: 'subscriptions', is_active: true },
      { user_id: uid, name: 'Electric Bill', amount: 125.00, payment_frequency: 'monthly', due_day: 18, category: 'utilities', is_active: true },
      { user_id: uid, name: 'Rent', amount: 1450.00, payment_frequency: 'monthly', due_day: 1, category: 'rent', is_active: true },
      { user_id: uid, name: 'Car Insurance', amount: 95.00, payment_frequency: 'monthly', due_day: 10, category: 'insurance', is_active: true },
      { user_id: uid, name: 'Gym Membership', amount: 39.99, payment_frequency: 'monthly', due_day: 15, category: 'subscriptions', is_active: true },
      { user_id: uid, name: 'Internet (Comcast)', amount: 79.99, payment_frequency: 'monthly', due_day: 20, category: 'utilities', is_active: true },
    ];
    const { error: blErr } = await supabaseAdmin.from('bills').insert(bills);
    results.bills = blErr ? `Error: ${blErr.message}` : `${bills.length} rows inserted`;

    // --- Transactions (last 30 days) ---
    const transactions = [];
    const txnData = [
      { desc: 'Paycheck Deposit', amt: 2400, cat: 'income', type: 'credit' },
      { desc: 'Whole Foods', amt: -87.45, cat: 'food', type: 'debit' },
      { desc: 'Shell Gas Station', amt: -52.30, cat: 'transport', type: 'debit' },
      { desc: 'Netflix', amt: -15.49, cat: 'subscriptions', type: 'debit' },
      { desc: 'Starbucks', amt: -6.75, cat: 'food', type: 'debit' },
      { desc: 'Amazon Purchase', amt: -34.99, cat: 'shopping', type: 'debit' },
      { desc: 'Electric Bill', amt: -125.00, cat: 'utilities', type: 'debit' },
      { desc: 'Paycheck Deposit', amt: 2400, cat: 'income', type: 'credit' },
      { desc: 'Chipotle', amt: -14.50, cat: 'food', type: 'debit' },
      { desc: 'Uber Ride', amt: -18.40, cat: 'transport', type: 'debit' },
      { desc: 'Spotify', amt: -9.99, cat: 'subscriptions', type: 'debit' },
      { desc: 'Target', amt: -45.67, cat: 'shopping', type: 'debit' },
      { desc: 'CVS Pharmacy', amt: -22.15, cat: 'health', type: 'debit' },
      { desc: 'Rent Payment', amt: -1450, cat: 'rent', type: 'debit' },
      { desc: 'Freelance Income', amt: 500, cat: 'income', type: 'credit' },
      { desc: 'AT&T Phone Bill', amt: -65.00, cat: 'utilities', type: 'debit' },
      { desc: 'Shell Gas Station', amt: -48.90, cat: 'transport', type: 'debit' },
      { desc: 'Trader Joes', amt: -62.30, cat: 'food', type: 'debit' },
      { desc: 'Movie Tickets', amt: -28.00, cat: 'entertainment', type: 'debit' },
      { desc: 'Car Insurance', amt: -95.00, cat: 'insurance', type: 'debit' },
    ];
    for (let i = 0; i < txnData.length; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - (i * 1.5 | 0));
      transactions.push({
        user_id: uid, bank_account_id: null, date: isoDate(d),
        description: txnData[i].desc, amount: txnData[i].amt,
        category: txnData[i].cat, type: txnData[i].type, notes: 'Test transaction'
      });
    }
    const { error: txErr } = await supabaseAdmin.from('transactions').insert(transactions);
    results.transactions = txErr ? `Error: ${txErr.message}` : `${transactions.length} rows inserted`;

    // --- Assets ---
    const assets = [
      { user_id: uid, name: 'Checking Account', amount: 4250.75, type: 'cash' },
      { user_id: uid, name: 'Savings Account', amount: 18500.00, type: 'savings' },
      { user_id: uid, name: '401k Retirement', amount: 52300.00, type: 'investment' },
      { user_id: uid, name: 'Honda Civic', amount: 12500.00, type: 'property' },
      { user_id: uid, name: 'Emergency Fund', amount: 6000.00, type: 'savings' },
    ];
    const { error: asErr } = await supabaseAdmin.from('assets').insert(assets);
    results.assets = asErr ? `Error: ${asErr.message}` : `${assets.length} rows inserted`;

    // --- Savings Goals ---
    const savingsGoals = [
      { user_id: uid, name: 'Emergency Fund', target_amount: 10000, current_saved: 6000, weekly_contribution: 100, target_date: '2026-12-31', status: 'active' },
      { user_id: uid, name: 'Vacation to Japan', target_amount: 5000, current_saved: 1800, weekly_contribution: 75, target_date: '2027-03-01', status: 'active' },
      { user_id: uid, name: 'New Laptop', target_amount: 2000, current_saved: 800, weekly_contribution: 50, target_date: '2026-10-01', status: 'active' },
    ];
    const { error: sgErr } = await supabaseAdmin.from('savings_goals').insert(savingsGoals);
    results.savings_goals = sgErr ? `Error: ${sgErr.message}` : `${savingsGoals.length} rows inserted`;

    // --- Incomes ---
    const incomes = [
      { user_id: uid, amount: 2400, week_start: isoDate(now), note: 'Bi-weekly paycheck' },
      { user_id: uid, amount: 2400, week_start: isoDate(new Date(now.getTime() - 14 * 86400000)), note: 'Bi-weekly paycheck' },
      { user_id: uid, amount: 500, week_start: isoDate(new Date(now.getTime() - 7 * 86400000)), note: 'Freelance project' },
    ];
    const { error: incErr } = await supabaseAdmin.from('incomes').insert(incomes);
    results.incomes = incErr ? `Error: ${incErr.message}` : `${incomes.length} rows inserted`;

    // --- Payments ---
    const payments = [
      { user_id: uid, payment_type: 'loan', amount: 480, payment_date: isoDate(new Date(now.getTime() - 5 * 86400000)), note: 'Honda auto loan payment' },
      { user_id: uid, payment_type: 'bill', amount: 1450, payment_date: isoDate(new Date(now.getTime() - 3 * 86400000)), note: 'Monthly rent' },
      { user_id: uid, payment_type: 'bill', amount: 125, payment_date: isoDate(now), note: 'Electric bill' },
    ];
    const { error: payErr } = await supabaseAdmin.from('payments').insert(payments);
    results.payments = payErr ? `Error: ${payErr.message}` : `${payments.length} rows inserted`;

    // --- Net Worth Snapshot ---
    const netWorth = {
      user_id: uid, snapshot_date: isoDate(now),
      total_assets: 93800.75, total_liabilities: 53700.00, net_worth: 40100.75
    };
    const { error: nwErr } = await supabaseAdmin.from('net_worth_snapshots').insert(netWorth);
    results.net_worth_snapshots = nwErr ? `Error: ${nwErr.message}` : '1 row inserted';

    return Response.json({ success: true, user_id: uid, seeded: results });
  } catch (error) {
    console.error('[seedTestData] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});