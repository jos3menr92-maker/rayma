/**
 * Arcade Games API - Client-side interface for arcade operations and Play-to-Earn rewards.
 *
 * All calls go through the Base44 SDK (base44.functions.invoke) so the auth
 * token is attached — raw fetch('/api/base44/...') calls returned 401 and
 * silently killed score saving and reward claims.
 */
import { base44 } from '@/api/base44Client';

/**
 * Claim Play-to-Earn reward for reaching milestone levels.
 * 3 coins per 5-level milestone (Level 5 = 3, Level 10 = 6, etc.).
 *
 * @param {string} gameId - Game identifier (e.g., 'retro_snake', 'space_invaders')
 * @param {number} level - The level reached by the user
 * @returns {Promise<Object>} { success, message, rewardGranted, rewardAmount }
 */
export async function claimArcadeReward(gameId, level) {
  try {
    const res = await base44.functions.invoke('rewardArcadeTokens', {
      gameId,
      level,
    });
    const data = res.data || {};
    return {
      success: !!data.success,
      rewardGranted: !!data.rewardGranted,
      rewardAmount: data.rewardAmount || 0,
      message: data.message || '',
    };
  } catch (err) {
    console.error('[Arcade API] Error claiming reward:', err);
    return {
      success: false,
      message: 'Failed to claim reward',
      error: 'client_error',
    };
  }
}

/**
 * Save arcade game score to database.
 *
 * @param {string} gameId - Game identifier
 * @param {number} score - Final score value
 * @returns {Promise<Object>} { saved, newHighScore, message, error }
 */
export async function saveArcadeScore(gameId, score) {
  try {
    // Validate score is valid number
    if (typeof score !== 'number' || score < 0) {
      return {
        saved: false,
        message: 'Invalid score value',
        error: 'invalid_score',
      };
    }

    const res = await base44.functions.invoke('saveArcadeScore', {
      gameId,
      score,
    });
    const data = res.data || {};
    return {
      saved: !!data.saved,
      newHighScore: !!data.newHighScore,
      message: data.message || '',
    };
  } catch (err) {
    console.error('[Arcade API] Error saving score:', err);
    return {
      saved: false,
      message: 'Failed to save score',
      error: 'client_error',
    };
  }
}

/**
 * Fetch user's high score for a specific game.
 *
 * @param {string} gameId - Game identifier
 * @returns {Promise<number>} High score or 0 if no previous scores
 */
export async function getHighScore(gameId) {
  try {
    const res = await base44.functions.invoke('arcadeScore', { gameId });
    const data = res.data || {};
    return data.highScore || 0;
  } catch (err) {
    console.error('[Arcade API] Error fetching high score:', err);
    return 0;
  }
}

/**
 * Get all arcade game high scores for current user.
 *
 * @returns {Promise<Object>} { space_invaders: 0, retro_snake: 0, sky_striker: 0, ... }
 */
export async function getAllHighScores() {
  try {
    const res = await base44.functions.invoke('arcadeScores', {});
    const data = res.data || {};
    return data.scores || {};
  } catch (err) {
    console.error('[Arcade API] Error fetching all high scores:', err);
    return {};
  }
}