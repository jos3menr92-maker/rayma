import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Daily Token Top-up (unified "Battery" field: ai_tokens)
 * ======================================================
 * Runs daily at 00:00 UTC. Tops up each user's ai_tokens to their tier's daily
 * limit (free 10 / lithium 50 / generator 200) WITHOUT reducing tokens already
 * above the limit — so Insert Coin boosts and arcade rewards are preserved.
 * Annual-pass users are unlimited and skipped. Idempotent via ai_tokens_reset_date.
 *
 * This replaces the legacy energy_bars reset — ai_tokens is now the single
 * field driving the Battery UI, the AI chat gate, Stripe purchases, and rewards.
 */

Deno.serve(async (req) => {
  try {
    // Verify this is being called by the scheduled job
    const authHeader = req.headers.get('authorization');
    const scheduledSecretKey = Deno.env.get('SCHEDULED_JOB_SECRET_KEY');

    if (!authHeader || !scheduledSecretKey) {
      console.warn('Missing authorization header or secret key');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (authHeader.replace('Bearer ', '') !== scheduledSecretKey) {
      console.warn('Invalid authorization token');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD UTC
    const now = new Date();

    const allUsers = await base44.asServiceRole.entities.User.query({
      limit: 10000,
    });

    let resetCount = 0;

    for (const user of allUsers) {
      // ── ANNUAL PASS CHECK ─────────────────────────────────────────────────
      // Annual pass = unlimited. Skip so their tokens are never touched.
      const hasActivePremium = user.annual_pass_expires_at
        ? new Date(user.annual_pass_expires_at + 'T23:59:59Z') > now
        : false;
      if (hasActivePremium) continue;

      // ── DUPLICATE RESET GUARD ─────────────────────────────────────────────
      if (user.ai_tokens_reset_date === today) continue;

      // ── TOP-UP TO TIER LIMIT ──────────────────────────────────────────────
      const limit = user.ai_tokens_daily_limit || 10;
      const current = user.ai_tokens ?? 0;

      // Only top up if below the daily limit — never reduce purchased/earned tokens.
      if (current >= limit) continue;

      try {
        await base44.asServiceRole.entities.User.update(user.id, {
          ai_tokens: limit,
          ai_tokens_reset_date: today,
        });

        resetCount++;
        console.log(`✓ Topped up ${user.id}: ${current} → ${limit} tokens`);
      } catch (updateError) {
        console.error(`✗ Failed to top up user ${user.id}:`, updateError.message);
      }
    }

    console.log(`\n🔋 Daily token top-up complete: ${resetCount} users at ${today} UTC`);

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      usersResetCount: resetCount,
      message: `Topped up ai_tokens for ${resetCount} users`,
    });
  } catch (error) {
    console.error('❌ Critical error in resetDailyEnergyBars:', error);
    return Response.json(
      { error: error.message, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
});