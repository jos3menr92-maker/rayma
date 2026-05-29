import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all users via service role
    const users = await base44.asServiceRole.entities.User.list();

    let snapshotsTaken = 0;

    for (const user of users) {
      try {
        // Fetch assets and loans for this user
        const [assets, loans] = await Promise.all([
          base44.asServiceRole.entities.Asset.filter({ created_by: user.email }),
          base44.asServiceRole.entities.Loan.filter({ created_by: user.email }),
        ]);

        const totalAssets = assets.reduce((sum, a) => sum + (a.amount || 0), 0);
        const totalLiabilities = loans
          .filter(l => l.status === "active")
          .reduce((sum, l) => sum + (l.current_balance || 0), 0);
        const netWorth = totalAssets - totalLiabilities;

        const today = new Date().toISOString().split("T")[0];

        // Check if a snapshot already exists for today for this user
        const existing = await base44.asServiceRole.entities.NetWorthSnapshot.filter({
          created_by: user.email,
          snapshot_date: today,
        });

        if (existing.length === 0) {
          await base44.asServiceRole.entities.NetWorthSnapshot.create({
            snapshot_date: today,
            total_assets: totalAssets,
            total_liabilities: totalLiabilities,
            net_worth: netWorth,
            created_by: user.email,
          });
          snapshotsTaken++;
        }
      } catch (userErr) {
        console.warn(`Skipped user ${user.email}:`, userErr.message);
      }
    }

    return Response.json({ success: true, snapshots_taken: snapshotsTaken });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});