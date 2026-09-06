import { getSupabaseAdmin } from './supabaseClient.ts';
import { getSupaUserIdByEmail } from './supabaseUserLookup.ts';

/**
 * Coin Ledger shared helpers — the single path for syncing the Base44 coin
 * balance (ai_tokens) to the Supabase profiles table, so FinancialDataContext
 * realtime stays in step after every server-side grant or deduction.
 *
 * Consumers: rewardArcadeTokens, spendCoins.
 * Never throws — a Supabase hiccup must not fail a coin operation.
 */
export async function syncAiTokensToProfiles(email, newTokens) {
  try {
    if (!email) return;
    const { client: supabaseAdmin } = getSupabaseAdmin();
    const supaUserId = await getSupaUserIdByEmail(supabaseAdmin, email);
    if (supaUserId) {
      await supabaseAdmin.from('profiles').update({ ai_tokens: newTokens }).eq('id', supaUserId);
    }
  } catch (err) {
    console.warn('[coinLedger] Supabase profile sync failed (non-fatal):', err?.message || err);
  }
}