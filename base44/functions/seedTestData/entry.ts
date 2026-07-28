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

    // --- Bank Accounts (columns: id, user_id, name, balance, created_at) ---
    const bankAccounts = [
      { user_id: uid, name: 'Chase Checking', balance: 4250.75 },
      { user_id: uid, name: 'Ally Savings', balance: 18500.00 },
      { user_id: uid, name: 'Amex Gold Card', balance: -1245.30 },
      { user_id: uid, name: 'Fidelity Brokerage', balance: 32100.50 },
    ];
    const { error: baErr } = await supabaseAdmin.from('bank_accounts').insert(bankAccounts);
    results.bank_accounts = baErr ? `Error: ${baErr.message}` : `${bankAccounts.length} rows inserted`;

    // --- Loans (columns: id, user_id, name, original_amount, current_balance, interest_rate, monthly_payment, payment_frequency, start_date, status, created_at) ---
    const loans = [
      { user_id: uid, name: 'Honda Civic Auto Loan', original_amount: 28000, remaining_balance: 18500, interest_rate: 5.9, monthly_payment: 480, payment_frequency: 'monthly', status: 'active' },
      { user_id: uid, name: 'Sallie Mae Student Loan', original_amount: 45000, remaining_balance: 32000, interest_rate: 6.8, monthly_payment: 380, payment_frequency: 'monthly', status: 'active' },
      { user_id: uid, name: 'Discover Personal Loan', original_amount: 8000, remaining_balance: 3200, interest_rate: 11.5, monthly_payment: 250, payment_frequency: 'monthly', status: 'active' },
    ];
    const { error: lnErr } = await supabaseAdmin.from('loans').insert(loans);
    results.loans = lnErr ? `Error: ${lnErr.message}` : `${loans.length} rows inserted`;

    // --- Bills (columns: id, user_id, name, is_paid, payment_frequency, due_day, due_day_of_week, category, notes, is_active, autopay, amount, created_at) ---
    const bills = [
      { user_id: uid, name: 'Netflix', amount: 15.49, payment_frequency: 'monthly', due_day: 1, category: 'subscriptions', is_active: true, is_paid: false },
      { user_id: uid, name: 'Electric Bill', amount: 125.00, payment_frequency: 'monthly', due_day: 18, category: 'utilities', is_active: true, is_paid: false },
      { user_id: uid, name: 'Rent', amount: 1450.00, payment_frequency: 'monthly', due_day: 1, category: 'rent', is_active: true, is_paid: true },
      { user_id: uid, name: 'Car Insurance', amount: 95.00, payment_frequency: 'monthly', due_day: 10, category: 'insurance', is_active: true, is_paid: false },
      { user_id: uid, name: 'Gym Membership', amount: 39.99, payment_frequency: 'monthly', due_day: 15, category: 'subscriptions', is_active: true, is_paid: false },
      { user_id: uid, name: 'Internet (Comcast)', amount: 79.99, payment_frequency: 'monthly', due_day: 20, category: 'utilities', is_active: true, is_paid: false },
    ];
    const { error: blErr } = await supabaseAdmin.from('bills').insert(bills);
    results.bills = blErr ? `Error: ${blErr.message}` : `${bills.length} rows inserted`;

    // --- Transactions (columns: id, user_id, description, amount, type, notes, created_at — NO date column) ---
    const txnData = [
      { desc: 'Paycheck Deposit', amt: 2400, type: 'credit' },
      { desc: 'Whole Foods', amt: -87.45, type: 'debit' },
      { desc: 'Shell Gas Station', amt: -52.30, type: 'debit' },
      { desc: 'Netflix', amt: -15.49, type: 'debit' },
      { desc: 'Starbucks', amt: -6.75, type: 'debit' },
      { desc: 'Amazon Purchase', amt: -34.99, type: 'debit' },
      { desc: 'Electric Bill', amt: -125.00, type: 'debit' },
      { desc: 'Paycheck Deposit', amt: 2400, type: 'credit' },
      { desc: 'Chipotle', amt: -14.50, type: 'debit' },
      { desc: 'Uber Ride', amt: -18.40, type: 'debit' },
      { desc: 'Spotify', amt: -9.99, type: 'debit' },
      { desc: 'Target', amt: -45.67, type: 'debit' },
      { desc: 'CVS Pharmacy', amt: -22.15, type: 'debit' },
      { desc: 'Rent Payment', amt: -1450, type: 'debit' },
      { desc: 'Freelance Income', amt: 500, type: 'credit' },
      { desc: 'AT&T Phone Bill', amt: -65.00, type: 'debit' },
      { desc: 'Shell Gas Station', amt: -48.90, type: 'debit' },
      { desc: 'Trader Joes', amt: -62.30, type: 'debit' },
      { desc: 'Movie Tickets', amt: -28.00, type: 'debit' },
      { desc: 'Car Insurance', amt: -95.00, type: 'debit' },
    ];
    const transactions = txnData.map(t => ({
      user_id: uid, description: t.desc, amount: t.amt
    }));
    const { error: txErr } = await supabaseAdmin.from('transactions').insert(transactions);
    results.transactions = txErr ? `Error: ${txErr.message}` : `${transactions.length} rows inserted`;

    // --- Assets (columns: id, created_at, user_id, name, amount, type, notes) ---
    const assets = [
      { user_id: uid, name: 'Checking Account', amount: 4250.75, type: 'cash', notes: 'Test asset' },
      { user_id: uid, name: 'Savings Account', amount: 18500.00, type: 'savings', notes: 'Test asset' },
      { user_id: uid, name: '401k Retirement', amount: 52300.00, type: 'investment', notes: 'Test asset' },
      { user_id: uid, name: 'Honda Civic', amount: 12500.00, type: 'property', notes: 'Test asset' },
      { user_id: uid, name: 'Emergency Fund', amount: 6000.00, type: 'savings', notes: 'Test asset' },
    ];
    const { error: asErr } = await supabaseAdmin.from('assets').insert(assets);
    results.assets = asErr ? `Error: ${asErr.message}` : `${assets.length} rows inserted`;

    // --- Savings Goals (columns: id, created_at, name, target_amount, current_saved, notes — NO user_id) ---
    const savingsGoals = [
      { name: 'Emergency Fund', target_amount: 10000, current_saved: 6000, notes: 'Test goal' },
      { name: 'Vacation to Japan', target_amount: 5000, current_saved: 1800, notes: 'Test goal' },
      { name: 'New Laptop', target_amount: 2000, current_saved: 800, notes: 'Test goal' },
    ];
    const { error: sgErr } = await supabaseAdmin.from('savings_goals').insert(savingsGoals);
    results.savings_goals = sgErr ? `Error: ${sgErr.message}` : `${savingsGoals.length} rows inserted`;

    // --- Incomes (columns: id, user_id, source, amount, frequency, created_at, week_start, note, is_active) ---
    const incomes = [
      { user_id: uid, amount: 2400, source: 'Employment', frequency: 'biweekly', week_start: isoDate(now), note: 'Bi-weekly paycheck', is_active: true },
      { user_id: uid, amount: 2400, source: 'Employment', frequency: 'biweekly', week_start: isoDate(new Date(now.getTime() - 14 * 86400000)), note: 'Bi-weekly paycheck', is_active: true },
      { user_id: uid, amount: 500, source: 'Freelance', frequency: 'one_time', week_start: isoDate(new Date(now.getTime() - 7 * 86400000)), note: 'Freelance project', is_active: true },
    ];
    const { error: incErr } = await supabaseAdmin.from('incomes').insert(incomes);
    results.incomes = incErr ? `Error: ${incErr.message}` : `${incomes.length} rows inserted`;

    // --- Payments (columns: id, created_at, loan_id, amount, payment_date, note, user_id, bill_id, payment_type) ---
    const payments = [
      { user_id: uid, payment_type: 'bill', amount: 1450, payment_date: isoDate(new Date(now.getTime() - 3 * 86400000)), note: 'Monthly rent' },
      { user_id: uid, payment_type: 'bill', amount: 125, payment_date: isoDate(now), note: 'Electric bill' },
    ];
    const { error: payErr } = await supabaseAdmin.from('payments').insert(payments);
    results.payments = payErr ? `Error: ${payErr.message}` : `${payments.length} rows inserted`;

    // --- Net Worth Snapshots (columns: id, created_at, user_id, total_assets, total_liabilities, snapshot_date) ---
    const netWorth = [
      { user_id: uid, snapshot_date: isoDate(now), total_assets: 93800.75, total_liabilities: 53700.00 },
      { user_id: uid, snapshot_date: '2026-06-28', total_assets: 89000.00, total_liabilities: 56000.00 },
      { user_id: uid, snapshot_date: '2026-05-28', total_assets: 85000.00, total_liabilities: 58000.00 },
    ];
    const { error: nwErr } = await supabaseAdmin.from('net_worth_snapshots').insert(netWorth);
    results.net_worth_snapshots = nwErr ? `Error: ${nwErr.message}` : `${netWorth.length} rows inserted`;

    return Response.json({ success: true, user_id: uid, seeded: results });
  } catch (error) {
    console.error('[seedTestData] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});