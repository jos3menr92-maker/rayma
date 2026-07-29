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
      return Response.json({ error: 'Supabase user not found' }, { status: 404 });
    }
    const uid = supabaseUser.id;

    // Fetch all financial tables in parallel
    const [
      loansRes, billsRes, paymentsRes, incomesRes, assetsRes,
      savingsGoalsRes, bankAccountsRes, transactionsRes, netWorthRes,
      budgetCategoriesRes, loanAdjustmentsRes, documentsRes
    ] = await Promise.all([
      supabaseAdmin.from('loans').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabaseAdmin.from('bills').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabaseAdmin.from('payments').select('*').eq('user_id', uid).order('payment_date', { ascending: false }).limit(100),
      supabaseAdmin.from('incomes').select('*').eq('user_id', uid).order('week_start', { ascending: false }).limit(50),
      supabaseAdmin.from('assets').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabaseAdmin.from('savings_goals').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabaseAdmin.from('bank_accounts').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabaseAdmin.from('transactions').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(200),
      supabaseAdmin.from('net_worth_snapshots').select('*').eq('user_id', uid).order('snapshot_date', { ascending: false }).limit(12),
      supabaseAdmin.from('budget_categories').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabaseAdmin.from('loan_adjustments').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(50),
      supabaseAdmin.from('documents').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
    ]);

    return Response.json({
      success: true,
      user_email: user.email,
      loans: loansRes.data || [],
      bills: billsRes.data || [],
      payments: paymentsRes.data || [],
      incomes: incomesRes.data || [],
      assets: assetsRes.data || [],
      savings_goals: savingsGoalsRes.data || [],
      bank_accounts: bankAccountsRes.data || [],
      transactions: transactionsRes.data || [],
      net_worth_snapshots: netWorthRes.data || [],
      budget_categories: budgetCategoriesRes.data || [],
      loan_adjustments: loanAdjustmentsRes.data || [],
      documents: documentsRes.data || [],
    });
  } catch (error) {
    console.error('[getFinancialData] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});