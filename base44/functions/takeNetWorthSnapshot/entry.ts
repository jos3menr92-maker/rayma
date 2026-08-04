import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSupabaseAdmin } from '../../shared/supabaseClient.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    // Allow admin batch run OR single-user call from the agent
    const isBatchAdmin = user && user.role === 'admin';
    const isSingleUser = user && user.role !== 'admin';

    const { client: supabaseAdmin } = getSupabaseAdmin();
    const today = new Date().toISOString().split("T")[0];
    let snapshotsTaken = 0;
    let usersProcessed = 0;

    // Determine which users to process
    let targetUsers = [];
    if (isSingleUser) {
      // Agent call — snapshot just this user
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ search: user.email });
      if (error) throw error;
      const supaUser = users.find(u => u.email === user.email);
      if (!supaUser) return Response.json({ error: 'Supabase user not found' }, { status: 404 });
      targetUsers = [supaUser];
    } else {
      // Admin/scheduler batch — paginate all users
      let page = 0;
      const PAGE_SIZE = 50;
      let hasMore = true;
      while (hasMore) {
        const b44Users = await base44.asServiceRole.entities.User.list("created_date", PAGE_SIZE, page * PAGE_SIZE);
        if (!b44Users || b44Users.length === 0) break;
        if (b44Users.length < PAGE_SIZE) hasMore = false;
        page++;
        for (const b44User of b44Users) {
          const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ search: b44User.email });
          if (error) continue;
          const supaUser = users.find(u => u.email === b44User.email);
          if (supaUser) targetUsers.push(supaUser);
        }
      }
    }

    for (const supaUser of targetUsers) {
      try {
        const uid = supaUser.id;

        // Check if snapshot already exists for today in Supabase
        const { data: existing } = await supabaseAdmin.from('net_worth_snapshots')
          .select('id')
          .eq('user_id', uid)
          .eq('snapshot_date', today)
          .limit(1);
        if (existing && existing.length > 0) continue;

        // Read assets, bank accounts, and loans from Supabase
        const [assetsRes, loansRes, banksRes] = await Promise.all([
          supabaseAdmin.from('assets').select('amount').eq('user_id', uid),
          supabaseAdmin.from('loans').select('current_balance, status').eq('user_id', uid),
          supabaseAdmin.from('bank_accounts').select('balance').eq('user_id', uid),
        ]);

        const totalAssets = (assetsRes.data || []).reduce((sum, a) => sum + (a.amount || 0), 0);
        const totalBankBalances = (banksRes.data || []).reduce((sum, a) => sum + (a.balance || 0), 0);
        const combinedAssets = totalAssets + totalBankBalances;
        const totalLiabilities = (loansRes.data || [])
          .filter(l => l.status === 'active')
          .reduce((sum, l) => sum + (l.current_balance || 0), 0);
        const netWorth = combinedAssets - totalLiabilities;

        await supabaseAdmin.from('net_worth_snapshots').insert([{
          user_id: uid,
          snapshot_date: today,
          total_assets: combinedAssets,
          total_liabilities: totalLiabilities,
          net_worth: netWorth,
        }]);

        snapshotsTaken++;
        usersProcessed++;
      } catch (userErr) {
        console.warn(`Skipped user ${supaUser.email}:`, userErr.message);
      }
    }

    return Response.json({ success: true, snapshots_taken: snapshotsTaken, users_processed: usersProcessed });
  } catch (error) {
    console.error('[takeNetWorthSnapshot] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});