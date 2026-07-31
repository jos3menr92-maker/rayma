import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSupabaseAdmin } from '../../shared/supabaseClient.ts';

// Table-specific defaults for NOT NULL fields that should be optional
const TABLE_DEFAULTS = {
  assets: { notes: '' },
};

// Whitelist of tables the agent can manage
const ALLOWED_TABLES = {
  loans: ['name', 'lender', 'original_amount', 'current_balance', 'remaining_balance', 'interest_rate', 'monthly_payment', 'payment_frequency', 'total_payments', 'due_date', 'due_day', 'due_day_of_week', 'start_date', 'category', 'notes', 'status'],
  bills: ['name', 'amount', 'payment_frequency', 'due_day', 'due_day_of_week', 'category', 'notes', 'is_active', 'is_paid', 'autopay', 'suggested_by_rayma', 'rayma_approval_status', 'detected_from_merchant'],
  payments: ['loan_id', 'bill_id', 'payment_type', 'amount', 'payment_date', 'note', 'description'],
  incomes: ['amount', 'source', 'frequency', 'week_start', 'note', 'is_active', 'is_recurring', 'recurring_frequency', 'recurring_active', 'recurring_source_id', 'description'],
  assets: ['name', 'amount', 'type', 'notes'],
  savings_goals: ['name', 'target_amount', 'current_saved', 'weekly_contribution', 'target_date', 'notes', 'status'],
  bank_accounts: ['name', 'institution', 'account_type', 'balance', 'currency', 'last_synced', 'plaid_account_id', 'link_method', 'notes', 'is_active'],
  transactions: ['bank_account_id', 'date', 'description', 'amount', 'category', 'type', 'notes'],
  budget_categories: ['name', 'category_key', 'monthly_limit', 'color', 'icon', 'description'],
  loan_adjustments: ['loan_id', 'amount', 'direction', 'reason', 'date', 'description'],
  net_worth_snapshots: ['snapshot_date', 'total_assets', 'total_liabilities', 'net_worth', 'description'],
  documents: ['file_url', 'file_name', 'folder', 'status', 'document_type', 'extracted_data', 'loggable', 'notes', 'scan_date', 'logged_entity_type', 'logged_entity_id'],
  transaction_splits: ['transaction_id', 'category', 'amount', 'date', 'description', 'note'],
  profiles: ['preferred_name', 'avatar_id', 'avatar_emoji', 'avatar_photo_url', 'preferred_currency', 'preferred_language', 'pay_frequency', 'pay_day', 'compact_mode', 'smart_alerts', 'auto_insights', 'subscription_type', 'ai_tokens_daily_limit'],
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, table, data, record_id } = body;

    if (!action || !table) {
      return Response.json({ error: 'action and table are required' }, { status: 400 });
    }
    if (!['create', 'update', 'delete'].includes(action)) {
      return Response.json({ error: 'Invalid action. Use create, update, or delete.' }, { status: 400 });
    }
    if (!ALLOWED_TABLES[table]) {
      return Response.json({ error: `Table '${table}' is not allowed. Allowed: ${Object.keys(ALLOWED_TABLES).join(', ')}` }, { status: 400 });
    }

    const { client: supabaseAdmin } = getSupabaseAdmin();

    // Resolve Supabase UUID from Base44 user email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ search: user.email });
    if (listError) throw listError;
    const supabaseUser = users.find(u => u.email === user.email);
    if (!supabaseUser) {
      return Response.json({ error: 'Supabase user not found' }, { status: 404 });
    }
    const uid = supabaseUser.id;

    if (action === 'create') {
      if (!data) return Response.json({ error: 'data is required for create' }, { status: 400 });
      const allowedFields = ALLOWED_TABLES[table];
      const sanitized = { user_id: uid };
      const defaults = TABLE_DEFAULTS[table] || {};
      for (const field of allowedFields) {
        if (data[field] !== undefined) sanitized[field] = data[field];
        else if (defaults[field] !== undefined) sanitized[field] = defaults[field];
      }
      let { data: result, error } = await supabaseAdmin.from(table).insert([sanitized]).select().single();

      // Retry without missing columns (handles schema drift gracefully — loops for multiple missing columns)
      let retryCount = 0;
      let currentPayload = { ...sanitized };
      while (error && /Could not find the .+ column/i.test(error.message) && retryCount < 5) {
        const match = error.message.match(/Could not find the ['"`]?(\w+)['"`]? column/i);
        if (!match) break;
        delete currentPayload[match[1]];
        ({ data: result, error } = await supabaseAdmin.from(table).insert([currentPayload]).select().single());
        retryCount++;
      }

      if (error) throw error;
      return Response.json({ success: true, record: result });
    }

    if (action === 'update') {
      if (!data) return Response.json({ error: 'data is required for update' }, { status: 400 });
      const allowedFields = ALLOWED_TABLES[table];
      const sanitized = {};
      for (const field of allowedFields) {
        if (data[field] !== undefined) sanitized[field] = data[field];
      }
      let query;
      if (table === 'profiles') {
        // profiles table uses 'id' as the user ID column (no separate user_id)
        query = supabaseAdmin.from(table).update(sanitized).eq('id', uid);
      } else {
        if (!record_id) return Response.json({ error: 'record_id is required for update' }, { status: 400 });
        query = supabaseAdmin.from(table).update(sanitized).eq('id', record_id).eq('user_id', uid);
      }
      const { data: result, error } = await query.select().single();
      if (error) throw error;
      return Response.json({ success: true, record: result });
    }

    if (action === 'delete') {
      if (!record_id) return Response.json({ error: 'record_id is required for delete' }, { status: 400 });
      const { error } = await supabaseAdmin.from(table).delete().eq('id', record_id).eq('user_id', uid);
      if (error) throw error;
      return Response.json({ success: true, deleted: record_id });
    }
  } catch (error) {
    console.error('[manageFinancialRecord] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});