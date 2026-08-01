import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Weekly Free-Coin Top-up (Rayma AI Coin Model)
 * =============================================
 * Runs on a schedule (weekly recommended). Free users get 15 coins (5 questions)
 * per week. This tops up to 15 ONLY if the user's balance is below 15 AND a new
 * week has started since the last top-up — so purchased/earned coins above 15 are
 * preserved (carry over), and the free allowance does not stack (no carry over of
 * unused allowance).
 *
 * Premium subscribers (Lithium/Generator/Unlimited) and annual-pass holders are
 * skipped. Idempotent via ai_tokens_reset_date (set to the week-start date).
 */

const WEEKLY_FREE_COINS = 15; // 15 coins = 5 questions/week

// Returns the ISO Monday-UTC date string for the week containing `date`
function getWeekStartISO(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = (day === 0 ? -6 : 1) - day; // back to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  try {
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
    const today = new Date();
    const weekStart = getWeekStartISO(today); // YYYY-MM-DD (Monday UTC)
    const now = today.toISOString();

    const allUsers = await base44.asServiceRole.entities.User.query({ limit: 10000 });

    let resetCount = 0;

    for (const user of allUsers) {
      // Skip premium subscribers and annual-pass holders
      const sub = user.subscription_type;
      const isPremiumSub = sub === 'power_lithium' || sub === 'power_generator' || sub === 'power_unlimited';
      const annualActive = user.annual_pass_expires_at
        ? new Date(String(user.annual_pass_expires_at).includes('T')
            ? user.annual_pass_expires_at
            : `${user.annual_pass_expires_at}T23:59:59Z`) > new Date(now)
        : false;
      if (isPremiumSub || annualActive) continue;

      // Only top up once per week
      if (user.ai_tokens_reset_date === weekStart) continue;

      const current = user.ai_tokens ?? 0;

      // Only top up if below the weekly allowance — never reduce earned/purchased coins
      if (current >= WEEKLY_FREE_COINS) continue;

      try {
        await base44.asServiceRole.entities.User.update(user.id, {
          ai_tokens: WEEKLY_FREE_COINS,
          ai_tokens_reset_date: weekStart,
        });
        resetCount++;
        console.log(`✓ Weekly top-up ${user.id}: ${current} → ${WEEKLY_FREE_COINS} coins`);
      } catch (updateError) {
        console.error(`✗ Failed to top up user ${user.id}:`, updateError.message);
      }
    }

    console.log(`\n🔋 Weekly free-coin top-up complete: ${resetCount} users (week of ${weekStart})`);

    return Response.json({
      success: true,
      timestamp: now,
      week_start: weekStart,
      usersResetCount: resetCount,
      message: `Topped up ${resetCount} free users to ${WEEKLY_FREE_COINS} coins (week of ${weekStart})`,
    });
  } catch (error) {
    console.error('❌ Critical error in weekly token top-up:', error);
    return Response.json(
      { error: error.message, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
});