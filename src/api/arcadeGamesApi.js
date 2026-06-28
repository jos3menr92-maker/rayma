/**
 * Arcade Games API - Client-side interface for arcade token and score operations.
 *
 * All token deductions are atomic, server-side operations.
 * Prevents race conditions through database-level transaction handling.
 * All timestamps are server-generated (never from client).
 */

/**
 * Deduct arcade game tokens from user balance.
 * Atomic operation: both concurrent requests cannot succeed if total cost exceeds balance.
 *
 * @param {string} gameId - Game identifier (e.g., 'retro_snake', 'space_invaders')
 * @param {number} tokensRequired - Number of tokens to deduct
 * @returns {Promise<Object>} { success, remainingTokens, deductedAt, message, error }
 */
export async function deductArcadeTokens(gameId, tokensRequired) {
  try {
    const response = await fetch('/api/base44/deductArcadeTokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId,
        tokensRequired,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        message: 'Network error during token deduction',
        error: 'network_error',
      };
    }

    const data = await response.json();

    return data;
  } catch (err) {
    console.error('[Arcade API] Error deducting tokens:', err);
    return {
      success: false,
      message: 'Failed to deduct tokens',
      error: 'client_error',
    };
  }
}

/**
 * Save arcade game score to database.
 *
 * Score is only saved if game was started with successful token deduction.
 * Uses server-generated timestamp from deduction response (never client time).
 *
 * @param {string} gameId - Game identifier
 * @param {number} score - Final score value
 * @param {string} playTimestamp - Server timestamp from token deduction (ISO string)
 * @returns {Promise<Object>} { saved, newHighScore, message, error }
 */
export async function saveArcadeScore(gameId, score, playTimestamp) {
  try {
    // Validate score is valid number
    if (typeof score !== 'number' || score < 0) {
      return {
        saved: false,
        message: 'Invalid score value',
        error: 'invalid_score',
      };
    }

    // Validate timestamp exists (required to prevent client-side spoofing)
    if (!playTimestamp || typeof playTimestamp !== 'string') {
      return {
        saved: false,
        message: 'Missing server timestamp',
        error: 'invalid_timestamp',
      };
    }

    const response = await fetch('/api/base44/saveArcadeScore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId,
        score,
        playTimestamp,
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
