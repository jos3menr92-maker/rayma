import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSupabaseAdmin } from '../../shared/supabaseClient.ts';

/**
 * Adds missing columns across financial tables that the app expects but the
 * Supabase schema is missing. Follows the same multi-approach pattern as
 * fixDocumentsSchema: exec_sql RPC → pg/query endpoint → manual SQL.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { client: supabase } = getSupabaseAdmin();
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const sql = `
ALTER TABLE loan_adjustments ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE loan_adjustments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS target_date DATE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS bank_account_id UUID;
ALTER TABLE net_worth_snapshots ADD COLUMN IF NOT EXISTS net_worth NUMERIC;
ALTER TABLE net_worth_snapshots ADD COLUMN IF NOT EXISTS total_assets NUMERIC;
ALTER TABLE net_worth_snapshots ADD COLUMN IF NOT EXISTS total_liabilities NUMERIC;
    `.trim();

    // Approach 1: Try calling an exec_sql RPC function (if one exists in the DB)
    const rpcResult = await supabase.rpc('exec_sql', { sql }).then(r => ({ ok: !r.error, ...r })).catch(() => ({ ok: false }));

    if (rpcResult.ok) {
      return Response.json({ success: true, method: 'rpc_exec_sql', message: 'Schema columns fixed via exec_sql RPC.' });
    }

    // Approach 2: Try the Supabase pg/query endpoint
    try {
      const pgResponse = await fetch(`${supabaseUrl}/pg/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      });

      if (pgResponse.ok) {
        return Response.json({ success: true, method: 'pg_query', message: 'Schema columns fixed via pg/query endpoint.' });
      }
    } catch (_) { /* fall through to manual */ }

    // Approach 3: Return the SQL for manual execution
    return Response.json({
      success: false,
      requiresManualExecution: true,
      message: 'Could not run DDL automatically. Please run the SQL below in your Supabase SQL Editor (Dashboard → SQL Editor → New Query).',
      sql,
    });
  } catch (error) {
    console.error('[fixSchemaColumns] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});