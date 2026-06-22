import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Daily Energy Reset Function (Scheduled via pg_cron at midnight UTC)
 *
 * Purpose:
 *   - Reset energy_bars to 10 for FREE users (no active annual_pass)
 *   - Do NOT affect premium users or purchased energy
 *   - Prevent duplicate resets on the same day
 *
 * Execution: Via pg_cron at 00:00 UTC every day
 * Triggering: POST /functions/v1/resetDailyEnergyBars with Authorization header
 */

Deno.serve(async (req) => {
  try {
    // Verify this is being called by the scheduled job or authorized admin
    const authHeader = req.headers.get('authorization');
    const scheduledSecretKey = Deno.env.get('SCHEDULED_JOB_SECRET_KEY');

    // For local testing or direct calls, require authorization
    if (!authHeader || !scheduledSecretKey) {
      console.warn('Missing authorization header or secret key');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Basic bearer token validation
    const bearerToken = authHeader.replace('Bearer ', '');
    if (bearerToken !== scheduledSecretKey) {
      console.warn('Invalid authorization token');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);

    // Get today's date in YYYY-MM-DD format (UTC)
    const today = new Date().toISOString().split('T')[0];

    // Step 1: Fetch all FREE users (no active annual_pass)
    // A free user is someone whose annual_pass_expires_at is null, empty, or in the past
    const allUsers = await base44.asServiceRole.entities.User.query({
      limit: 10000, // Adjust based on user count; consider pagination for very large datasets
    });

    let resetCount = 0;
    const resetSummary = [];

    for (const user of allUsers) {
      // Check if user has an active premium pass
      const hasActivePremium = user.annual_pass_expires_at
        ? new Date(user.annual_pass_expires_at + 'T23:59:59Z') > new Date()
        : false;

      // Check if we already reset today for this user
      const alreadyResetToday = user.last_energy_reset === today;

      if (!hasActivePremium && !alreadyResetToday) {
        // This is a free user who hasn't been reset today
        // Calculate total energy: base 10 + any purchased energy
        const purchasedEnergy = user.purchased_energy || 0;
        const totalEnergy = 10 + purchasedEnergy;

        try {
          await base44.asServiceRole.entities.User.update(user.id, {
            energy_bars: totalEnergy,
            last_energy_reset: today,
          });

          resetCount++;
          resetSummary.push({
            userId: user.id,
            email: user.email,
            newEnergyBars: totalEnergy,
            purchasedEnergy,
          });

          console.log(
            `✓ Reset energy for free user ${user.id}: ${totalEnergy} bars ` +
            `(10 base + ${purchasedEnergy} purchased)`
          );
        } catch (updateError) {
          console.error(
            `✗ Failed to reset energy for user ${user.id}:`,
            updateError.message
          );
        }
      } else if (hasActivePremium) {
        console.log(`⊘ Skipped premium user ${user.id} (active annual_pass until ${user.annual_pass_expires_at})`);
      } else if (alreadyResetToday) {
        console.log(`⊘ Skipped user ${user.id} (already reset today)`);
      }
    }

    console.log(
      `\n🔋 Daily energy reset complete: ${resetCount} users updated at ${today} UTC`
    );

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      usersResetCount: resetCount,
      summary: resetSummary,
      message: `Successfully reset daily energy for ${resetCount} free users`,
    });
  } catch (error) {
    console.error('❌ Critical error in resetDailyEnergyBars:', error);
    return Response.json(
      {
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
});
