import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { syncAiTokensToProfiles } from '../../shared/coinLedger.ts';

/**
 * Server-side coin deduction — the single authority for SPENDING coins
 * (AI chat questions, document scans). The client can no longer skip or
 * forge the deduction: the balance is checked and written here.
 *
 * Payload: { amount: 3, reason: 'chat_question' | 'document_scan' }
 * Returns: { success, remaining, deducted } or { success: false, insufficient: true, remaining }
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, message: 'Unauthorized: Please log in.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount ?? 3);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 20) {
      return Response.json({ success: false, message: 'Invalid amount.' }, { status: 400 });
    }

    const users = await base44.asServiceRole.entities.User.filter({ id: user.id });
    const record = users[0];
    const current = record?.ai_tokens ?? 0;

    if (current < amount) {
      return Response.json({
        success: false,
        insufficient: true,
        remaining: current,
        message: `Not enough coins (${current}/${amount}).`,
      });
    }

    const remaining = current - amount;
    await base44.asServiceRole.entities.User.update(user.id, { ai_tokens: remaining });
    await syncAiTokensToProfiles(user.email, remaining);

    console.log(`[Base44] Coins spent: -${amount} (${body.reason || 'unknown'}) | User ${user.email} | Remaining: ${remaining}`);

    return Response.json({
      success: true,
      deducted: amount,
      remaining,
    });

  } catch (error) {
    console.error('[Base44] Error spending coins:', error);
    return Response.json({ success: false, message: 'Internal server error.' }, { status: 500 });
  }
}