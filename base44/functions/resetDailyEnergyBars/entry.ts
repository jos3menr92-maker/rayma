import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Daily Energy Reset (scheduled via pg_cron at 00:00 UTC)
 *
 * Rules:
 *  - Annual pass active  → skip entirely (unlimited energy, no cap)
 *  - power_generator active → reset to 200 bars/day
 *  - power_lithium active   → reset to 50 bars/day
 *  - Free user              → reset to 10 bars/day
 *
 * In all non-skipped cases, purchased_energy is added on top.
 * Duplicate resets on the same calendar day are prevented via last_energy_reset.
 */

// Daily energy cap per subscription tier
const DAILY_ENERGY_BY_TIER: Record<string, number> = {
  power_generator: 200,
  power_lithium:   50,
  free:            10,
};

Deno.serve(async (req) => {
  try {
    // Verify this is being called by the pg_cron scheduled job
    const authHeader       = req.headers.get('authorization');
    const scheduledSecretKey = Deno.env.get('SCHEDULED_JOB_SECRET_KEY');

    if (!authHeader || !scheduledSecretKey) {
      console.warn('Missing authorization header or secret key');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bearerToken = authHeader.replace('Bearer ', '');
    if (bearerToken !== scheduledSecretKey) {
      console.warn('Invalid authorization token');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const today  = new Date().toISOString().split('T')[0]; // YYYY-MM-DD UTC
    const now    = new Date();

    const allUsers = await base44.asServiceRole.entities.User.query({
      limit: 10000,
    });

    let resetCount = 0;
    const resetSummary = [];

    for (const user of allUsers) {

      // ── ANNUAL PASS CHECK ─────────────────────────────────────────────────
      // Annual pass = unlimited energy. Skip the reset entirely so their
      // bars are never touched by this job.
      const hasActivePremium = user.annual_pass_expires_at
        ? new Date(user.annual_pass_expires_at + 'T23:59:59Z') > now
        : false;

      if (hasActivePremium) {
        console.log(`⊘ Skipped annual-pass user ${user.id} (expires ${user.annual_pass_expires_at})`);
        continue;
      }

      // ── DUPLICATE RESET GUARD ─────────────────────────────────────────────
      if (user.last_energy_reset === today) {
        console.log(`⊘ Skipped user ${user.id} (already reset today)`);
        continue;
      }

      // ── DETERMINE TIER ────────────────────────────────────────────────────
      // Check if the user has an active Stripe subscription (power_lithium / power_generator).
      // If subscription_expires_at is in the past (or missing), treat them as free.
      const hasActiveSubscription = user.subscription_expires_at
        ? new Date(user.subscription_expires_at + 'T23:59:59Z') > now
        : false;

      const activeTier = hasActiveSubscription
        ? (user.subscription_tier || 'free')
        : 'free';

      // ── CALCULATE DAILY ENERGY ────────────────────────────────────────────
      const baseDailyEnergy  = DAILY_ENERGY_BY_TIER[activeTier] ?? 10;
      const purchasedEnergy  = user.purchased_energy || 0;
      const totalEnergy      = baseDailyEnergy + purchasedEnergy;

      try {
        await base44.asServiceRole.entities.User.update(user.id, {
          energy_bars:       totalEnergy,
          last_energy_reset: today,
        });

        resetCount++;
        resetSummary.push({
          userId:         user.id,
          email:          user.email,
          tier:           activeTier,
          baseDailyEnergy,
          purchasedEnergy,
          newEnergyBars:  totalEnergy,
        });

        console.log(
          `✓ Reset user ${user.id} [${activeTier}]: ` +
          `${baseDailyEnergy} base + ${purchasedEnergy} purchased = ${totalEnergy} bars`
        );
      } catch (updateError) {
        console.error(`✗ Failed to reset user ${user.id}:`, updateError.message);
      }
    }

    console.log(`\n🔋 Daily reset complete: ${resetCount} users updated at ${today} UTC`);

    return Response.json({
      success:         true,
      timestamp:       new Date().toISOString(),
      usersResetCount: resetCount,
      summary:         resetSummary,
      message:         `Successfully reset daily energy for ${resetCount} users`,
    });
  } catch (error) {
    console.error('❌ Critical error in resetDailyEnergyBars:', error);
    return Response.json(
      { error: error.message, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
});
