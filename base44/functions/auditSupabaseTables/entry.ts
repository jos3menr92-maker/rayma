import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSupabaseAdmin } from '../../shared/supabaseClient.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { client: supabase } = getSupabaseAdmin();

    // Re-test the two fixed queries + verify all 19 tables load
    const tables = [
      'loans', 'bills', 'incomes', 'payments', 'transactions',
      'assets', 'savings_goals', 'transaction_splits', 'profiles',
      'bank_accounts', 'documents', 'budget_categories',
      'arcade_scores', 'net_worth_snapshots', 'feedback',
      'promo_codes', 'promo_redemptions', 'loan_adjustments',
      'user_memories'
    ];

    const results = {};
    for (const table of tables) {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (error) {
        results[table] = { status: 'ERROR', error: error.message, code: error.code };
      } else {
        results[table] = { status: 'OK', rowCount: count, columns: data?.[0] ? Object.keys(data[0]).length : 0 };
      }
    }

    const ok = Object.values(results).filter((r: any) => r.status === 'OK').length;
    const errors = Object.entries(results).filter(([, r]: [string, any]) => r.status === 'ERROR');

    return Response.json({
      success: true,
      summary: { total: tables.length, ok, errors: errors.length },
      errorDetails: errors.map(([name, r]: [string, any]) => ({ table: name, ...r })),
      allTables: results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}