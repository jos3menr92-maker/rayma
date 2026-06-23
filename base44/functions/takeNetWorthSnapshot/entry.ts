import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow admin users OR the internal scheduler (no user = service-level call)
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const today = new Date().toISOString().split("T")[0];

    // Paginate through all users in batches of 50 to avoid memory/timeout issues
    let page = 0;
    const PAGE_SIZE = 50;
    let snapshotsTaken = 0;
    let usersProcessed = 0;
    let hasMore = true;

    while (hasMore) {
      const users = await base44.asServiceRole.entities.User.list(
        "created_date",
        PAGE_SIZE,
        page * PAGE_SIZE
      );

      if (!users || users.length === 0) break;
      if (users.length < PAGE_SIZE) hasMore = false;
      page++;

      // Process all users in this batch in PARALLEL (not sequentially)
      await Promise.allSettled(
        users.map(async (member) => {
          try {
            // Check if snapshot already exists for today — skip early to save reads
            const existing = await base44.asServiceRole.entities.NetWorthSnapshot.filter({
              created_by: member.email,
              snapshot_date: today,
            });
            if (existing.length > 0) return;

            // Fetch assets and loans in parallel
            const [assets, loans] = await Promise.all([
              base44.asServiceRole.entities.Asset.filter({ created_by: member.email }),
              base44.asServiceRole.entities.Loan.filter({ created_by: member.email }),
            ]);

            const totalAssets = assets.reduce((sum, a) => sum + (a.amount || 0), 0);
            const totalLiabilities = loans
              .filter((l) => l.status === "active")
              .reduce((sum, l) => sum + (l.current_balance || 0), 0);
            const netWorth = totalAssets - totalLiabilities;

            await base44.asServiceRole.entities.NetWorthSnapshot.create({
              snapshot_date: today,
              total_assets: totalAssets,
              total_liabilities: totalLiabilities,
              net_worth: netWorth,
              created_by: member.email,
            });

            snapshotsTaken++;
          } catch (userErr) {
            console.warn(`Skipped user ${member.email}:`, userErr.message);
          }
        })
      );

      usersProcessed += users.length;
      console.log(`Processed batch ${page}: ${users.length} users (total so far: ${usersProcessed})`);
    }

    console.log(`Snapshot run complete: ${snapshotsTaken} snapshots taken across ${usersProcessed} users.`);
    return Response.json({ success: true, snapshots_taken: snapshotsTaken, users_processed: usersProcessed });
  } catch (error) {
    console.error('takeNetWorthSnapshot error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});