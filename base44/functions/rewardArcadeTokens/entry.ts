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

    if (!level || level < 10) {
      return Response.json({ success: false, message: "Nice try! You must reach Level 10 to earn a reward." }, { status: 400 });
    }

    const currentBars = user.energy_bars || 0;
    const newEnergyTotal = currentBars + 1;

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
      }
    } catch (syncErr) {
      console.warn("[Base44] Energy bar Supabase sync failed (non-fatal):", syncErr.message);
    }

    console.log(`[Base44] Arcade reward granted: ${gameId} | Level ${level} | User ${user.email} | Energy bars: ${currentBars} → ${newEnergyTotal}`);

    return Response.json({
      success: true,
      rewardGranted: true,
      message: `Congratulations! You beat Level 10 in ${gameId} and earned 1 Energy Bar.`
    });

  } catch (error) {
    console.error("[Base44] Error rewarding arcade tokens:", error);
    return Response.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
});