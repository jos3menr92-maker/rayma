import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Weekly Free-Coin Top-up (legacy entry — mirrors resetDailyEnergyBars)
 * ====================================================================
 * This function is kept for backward compat with any external scheduler that
 * still points at it. It now performs the SAME weekly 15-coin top-up as
 * resetDailyEnergyBars so free users always get 15 coins/week (5 questions)
 * regardless of which endpoint the cron calls.
 *
 * Free users below 15 are topped up to 15 once per ISO week. Premium subscribers
 * and annual-pass holders are skipped. Purchased/earned coins above 15 carry over.
 */

const WEEKLY_FREE_COINS = 15;

function getWeekStartISO(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    // Allow unauthenticated internal calls (pg_cron) or admin-only calls
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin or scheduler access required' }, { status: 403 });
    }

    const today = new Date();
    const weekStart = getWeekStartISO(today);

    let page = 0;
    const PAGE_SIZE = 100;
    let usersProcessed = 0;
    let tokensReset = 0;
    let skippedPremium = 0;
    let skippedAlreadyReset = 0;
    let hasMore = true;

    while (hasMore) {
      const users = await base44.asServiceRole.entities.User.list('created_date', PAGE_SIZE, page * PAGE_SIZE);
      if (!users || users.length === 0) break;
      if (users.length < PAGE_SIZE) hasMore = false;
      page++;

      for (const user of users) {
        try {
          usersProcessed++;
          const sub = user.subscription_type;
          const isPremiumSub = sub === 'power_lithium' || sub === 'power_generator' || sub === 'power_unlimited';
          const annualActive = !!user.annual_pass_expires_at
            && new Date(user.annual_pass_expires_at + 'T00:00:00') >= new Date(today.toISOString());
          if (isPremiumSub || annualActive) { skippedPremium++; continue; }

          if (user.ai_tokens_reset_date === weekStart) { skippedAlreadyReset++; continue; }

          const current = user.ai_tokens ?? 0;
          if (current >= WEEKLY_FREE_COINS) { skippedAlreadyReset++; continue; }

          await base44.asServiceRole.entities.User.update(user.id, {
            ai_tokens: WEEKLY_FREE_COINS,
            ai_tokens_reset_date: weekStart,
          });
          tokensReset++;
        } catch (userErr) {
          console.warn(`Failed to top up user ${user.id}:`, userErr.message);
        }
      }
      console.log(`Processed batch ${page}: ${users.length} users`);
    }

    console.log(`[resetFreeUserEnergyBars] Weekly top-up | Reset: ${tokensReset} | Skipped Premium: ${skippedPremium} | Skipped Already: ${skippedAlreadyReset} | Processed: ${usersProcessed} (week of ${weekStart})`);

    return Response.json({
      success: true,
      timestamp: today.toISOString(),
      week_start: weekStart,
      tokens_reset: tokensReset,
      skipped_premium: skippedPremium,
      skipped_already_reset: skippedAlreadyReset,
      total_processed: usersProcessed,
    });
  } catch (error) {
    console.error('[resetFreeUserEnergyBars] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});