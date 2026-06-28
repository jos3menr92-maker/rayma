/**
 * Arcade Games API - Client-side interface for arcade operations and Play-to-Earn rewards.
 */

/**
 * Claim daily Play-to-Earn reward (Energy Bar) for reaching milestone levels.
 * Server strictly enforces the "1 reward per game, per day" limit to prevent farming.
 *
 * @param {string} gameId - Game identifier (e.g., 'retro_snake', 'space_invaders')
 * @param {number} level - The level reached by the user
 * @returns {Promise<Object>} { success, message, rewardGranted }
 */
export async function claimArcadeReward(gameId, level) {
  try {
    const response = await fetch('/api/base44/rewardArcadeTokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId,
        level,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        message: 'Network error claiming reward',
        error: 'network_error',
      };
    }

    const data = await response.json();
    return data;
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
 * Removed the required playTimestamp to allow instant, frictionless free play.
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

    const response = await fetch('/api/base44/saveArcadeScore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId,
        score,
      }),
    });

    if (!response.ok) {
      return {
        saved: false,
        message: 'Network error saving score',
        error: 'network_error',
      };
    }

    const data = await response.json();
    return data;
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
    const response = await fetch(`/api/base44/arcadeScore/${gameId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      console.warn(`[Arcade API] Could not fetch high score for ${gameId}`);
      return 0;
    }

    const data = await response.json();
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
    const response = await fetch('/api/base44/arcadeScores', {
      method: 'GET',
    });

    if (!response.ok) {
      console.warn('[Arcade API] Could not fetch high scores');
      return {};
    }

    const data = await response.json();
    return data.scores || {};
  } catch (err) {
    console.error('[Arcade API] Error fetching all high scores:', err);
    return {};
  }
}
