import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSupabaseAdmin } from '../../shared/supabaseClient.ts';

/**
 * Adds missing columns to the documents table.
 * Tries multiple approaches to execute DDL since PostgREST doesn't support ALTER TABLE:
 * 1. Calls an exec_sql RPC function if one exists
 * 2. Falls back to the Supabase pg/query endpoint
 * 3. Returns the SQL for manual execution if both fail
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const { client: supabase } = getSupabaseAdmin();
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const sql = `
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder TEXT DEFAULT 'misc';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending_review';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS extracted_data JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_type TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS loggable BOOLEAN DEFAULT true;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS logged_entity_type TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS logged_entity_id TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS scan_date DATE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
`.trim();

    // Approach 1: Try calling an exec_sql RPC function (if one exists in the DB)
    const rpcResult = await supabase.rpc('exec_sql', { sql }).then(r => ({ ok: !r.error, ...r })).catch(() => ({ ok: false }));

    if (rpcResult.ok) {
      return Response.json({ success: true, method: 'rpc_exec_sql', message: 'Documents schema fixed via exec_sql RPC.' });
    }

    // Approach 2: Try the Supabase pg/query endpoint (used by Studio in some configs)
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
        return Response.json({ success: true, method: 'pg_query', message: 'Documents schema fixed via pg/query endpoint.' });
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
    console.error('[fixDocumentsSchema] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});