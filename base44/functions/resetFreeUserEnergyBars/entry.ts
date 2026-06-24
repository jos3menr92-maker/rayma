import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * RAYMA Daily Energy Bar Reset
 * ============================
 * Runs daily at 00:00 UTC via pg_cron scheduled job.
 * 
 * Purpose:
 *   - Reset free-tier users' AI tokens (energy bars) to the daily limit (10)
 *   - Skip users with active annual passes or premium subscriptions
 *   - Preserve any tokens accumulated from purchases/promos
 * 
 * Logic:
 *   1. Fetch all users in batches
 *   2. Skip premium users (annual pass + monthly premium subscriptions)
 *   3. Skip users already reset today OR with enough tokens already
 *   4. Reset only users below daily free token limit
 */

const DAILY_FREE_TOKENS = 10; // Daily energy bar allowance for free users

Deno.serve(async (req) => {
  try {
    // Only allow this function to run via internal scheduler or admin user
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    // Allow unauthenticated internal calls (from pg_cron) or admin-only calls
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin or scheduler access required' }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Fetch all users — paginate to avoid memory/timeout issues
    let page = 0;
    const PAGE_SIZE = 100;
    let usersProcessed = 0;
    let tokensReset = 0;
    let skippedPremium = 0;
    let skippedAlreadyReset = 0;

    let hasMore = true;

    while (hasMore) {
      // Fetch a batch of users
      const users = await base44.asServiceRole.entities.User.list(
        'created_date',
        PAGE_SIZE,
        page * PAGE_SIZE
      );

      if (!users || users.length === 0) break;
      if (users.length < PAGE_SIZE) hasMore = false;
      page++;

      // Process each user in this batch
      for (const user of users) {
        try {
          usersProcessed++;

          const todayDate = new Date(today + 'T00:00:00');
          const annualPassActive =
            !!user.annual_pass_expires_at &&
            new Date(user.annual_pass_expires_at + 'T00:00:00') >= todayDate;
          const monthlyPremiumActive =
            user.subscription_type === 'power_lithium' ||
            user.subscription_type === 'power_generator';

          // Skip paid users to avoid downgrading premium capacity.
          const isPremium = annualPassActive || monthlyPremiumActive;
          if (isPremium) {
            skippedPremium++;
            continue;
          }

          const hasEnoughTokens = (user.ai_tokens ?? 0) >= DAILY_FREE_TOKENS;
          const alreadyResetToday = user.ai_tokens_reset_date === today;

          // Protect purchased/promotional tokens and avoid multiple resets per day.
          if (alreadyResetToday || hasEnoughTokens) {
            skippedAlreadyReset++;
            continue;
          }

          // Reset tokens to daily limit
          await base44.asServiceRole.entities.User.update(user.id, {
            ai_tokens: DAILY_FREE_TOKENS,
            ai_tokens_reset_date: today,
          });

          tokensReset++;
        } catch (userErr) {
          console.warn(`Failed to reset tokens for user ${user.id}:`, userErr.message);
          // Continue with next user on error
        }
      }

      console.log(`Processed batch ${page}: ${users.length} users`);
    }

    console.log(
      `[resetFreeUserEnergyBars] Complete | Tokens Reset: ${tokensReset} | Skipped (Premium): ${skippedPremium} | Skipped (Already Reset): ${skippedAlreadyReset} | Total Processed: ${usersProcessed}`
    );

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      tokens_reset: tokensReset,
      skipped_premium: skippedPremium,
      skipped_already_reset: skippedAlreadyReset,
      total_processed: usersProcessed,
    });
  } catch (error) {
    console.error('[resetFreeUserEnergyBars] Error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});
