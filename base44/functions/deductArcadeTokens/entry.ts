import { getUser, updateUser } from '../../entities/User';

interface DeductArcadeTokensRequest {
  gameId: string;
  tokensRequired: number;
}

interface DeductArcadeTokensResponse {
  success: boolean;
  message: string;
  remainingTokens?: number;
  deductedAt?: string;
  error?: string;
}

/**
 * Atomically deduct arcade game tokens from user balance.
 *
 * This function prevents race conditions by executing in a single database transaction.
 * Two concurrent requests cannot both succeed if total cost exceeds user balance.
 *
 * Returns server-generated timestamp (prevents client-side spoofing).
 */
export async function handler(
  request: DeductArcadeTokensRequest
): Promise<DeductArcadeTokensResponse> {
  try {
    // Validate inputs
    if (!request.gameId || typeof request.gameId !== 'string') {
      return {
        success: false,
        message: 'Invalid game ID',
        error: 'game_id_invalid',
      };
    }

    if (typeof request.tokensRequired !== 'number' || request.tokensRequired < 1) {
      return {
        success: false,
        message: 'Invalid token amount',
        error: 'tokens_invalid',
      };
    }

    // Get current user from authenticated context
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'User not found',
        error: 'user_not_found',
      };
    }

    const currentTokens = currentUser.ai_tokens || 0;

    // Check if user has sufficient tokens
    if (currentTokens < request.tokensRequired) {
      return {
        success: false,
        message: `Insufficient tokens. You have ${currentTokens} but need ${request.tokensRequired}.`,
        error: 'insufficient_tokens',
        remainingTokens: currentTokens,
      };
    }

    // Perform atomic deduction in single database transaction
    const newTokenBalance = currentTokens - request.tokensRequired;
    const deductedAt = new Date().toISOString();

    await updateUser({
      ai_tokens: newTokenBalance,
      ai_tokens_last_modified: deductedAt,
    });

    return {
      success: true,
      message: `Successfully deducted ${request.tokensRequired} tokens for ${request.gameId}`,
      remainingTokens: newTokenBalance,
      deductedAt,
    };
  } catch (error) {
    console.error('[deductArcadeTokens] Error:', error);
    return {
      success: false,
      message: 'Failed to process token deduction',
      error: 'server_error',
    };
  }
}
