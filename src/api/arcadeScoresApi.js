import { supabase } from '@/lib/supabaseClient';

/**
 * Fetch the user's highest arcade score for a specific game
 * @param {string} userId - The user's UUID
 * @param {string} gameName - The game name (e.g., 'retrosnake')
 * @returns {Promise<number>} - The highest score or 0 if no scores exist
 */
export async function getHighestArcadeScore(userId, gameName) {
  try {
    const { data, error } = await supabase
      .from('arcade_scores')
      .select('score')
      .eq('user_id', userId)
      .eq('game_name', gameName)
      .order('score', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[Arcade API] Error fetching high score:', error);
      return 0;
    }

    return data && data.length > 0 ? data[0].score : 0;
  } catch (err) {
    console.error('[Arcade API] Unexpected error:', err);
    return 0;
  }
}

/**
 * Save a new arcade score if it's higher than the current best
 * @param {string} userId - The user's UUID
 * @param {string} gameName - The game name (e.g., 'retrosnake')
 * @param {number} score - The score to save
 * @returns {Promise<boolean>} - True if score was saved, false if it didn't beat the record
 */
export async function saveArcadeScore(userId, gameName, score) {
  try {
    // Get the current high score
    const currentHigh = await getHighestArcadeScore(userId, gameName);

    // Only save if this score beats the current best
    if (score > currentHigh) {
      const { error } = await supabase
        .from('arcade_scores')
        .insert({
          user_id: userId,
          game_name: gameName,
          score: score,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('[Arcade API] Error saving score:', error);
        return false;
      }

      console.log(`[Arcade API] New high score saved: ${gameName} = ${score}`);
      return true;
    }

    return false;
  } catch (err) {
    console.error('[Arcade API] Unexpected error:', err);
    return false;
  }
}

/**
 * Deduct tokens from user's ai_tokens balance
 * @param {string} userId - The user's UUID
 * @param {number} tokensToDeduct - Number of tokens to deduct
 * @returns {Promise<boolean>} - True if tokens were deducted successfully
 */
export async function deductUserTokens(userId, tokensToDeduct) {
  try {
    // First, get current token balance
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('ai_tokens')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('[Arcade API] Error fetching user tokens:', fetchError);
      return false;
    }

    const currentTokens = userData?.ai_tokens || 0;

    // Check if user has enough tokens
    if (currentTokens < tokensToDeduct) {
      console.warn(`[Arcade API] Insufficient tokens: ${currentTokens} < ${tokensToDeduct}`);
      return false;
    }

    // Deduct tokens
    const { error: updateError } = await supabase
      .from('users')
      .update({ ai_tokens: currentTokens - tokensToDeduct })
      .eq('id', userId);

    if (updateError) {
      console.error('[Arcade API] Error deducting tokens:', updateError);
      return false;
    }

    console.log(`[Arcade API] Deducted ${tokensToDeduct} tokens from user ${userId}`);
    return true;
  } catch (err) {
    console.error('[Arcade API] Unexpected error:', err);
    return false;
  }
}

/**
 * Get current user's token balance
 * @param {string} userId - The user's UUID
 * @returns {Promise<number>} - Current token balance
 */
export async function getUserTokenBalance(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('ai_tokens')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[Arcade API] Error fetching token balance:', error);
      return 0;
    }

    return data?.ai_tokens || 0;
  } catch (err) {
    console.error('[Arcade API] Unexpected error:', err);
    return 0;
  }
}
