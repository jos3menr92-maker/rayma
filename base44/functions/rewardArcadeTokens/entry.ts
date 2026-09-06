import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { syncAiTokensToProfiles } from '../../shared/coinLedger.ts';

/**
 * Play-to-Earn reward claim — server-side only.
 *
 * Rules (single authority for arcade payouts):
 *   - 3 coins per 5-level milestone (Level 5 = 3, Level 10 = 6, ...)
 *   - Hard cap: 6 coins per user per UTC day (farming guard)
 *   - gameId must be a real arcade game; level must be a sane integer
 */
const VALID_GAME_IDS = ['space_invaders', 'retro_snake', 'sky_striker', 'neon_drift', 'crystal_crusher', 'meteor_storm'];
const COINS_PER_MILESTONE = 3;
const MILESTONE_EVERY = 5;
const DAILY_ARCADE_COIN_CAP = 6;
const MAX_LEVEL = 999;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, message: 'Unauthorized: Please log in.' }, { status: 401 });
    }

    const body = await req.json();
    const { gameId, level } = body;

    if (!gameId || !VALID_GAME_IDS.includes(gameId)) {
      return Response.json({ success: false, message: 'Unknown game.' }, { status: 400 });
    }

    const lvl = Number(level);
    if (!Number.isInteger(lvl) || lvl < MILESTONE_EVERY || lvl > MAX_LEVEL) {
      return Response.json({ success: false, message: 'Reach Level 5 to earn your first coins!' }, { status: 400 });
    }

    const rawReward = Math.floor(lvl / MILESTONE_EVERY) * COINS_PER_MILESTONE;

    // Daily farming guard — coins earned today are tracked on the user record
    const today = new Date().toISOString().split('T')[0];
    const users = await base44.asServiceRole.entities.User.filter({ id: user.id });
    const record = users[0];
    const earnedToday = record?.arcade_coins_earned_date === today
      ? (record.arcade_coins_earned_today || 0)
      : 0;
    const remainingToday = DAILY_ARCADE_COIN_CAP - earnedToday;

    if (remainingToday <= 0) {
      return Response.json({
        success: false,
        dailyCapReached: true,
        message: `Daily arcade coin limit reached (${DAILY_ARCADE_COIN_CAP} coins/day) — come back tomorrow!`,
      });
    }

    const rewardAmount = Math.min(rawReward, remainingToday);
    const newTokensTotal = (record?.ai_tokens || 0) + rewardAmount;

    await base44.asServiceRole.entities.User.update(user.id, {
      ai_tokens: newTokensTotal,
      arcade_coins_earned_date: today,
      arcade_coins_earned_today: earnedToday + rewardAmount,
    });

    await syncAiTokensToProfiles(user.email, newTokensTotal);

    console.log(`[Base44] Arcade reward: ${gameId} | Level ${lvl} | +${rewardAmount} coins | User ${user.email} | Daily: ${earnedToday + rewardAmount}/${DAILY_ARCADE_COIN_CAP} | Balance: ${newTokensTotal}`);

    return Response.json({
      success: true,
      rewardGranted: true,
      rewardAmount,
      dailyRemaining: remainingToday - rewardAmount,
      milestones: Math.floor(lvl / MILESTONE_EVERY),
      message: `Congratulations! You reached Level ${lvl} in ${gameId} and earned ${rewardAmount} coins!`,
    });

  } catch (error) {
    console.error('[Base44] Error rewarding arcade tokens:', error);
    return Response.json({ success: false, message: 'Internal server error.' }, { status: 500 });
  }
}