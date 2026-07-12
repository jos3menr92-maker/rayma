/**
 * GDPR / CCPA Data Export
 * Returns all user data as a JSON bundle for download.
 * Required by GDPR Art. 20 (Right to Data Portability) and CCPA.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Instantiate Supabase admin client
    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration secrets.");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Resolve the Supabase UUID from the Base44 user's email (scalable server-side search)
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ search: user.email });
    if (listError) throw listError;

    const supabaseUser = users.find(u => u.email === user.email);
    if (!supabaseUser) {
      throw new Error("Supabase user not found for email: " + user.email);
    }

    const uid = supabaseUser.id;

    // Fetch all user-owned data from Supabase tables in parallel
    const [loans, bills, payments, transactions, assets, savingsGoals, incomes, bankAccounts] = await Promise.all([
      supabaseAdmin.from('loans').select('*').eq('user_id', uid),
      supabaseAdmin.from('bills').select('*').eq('user_id', uid),
      supabaseAdmin.from('payments').select('*').eq('user_id', uid),
      supabaseAdmin.from('transactions').select('*').eq('user_id', uid),
      supabaseAdmin.from('assets').select('*').eq('user_id', uid),
      supabaseAdmin.from('savings_goals').select('*').eq('user_id', uid),
      supabaseAdmin.from('incomes').select('*').eq('user_id', uid),
      supabaseAdmin.from('bank_accounts').select('*').eq('user_id', uid),
    ]);

    const exportBundle = {
      export_date: new Date().toISOString(),
      export_version: "2.0",
      app: "Rayma AI — Debt & Bills Tracker",
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        created_date: user.created_date,
      },
      data: {
        bank_accounts: bankAccounts.data || [],
        loans: loans.data || [],
        bills: bills.data || [],
        payments: payments.data || [],
        transactions: transactions.data || [],
        assets: assets.data || [],
        savings_goals: savingsGoals.data || [],
        incomes: incomes.data || [],
      },
      notes: "This export contains all personal financial data stored by Rayma AI for your account. To request permanent deletion, visit the Delete Account section in your profile.",
    };

    return new Response(JSON.stringify(exportBundle, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="rayma-data-export-${user.id}-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('[exportUserData] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});