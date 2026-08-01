import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSupabaseAdmin } from '../../shared/supabaseClient.ts';
import { getSupaUserIdByEmail } from '../../shared/supabaseUserLookup.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, message: "Unauthorized: Please log in." }, { status: 401 });
    }

    const body = await req.json();
    const { gameId, level } = body;

    if (!level || level < 5) {
      return Response.json({ success: false, message: "Reach Level 5 to earn your first coins!" }, { status: 400 });
    }

    // 3 coins per 5-level milestone (Level 5 = 3, Level 10 = 6, etc.)
    const milestones = Math.floor(level / 5);
    const rewardAmount = milestones * 3;
    const currentTokens = user.ai_tokens || 0;
    const newTokensTotal = currentTokens + rewardAmount;

    // 1. Update Base44 User — ai_tokens is what the battery and chat gate on.
    await base44.auth.updateMe({ ai_tokens: newTokensTotal });

    // 2. Sync to Supabase profiles (best-effort — keeps FinancialDataContext in step)
    try {
      const { client: supabaseAdmin } = getSupabaseAdmin();
      const supaUserId = await getSupaUserIdByEmail(supabaseAdmin, user.email);
      if (supaUserId) {
        await supabaseAdmin.from('profiles').update({ ai_tokens: newTokensTotal }).eq('id', supaUserId);
      }
    } catch (syncErr) {
      console.warn("[Base44] Arcade reward Supabase sync failed (non-fatal):", syncErr.message);
    }

    console.log(`[Base44] Arcade reward granted: ${gameId} | Level ${level} | ${milestones} milestone(s) | +${rewardAmount} tokens | User ${user.email} | Total: ${currentTokens} → ${newTokensTotal}`);

    return Response.json({
      success: true,
      rewardGranted: true,
      rewardAmount,
      milestones,
      message: `Congratulations! You reached Level ${level} in ${gameId} and earned ${rewardAmount} coins!`
    });

  } catch (error) {
    console.error("[Base44] Error rewarding arcade tokens:", error);
    return Response.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}