import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSupabaseAdmin } from '../../shared/supabaseClient.ts';

// Table-specific defaults for NOT NULL fields that should be optional
const TABLE_DEFAULTS = {
  assets: { notes: '' },
};

// Whitelist of tables the agent can manage
const ALLOWED_TABLES = {
  loans: ['name', 'lender', 'original_amount', 'current_balance', 'remaining_balance', 'interest_rate', 'monthly_payment', 'payment_amount_type', 'payment_frequency', 'total_payments', 'due_date', 'due_day', 'due_day_of_week', 'start_date', 'category', 'term_months', 'loan_type_attributes', 'notes', 'status'],
  bills: ['name', 'amount', 'payment_frequency', 'due_day', 'due_day_of_week', 'category', 'notes', 'is_active', 'is_paid', 'autopay', 'suggested_by_rayma', 'rayma_approval_status', 'detected_from_merchant'],
  payments: ['loan_id', 'bill_id', 'payment_type', 'amount', 'payment_date', 'note', 'description'],
  incomes: ['amount', 'source', 'frequency', 'week_start', 'note', 'is_active', 'is_recurring', 'recurring_frequency', 'recurring_active', 'recurring_source_id', 'description'],
  assets: ['name', 'amount', 'type', 'notes'],
  savings_goals: ['name', 'target_amount', 'current_saved', 'weekly_contribution', 'target_date', 'notes', 'status'],
  bank_accounts: ['name', 'institution', 'account_type', 'balance', 'currency', 'last_synced', 'plaid_account_id', 'link_method', 'notes', 'is_active', 'type'],
  transactions: ['bank_account_id', 'date', 'description', 'amount', 'category', 'type', 'notes', 'transaction_date'],
  budget_categories: ['name', 'category_key', 'monthly_limit', 'color', 'icon', 'description'],
  loan_adjustments: ['loan_id', 'amount', 'direction', 'reason', 'date', 'description'],
  net_worth_snapshots: ['snapshot_date', 'total_assets', 'total_liabilities', 'net_worth', 'description'],
  documents: ['file_url', 'file_name', 'folder', 'status', 'document_type', 'extracted_data', 'loggable', 'notes', 'scan_date', 'logged_entity_type', 'logged_entity_id', 'merchant', 'amount', 'document_date', '_analysis', 'updated_at'],
  transaction_splits: ['transaction_id', 'category', 'amount', 'date', 'description', 'note'],
  profiles: ['preferred_name', 'avatar_id', 'avatar_emoji', 'avatar_photo_url', 'preferred_currency', 'preferred_language', 'pay_frequency', 'pay_day', 'compact_mode', 'smart_alerts', 'auto_insights', 'subscription_type', 'ai_tokens_daily_limit'],
};

// Mirrors a bank account's balance onto the user's "Bank Cash" asset row so the
// asset dashboard stays in sync whenever transactions or balances change (Bug 2).
async function syncBankCashAsset(supabaseAdmin: any, uid: string, bankAccountId: string) {
  const { data: bankAccount } = await supabaseAdmin
    .from('bank_accounts')
    .select('balance')
    .eq('id', bankAccountId)
    .eq('user_id', uid)
    .single();
  if (bankAccount) {
    await supabaseAdmin
      .from('assets')
      .update({ amount: bankAccount.balance })
      .ilike('name', 'Bank Cash%')
      .eq('user_id', uid);
  }
}

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

    // Resolve Supabase UUID from Base44 user email with an exact match
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) throw usersError;
    
    // Force an exact, case-insensitive match instead of a fuzzy search
    const targetUser = usersData.users.find(u => u.email?.toLowerCase() === user.email.toLowerCase());
    
    if (!targetUser) {
      return Response.json({ error: 'Supabase user not found' }, { status: 404 });
    }
    const uid = targetUser.id;

    if (action === 'create') {
      if (!data) return Response.json({ error: 'data is required for create' }, { status: 400 });
      const allowedFields = ALLOWED_TABLES[table];
      const createWarnings: string[] = [];
      const sanitized = { user_id: uid };
      const defaults = TABLE_DEFAULTS[table] || {};
      for (const field of allowedFields) {
        if (data[field] !== undefined) sanitized[field] = data[field];
        else if (defaults[field] !== undefined) sanitized[field] = defaults[field];
      }
      // GUARDRAIL 1 (create): source-verification for loan APR + assumed due_day
      if (table === 'loans') {
        if (sanitized.interest_rate !== undefined) {
          const note = String(sanitized.notes || '');
          if (!/ESTIMATED:|VERIFIED:/i.test(note)) {
            createWarnings.push('interest_rate set without a source flag — prefix notes with "ESTIMATED:" for estimates or "VERIFIED:" for confirmed APR.');
          }
        }
        if (sanitized.due_day !== undefined && sanitized.start_date) {
          const sd = new Date(sanitized.start_date);
          if (!isNaN(sd.getTime()) && Number(sanitized.due_day) === sd.getDate()) {
            createWarnings.push('due_day matches the start_date day-of-month — verify this is the real due day, not an assumption from the start date.');
          }
        }
      }
      // GUARDRAIL 2: duplicate / zero-amount payment detection
      if (table === 'payments') {
        const amt = Number(sanitized.amount);
        if (!Number.isFinite(amt) || amt <= 0) {
          return Response.json({ error: 'Payment amount must be greater than zero. Zero or negative payments are blocked.' }, { status: 400 });
        }
        if (sanitized.loan_id && sanitized.payment_date) {
          const { data: existing } = await supabaseAdmin
            .from('payments')
            .select('id, amount, payment_date')
            .eq('user_id', uid)
            .eq('loan_id', sanitized.loan_id)
            .eq('payment_date', sanitized.payment_date)
            .eq('amount', amt);
          if (existing && existing.length > 0) {
            return Response.json({
              error: `Duplicate payment blocked: a payment of ${amt} on ${sanitized.payment_date} for this loan already exists (id: ${existing[0].id}).`,
              duplicate: existing[0],
            }, { status: 409 });
          }
        }
      }
      let { data: result, error } = await supabaseAdmin.from(table).insert([sanitized]).select().single();

      // Retry without missing columns (handles schema drift gracefully — loops for multiple missing columns)
      let retryCount = 0;
      let currentPayload = { ...sanitized };
      let strippedFields = [];
      while (error && /Could not find the .+ column/i.test(error.message) && retryCount < 5) {
        const match = error.message.match(/Could not find the ['"`]?(\w+)['"`]? column/i);
        if (!match) break;
        strippedFields.push(match[1]);
        delete currentPayload[match[1]];
        ({ data: result, error } = await supabaseAdmin.from(table).insert([currentPayload]).select().single());
        retryCount++;
      }

      // Race-window guard (Bug 1): if a duplicate payment slipped in between our
      // pre-check and the insert, the unique constraint rejects it — surface as 409.
      if (error && table === 'payments' && sanitized.loan_id && sanitized.payment_date
          && /duplicate key value violates unique constraint/i.test(error.message)) {
        const { data: existing } = await supabaseAdmin
          .from('payments')
          .select('id, amount, payment_date')
          .eq('user_id', uid)
          .eq('loan_id', sanitized.loan_id)
          .eq('payment_date', sanitized.payment_date)
          .eq('amount', Number(sanitized.amount));
        return Response.json({
          error: `Duplicate payment blocked: a payment of ${sanitized.amount} on ${sanitized.payment_date} for this loan already exists (id: ${existing?.[0]?.id}).`,
          duplicate: existing?.[0] || null,
        }, { status: 409 });
      }

      if (error) throw error;

      // When a loan payment is created, automatically decrement the loan's current_balance
      if (table === 'payments' && sanitized.payment_type === 'loan' && sanitized.loan_id && sanitized.amount) {
        try {
          const { data: loanRow } = await supabaseAdmin
            .from('loans')
            .select('current_balance')
            .eq('id', sanitized.loan_id)
            .eq('user_id', uid)
            .single();
          if (loanRow) {
            const newBalance = Math.max((loanRow.current_balance || 0) - Number(sanitized.amount), 0);
            await supabaseAdmin
              .from('loans')
              .update({ current_balance: newBalance, status: newBalance <= 0 ? 'paid_off' : 'active' })
              .eq('id', sanitized.loan_id)
              .eq('user_id', uid);
          }
        } catch (balanceErr) {
          console.error('[manageFinancialRecord] Loan balance update failed (non-fatal):', balanceErr.message);
        }
      }

      if (table === 'transactions' && sanitized.bank_account_id) {
        try { await syncBankCashAsset(supabaseAdmin, uid, sanitized.bank_account_id); }
        catch (bankErr) { console.error('[manageFinancialRecord] Bank cash asset sync failed (non-fatal):', bankErr.message); }
      }

      const responsePayload: any = { success: true, record: result };
      const createResponseWarnings: string[] = [];
      if (strippedFields.length > 0) createResponseWarnings.push(`Fields stripped due to missing DB columns: ${strippedFields.join(', ')}`);
      createResponseWarnings.push(...createWarnings);
      if (createResponseWarnings.length > 0) responsePayload.warnings = createResponseWarnings;
      return Response.json(responsePayload);
    }

    if (action === 'update') {
      if (!data) return Response.json({ error: 'data is required for update' }, { status: 400 });
      const allowedFields = ALLOWED_TABLES[table];
      const sanitized = {};
      for (const field of allowedFields) {
        if (data[field] !== undefined) sanitized[field] = data[field];
      }
      // GUARDRAIL 1 (update): APR source flag
      // GUARDRAIL 3: payment-balance reconciliation
      // GUARDRAIL 4: document-loan cross-reference
      const updateWarnings: string[] = [];
      if (table === 'loans' && record_id) {
        try {
          // GUARDRAIL 1 (update): APR source flag + assumed due_day
          if (sanitized.interest_rate !== undefined) {
            const note = String(sanitized.notes || '');
            if (!/ESTIMATED:|VERIFIED:/i.test(note)) {
              updateWarnings.push('interest_rate updated without a source flag — prefix notes with "ESTIMATED:" for estimates or "VERIFIED:" for confirmed APR.');
            }
          }
          if (sanitized.due_day !== undefined && sanitized.start_date) {
            const sd = new Date(sanitized.start_date);
            if (!isNaN(sd.getTime()) && Number(sanitized.due_day) === sd.getDate()) {
              updateWarnings.push('due_day matches the start_date day-of-month — verify this is the real due day, not an assumption from the start date.');
            }
          }
          // GUARDRAIL 3: payment-balance reconciliation.
          // Detect a balance INCREASE that matches logged payment(s) — the agent is
          // reverting a payment with a stale pre-payment document figure (Bug 3).
          if (sanitized.current_balance !== undefined) {
            const { data: loanRow } = await supabaseAdmin.from('loans')
              .select('current_balance')
              .eq('id', record_id).eq('user_id', uid).single();
            if (loanRow) {
              const stored = Number(loanRow.current_balance ?? 0);
              const stated = Number(sanitized.current_balance);
              if (stated > stored) {
                const { data: allPays } = await supabaseAdmin.from('payments')
                  .select('id, amount, payment_date')
                  .eq('user_id', uid).eq('loan_id', record_id).eq('payment_type', 'loan')
                  .order('payment_date', { ascending: false });
                const pays = (allPays || []).map((p: any) => ({ id: p.id, amount: Number(p.amount) || 0 }));
                if (pays.length > 0) {
                  const gap = Math.round((stated - stored) * 100) / 100;
                  let acc = 0;
                  const matched: any[] = [];
                  for (const p of pays) {
                    if (acc + p.amount <= gap + 0.01) {
                      acc += p.amount;
                      matched.push(p);
                      if (Math.abs(acc - gap) < 0.01) break;
                    }
                  }
                  if (Math.abs(acc - gap) < 0.01 && matched.length > 0) {
                    updateWarnings.push(`Reconciliation: new balance ${stated} exceeds current ${stored} by ${gap}, matching ${matched.length} logged payment(s) totaling ${gap}. This looks like a pre-payment figure reverting a logged payment — keeping current_balance at ${stored}.`);
                    sanitized.current_balance = stored;
                  } else {
                    updateWarnings.push(`Reconciliation: balance increasing ${stored} → ${stated} (gap ${gap}); ${pays.length} payment(s) on file do not match this gap. Verify this is a legitimate increase (e.g. new charges) and not a stale document figure.`);
                  }
                }
              }
            }
          }
          const { data: docs } = await supabaseAdmin.from('documents')
            .select('file_name, extracted_data')
            .eq('user_id', uid).eq('logged_entity_id', record_id).eq('logged_entity_type', 'loan');
          for (const d of (docs || [])) {
            const ex: any = (d as any).extracted_data || {};
            const checks = [
              { field: 'current_balance', doc: ex.current_balance ?? ex.balance, payload: sanitized.current_balance },
              { field: 'interest_rate', doc: ex.interest_rate ?? ex.apr, payload: sanitized.interest_rate },
              { field: 'original_amount', doc: ex.original_amount ?? ex.loan_amount, payload: sanitized.original_amount },
            ];
            for (const c of checks) {
              if (c.payload !== undefined && c.doc !== undefined && c.doc !== null && Number(c.doc) !== Number(c.payload)) {
                updateWarnings.push(`Doc "${d.file_name}" mismatch on ${c.field}: document says ${c.doc}, payload says ${c.payload}. Verify before trusting.`);
              }
            }
          }
        } catch (gErr) {
          console.error('[manageFinancialRecord] Guardrail check failed (non-fatal):', gErr.message);
        }
      }
      let query;
      if (table === 'profiles') {
        // profiles table uses 'user_id' as the user ID column
        query = supabaseAdmin.from(table).update(sanitized).eq('user_id', uid);
      } else {
        if (!record_id) return Response.json({ error: 'record_id is required for update' }, { status: 400 });
        query = supabaseAdmin.from(table).update(sanitized).eq('id', record_id).eq('user_id', uid);
      }
      const { data: result, error } = await query.select().single();
      if (error) throw error;

      // Asset ↔ bank balance sync (Bug 2): keep the "Bank Cash" asset mirrored
      // when a transaction or a bank account's balance is updated directly.
      if (table === 'transactions' && result?.bank_account_id) {
        try { await syncBankCashAsset(supabaseAdmin, uid, result.bank_account_id); }
        catch (bankErr) { console.error('[manageFinancialRecord] Bank cash asset sync failed (non-fatal):', bankErr.message); }
      }
      if (table === 'bank_accounts' && record_id) {
        try { await syncBankCashAsset(supabaseAdmin, uid, record_id); }
        catch (bankErr) { console.error('[manageFinancialRecord] Bank cash asset sync failed (non-fatal):', bankErr.message); }
      }

      const updateResponsePayload: any = { success: true, record: result };
      if (updateWarnings.length > 0) updateResponsePayload.warnings = updateWarnings;
      return Response.json(updateResponsePayload);
    }

    if (action === 'delete') {
      if (!record_id) return Response.json({ error: 'record_id is required for delete' }, { status: 400 });

      // For transactions, capture the linked bank account before deleting so we
      // can re-sync the "Bank Cash" asset afterward (Bug 2).
      let deletedBankAccountId: string | null = null;
      if (table === 'transactions') {
        const { data: tx } = await supabaseAdmin.from('transactions')
          .select('bank_account_id').eq('id', record_id).eq('user_id', uid).single();
        deletedBankAccountId = tx?.bank_account_id || null;
      }

      const { error } = await supabaseAdmin.from(table).delete().eq('id', record_id).eq('user_id', uid);
      if (error) throw error;

      if (table === 'transactions' && deletedBankAccountId) {
        try { await syncBankCashAsset(supabaseAdmin, uid, deletedBankAccountId); }
        catch (bankErr) { console.error('[manageFinancialRecord] Bank cash asset sync failed (non-fatal):', bankErr.message); }
      }

      return Response.json({ success: true, deleted: record_id });
    }
  } catch (error) {
    console.error('[manageFinancialRecord] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});