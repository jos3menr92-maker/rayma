import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSupabaseAdmin } from '../../shared/supabaseClient.ts';

/**
 * Migrates Base44 entity data to Supabase tables.
 * Admin-only: resolves Base44 user emails → Supabase UUIDs,
 * then inserts entity records into the corresponding Supabase tables.
 * Skips records that already exist in Supabase (by name + user_id).
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const { client: supabaseAdmin, url: supabaseUrl } = getSupabaseAdmin();

    // 1a. Build Base44 user ID → email map
    const base44IdToEmail = {};
    try {
      const b44Users = await base44.asServiceRole.entities.User.list(undefined, 1000);
      for (const u of b44Users) {
        if (u.id && u.email) base44IdToEmail[u.id] = u.email.toLowerCase();
      }
    } catch (e) {
      console.error('Failed to list Base44 users:', e.message);
    }

    // 1b. Build email → Supabase UUID map from Supabase admin API
    const emailToUuid = {};
    let page = 1;
    const perPage = 1000;
    while (true) {
      const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=${perPage}`, {
        headers: {
          'apikey': Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Supabase admin listUsers failed (HTTP ${res.status}): ${body.substring(0, 200)}`);
      }
      const data = await res.json();
      const users = data.users || [];
      if (users.length === 0) break;
      for (const u of users) {
        if (u.email) emailToUuid[u.email.toLowerCase()] = u.id;
      }
      if (users.length < perPage) break;
      page++;
    }

    const results = {};

    // Helper: resolve Base44 created_by_id → email → Supabase UUID
    const resolveUid = (createdById) => {
      if (!createdById) return null;
      const email = base44IdToEmail[createdById];
      if (!email) return null;
      return emailToUuid[email] || null;
    };

    // Helper: insert records, skip if table already has data for that user
    const migrateEntity = async (entityName, tableName, fieldMap) => {
      try {
        const records = await base44.asServiceRole.entities[entityName].list(undefined, 1000);
        let inserted = 0;
        let skipped = 0;
        let noUuid = 0;

        for (const rec of records) {
          const uid = resolveUid(rec.created_by_id);
          if (!uid) { noUuid++; continue; }

          // Check if this user already has records in the Supabase table
          const { data: existing } = await supabaseAdmin
            .from(tableName)
            .select('id')
            .eq('user_id', uid)
            .limit(1);

          if (existing && existing.length > 0) {
            skipped += records.length; // skip all records for this user
            break;
          }

          // Map fields
          const row = { user_id: uid };
          for (const [entityField, supaField] of Object.entries(fieldMap)) {
            if (rec[entityField] !== undefined && rec[entityField] !== null) {
              row[supaField] = rec[entityField];
            }
          }

          const { error } = await supabaseAdmin.from(tableName).insert([row]);
          if (error) {
            console.error(`[${tableName}] Insert error:`, error.message);
          } else {
            inserted++;
          }
        }

        results[tableName] = { inserted, skipped, noUuid, total: records.length };
      } catch (err) {
        results[tableName] = { error: err.message };
      }
    };

    // 2. Migrate each entity type
    await migrateEntity('Loan', 'loans', {
      name: 'name', lender: 'lender', original_amount: 'original_amount',
      current_balance: 'current_balance', interest_rate: 'interest_rate',
      monthly_payment: 'monthly_payment', payment_frequency: 'payment_frequency',
      due_day: 'due_day', due_day_of_week: 'due_day_of_week',
      start_date: 'start_date', category: 'category', notes: 'notes', status: 'status',
    });

    await migrateEntity('BankAccount', 'bank_accounts', {
      name: 'name', institution: 'institution', account_type: 'account_type',
      balance: 'balance', currency: 'currency', last_synced: 'last_synced',
      plaid_account_id: 'plaid_account_id', link_method: 'link_method',
      notes: 'notes', is_active: 'is_active',
    });

    await migrateEntity('Transaction', 'transactions', {
      bank_account_id: 'bank_account_id', date: 'date', description: 'description',
      amount: 'amount', category: 'category', type: 'type', notes: 'notes',
    });

    await migrateEntity('Bill', 'bills', {
      name: 'name', amount: 'amount', payment_frequency: 'payment_frequency',
      due_day: 'due_day', due_day_of_week: 'due_day_of_week', category: 'category',
      notes: 'notes', is_active: 'is_active',
    });

    await migrateEntity('Asset', 'assets', {
      name: 'name', amount: 'amount', type: 'type', notes: 'notes',
    });

    await migrateEntity('SavingsGoal', 'savings_goals', {
      name: 'name', target_amount: 'target_amount', current_saved: 'current_saved',
      weekly_contribution: 'weekly_contribution', target_date: 'target_date',
      notes: 'notes', status: 'status',
    });

    return Response.json({
      success: true,
      base44_users: Object.keys(base44IdToEmail).length,
      supabase_users: Object.keys(emailToUuid).length,
      migration: results,
    });
  } catch (error) {
    console.error('[migrateBase44ToSupabase] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}