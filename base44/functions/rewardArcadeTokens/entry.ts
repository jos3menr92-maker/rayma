import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, message: "Unauthorized: Please log in." }, { status: 401 });
    }

    const body = await req.json();
    const { gameId, level } = body;

    if (!level || level < 5) {
      return Response.json({ success: false, message: "Reach Level 5 to earn your first Energy Bars!" }, { status: 400 });
    }

    // 2 Energy Bars per 5-level milestone (Level 5 = 2, Level 10 = 4, Level 15 = 6, etc.)
    const milestones = Math.floor(level / 5);
    const rewardAmount = milestones * 2;
    const currentBars = user.energy_bars || 0;
    const newEnergyTotal = currentBars + rewardAmount;

    // 1. Update Base44 User
    await base44.auth.updateMe({ energy_bars: newEnergyTotal });

    // 2. Sync to Supabase profiles table (best-effort — prevents stale override in FinancialDataContext)
    try {
      const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL") || "";
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      if (supabaseUrl && supabaseKey) {
        const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ search: user.email });
        if (!listError && users && users.length > 0) {
          const supaUserId = users.find(u => u.email === user.email)?.id;
          if (supaUserId) {
            await supabaseAdmin.from('profiles').update({ energy_bars: newEnergyTotal }).eq('id', supaUserId);
          }
        }
        // eslint-disable-next-line no-unused-vars
      }
    } catch (syncErr) {
      console.warn("[Base44] Energy bar Supabase sync failed (non-fatal):", syncErr.message);
    }

    console.log(`[Base44] Arcade reward granted: ${gameId} | Level ${level} | ${milestones} milestone(s) | +${rewardAmount} Energy Bars | User ${user.email} | Total: ${currentBars} → ${newEnergyTotal}`);

    return Response.json({
      success: true,
      rewardGranted: true,
      rewardAmount,
      milestones,
      message: `Congratulations! You reached Level ${level} in ${gameId} and earned ${rewardAmount} Energy Bars!`
    });

  } catch (error) {
    console.error("[Base44] Error rewarding arcade tokens:", error);
    return Response.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
});