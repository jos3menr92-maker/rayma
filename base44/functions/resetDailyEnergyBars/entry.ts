import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Weekly Free-Coin Top-up (Rayma AI Coin Model)
 * =============================================
 * Runs via a Base44 scheduled automation (weekly, Monday 09:00 local). Free
 * users get 15 coins (5 questions) per week. Tops up to 15 ONLY when the
 * balance is below 15 AND a new ISO week has started since the last top-up —
 * purchased/earned coins above 15 carry over; the free allowance never stacks.
 *
 * Premium subscribers (Lithium/Generator/Unlimited) and annual-pass holders
 * are skipped. Idempotent via ai_tokens_reset_date (set to the week-start date).
 *
 * Auth: invoked by the scheduler with a service token, so createClientFromRequest
 * resolves the service role directly — no shared secret required.
 */

const WEEKLY_FREE_COINS = 15; // 15 coins = 5 questions/week

function getWeekStartISO(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = (day === 0 ? -6 : 1) - day; // back to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split('T')[0];
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date();
    const weekStart = getWeekStartISO(today);
    const now = today.toISOString();

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

      for (const u of users) {
        try {
          usersProcessed++;
          const sub = u.subscription_type;
          const isPremiumSub = sub === 'power_lithium' || sub === 'power_generator' || sub === 'power_unlimited';
          const annualActive = !!u.annual_pass_expires_at
            && new Date(
              String(u.annual_pass_expires_at).includes('T')
                ? u.annual_pass_expires_at
                : `${u.annual_pass_expires_at}T23:59:59Z`
            ) > new Date(now);
          if (isPremiumSub || annualActive) { skippedPremium++; continue; }

          if (u.ai_tokens_reset_date === weekStart) { skippedAlreadyReset++; continue; }

          const current = u.ai_tokens ?? 0;
          if (current >= WEEKLY_FREE_COINS) { skippedAlreadyReset++; continue; }

          await base44.asServiceRole.entities.User.update(u.id, {
            ai_tokens: WEEKLY_FREE_COINS,
            ai_tokens_reset_date: weekStart,
          });
          tokensReset++;
          console.log(`✓ Weekly top-up ${u.id}: ${current} → ${WEEKLY_FREE_COINS} coins`);
        } catch (userErr) {
          console.warn(`✗ Failed to top up user ${u.id}:`, userErr.message);
        }
      }
      console.log(`Processed batch ${page}: ${users.length} users`);
    }

    console.log(`[resetDailyEnergyBars] Weekly top-up | Reset: ${tokensReset} | Skipped Premium: ${skippedPremium} | Skipped Already: ${skippedAlreadyReset} | Processed: ${usersProcessed} (week of ${weekStart})`);

    return Response.json({
      success: true,
      timestamp: now,
      week_start: weekStart,
      tokens_reset: tokensReset,
      skipped_premium: skippedPremium,
      skipped_already_reset: skippedAlreadyReset,
      total_processed: usersProcessed,
    });
  } catch (error) {
    console.error('[resetDailyEnergyBars] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}