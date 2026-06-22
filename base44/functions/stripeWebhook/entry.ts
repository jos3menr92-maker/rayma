import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

// One-time token packs: purchase_type → tokens to add
const TOKEN_GRANTS: Record<string, number> = {
  token_pack_10: 10,
  token_pack_50: 50,
  token_pack_100: 100,
};

// Subscription tiers: purchase_type → { tier name, subscription duration in months }
const SUBSCRIPTION_TIERS: Record<string, { tier: string; months: number }> = {
  power_lithium_monthly:   { tier: 'power_lithium',   months: 1  },
  power_lithium_annual:    { tier: 'power_lithium',   months: 12 },
  power_generator_monthly: { tier: 'power_generator', months: 1  },
  power_generator_annual:  { tier: 'power_generator', months: 12 },
};

// Energy bars added by each subscription tier daily (also used for UI reference)
const DAILY_ENERGY_BY_TIER: Record<string, number> = {
  power_lithium:   50,
  power_generator: 200,
};

// One-time "Insert Coin" energy restore — fills up 100 bars immediately
const INSERT_COIN_ENERGY = 100;

Deno.serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!webhookSecret || !signature) {
      console.error('Webhook rejected: missing signature or webhook secret');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    console.log(`Stripe webhook event: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId      = session.metadata?.user_id;
      const purchaseType = session.metadata?.purchase_type;

      if (!userId) {
        console.warn('No user_id in session metadata, skipping.');
        return Response.json({ received: true });
      }

      const base44 = createClientFromRequest(req);

      // ── 1. TOKEN PACKS ─────────────────────────────────────────────────────
      if (TOKEN_GRANTS[purchaseType]) {
        const tokensToAdd = TOKEN_GRANTS[purchaseType];
        const users   = await base44.asServiceRole.entities.User.filter({ id: userId });
        const userData = users[0];

        // Add tokens on top of existing balance (never overwrite)
        const currentTokens = userData?.ai_tokens || 0;
        const newTokens     = currentTokens + tokensToAdd;

        await base44.asServiceRole.entities.User.update(userId, {
          ai_tokens: newTokens,
        });

        console.log(`Token pack (${purchaseType}) applied for user ${userId}: +${tokensToAdd} → total ${newTokens}`);

      // ── 2. POWER INSERT COIN (one-time energy restore) ─────────────────────
      } else if (purchaseType === 'power_insert_coin') {
        const users    = await base44.asServiceRole.entities.User.filter({ id: userId });
        const userData = users[0];

        // Add INSERT_COIN_ENERGY on top of current bars so we don't discard existing energy
        const currentEnergy = userData?.energy_bars || 0;
        const newEnergy     = currentEnergy + INSERT_COIN_ENERGY;

        await base44.asServiceRole.entities.User.update(userId, {
          energy_bars: newEnergy,
        });

        console.log(`Insert Coin applied for user ${userId}: +${INSERT_COIN_ENERGY} bars → total ${newEnergy}`);

      // ── 3. SUBSCRIPTION TIERS (power_lithium / power_generator) ────────────
      } else if (SUBSCRIPTION_TIERS[purchaseType]) {
        const { tier, months } = SUBSCRIPTION_TIERS[purchaseType];

        // Calculate expiry: extend from today (or from current expiry if still active)
        const users    = await base44.asServiceRole.entities.User.filter({ id: userId });
        const userData = users[0];

        let baseDate = new Date();
        if (userData?.subscription_expires_at) {
          const currentExpiry = new Date(userData.subscription_expires_at + 'T00:00:00Z');
          // If their current sub is still active, stack the new period on top
          if (currentExpiry > baseDate) baseDate = currentExpiry;
        }
        baseDate.setMonth(baseDate.getMonth() + months);
        const expiresStr = baseDate.toISOString().split('T')[0];

        // Grant them their daily energy immediately on purchase
        const dailyEnergy   = DAILY_ENERGY_BY_TIER[tier] || 10;
        const currentEnergy = userData?.energy_bars || 0;
        const newEnergy     = Math.max(currentEnergy, dailyEnergy);

        await base44.asServiceRole.entities.User.update(userId, {
          subscription_tier:       tier,
          subscription_expires_at: expiresStr,
          energy_bars:             newEnergy,
        });

        console.log(
          `Subscription (${purchaseType}) granted for user ${userId}: ` +
          `tier=${tier}, expires=${expiresStr}, energy=${newEnergy}`
        );

      // ── 4. ANNUAL PASS (legacy / one-year unlimited) ────────────────────────
      } else if (purchaseType === 'annual_pass') {
        const users    = await base44.asServiceRole.entities.User.filter({ id: userId });
        const userData = users[0];

        let baseDate = new Date();
        if (userData?.annual_pass_expires_at) {
          const currentExpiry = new Date(userData.annual_pass_expires_at + 'T00:00:00Z');
          if (currentExpiry > baseDate) baseDate = currentExpiry;
        }
        baseDate.setFullYear(baseDate.getFullYear() + 1);
        const expiresStr = baseDate.toISOString().split('T')[0];

        await base44.asServiceRole.entities.User.update(userId, {
          annual_pass_expires_at: expiresStr,
        });

        console.log(`Annual pass granted for user ${userId} until ${expiresStr}`);

      } else {
        console.warn(`Unknown purchase_type "${purchaseType}" for user ${userId} — no action taken.`);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 400 });
  }
});
