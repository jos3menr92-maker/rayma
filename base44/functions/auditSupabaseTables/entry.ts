import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSupabaseAdmin } from '../../shared/supabaseClient.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { client: supabase } = getSupabaseAdmin();

    // Column-level verification for previously-mismatched tables
    const columnTests = {
      budget_categories: ['user_id', 'created_at', 'category_key', 'monthly_limit', 'color', 'icon', 'name'],
      loan_adjustments: ['user_id', 'created_at', 'loan_id', 'direction', 'date', 'amount'],
      user_memories: ['user_id', 'created_at', 'memory_type', 'content'],
      arcade_scores: ['user_id', 'created_at', 'score', 'game'],
      promo_redemptions: ['user_id', 'redeemed_at', 'created_at', 'promo_code_id'],
      bank_accounts: ['user_id', 'created_at', 'name', 'institution', 'account_type', 'balance', 'last_synced'],
    };

    const schemaResults = {};
    for (const [table, columns] of Object.entries(columnTests)) {
      schemaResults[table] = {};
      for (const col of columns) {
        const { error } = await supabase.from(table).select(col).limit(1);
        if (error && error.code === '42703') {
          schemaResults[table][col] = 'MISSING';
        } else if (error && error.code === '42501') {
          schemaResults[table][col] = 'RLS_BLOCKED';
        } else {
          schemaResults[table][col] = 'OK';
        }
      }
    }

    // Full 19-table connectivity check
    const tables = [
      'loans', 'bills', 'incomes', 'payments', 'transactions',
      'assets', 'savings_goals', 'transaction_splits', 'profiles',
      'bank_accounts', 'documents', 'budget_categories',
      'arcade_scores', 'net_worth_snapshots', 'feedback',
      'promo_codes', 'promo_redemptions', 'loan_adjustments',
      'user_memories'
    ];

    const tableResults = {};
    for (const table of tables) {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (error) {
        tableResults[table] = { status: 'ERROR', code: error.code, error: error.message };
      } else {
        tableResults[table] = { status: 'OK', rowCount: count, columnCount: data?.[0] ? Object.keys(data[0]).length : 0 };
      }
    }

    const okCount = Object.values(tableResults).filter((r: any) => r.status === 'OK').length;
    const errorTables = Object.entries(tableResults).filter(([, r]: [string, any]) => r.status === 'ERROR');

    return Response.json({
      success: true,
      summary: { total: tables.length, ok: okCount, errors: errorTables.length },
      schemaResults,
      tableResults,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}