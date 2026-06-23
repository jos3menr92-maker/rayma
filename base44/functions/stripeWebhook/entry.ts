import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

/**
 * Stripe Webhook Handler
 * ======================
 * Listens for checkout.session.completed events and updates user profiles.
 * 
 * Supported purchase types:
 *   - Token packs: token_pack_10, token_pack_50, token_pack_100 (one-time, add to balance)
 *   - Annual pass: annual_pass (one-time, set expiry 1 year)
 *   - Monthly subscriptions: power_lithium_monthly, power_generator_monthly (recurring, set subscription type)
 *   - Single purchase power tiers: power_insert_coin (one-time instant boost)
 */

const TOKEN_GRANTS = {
  token_pack_10: 10,
  token_pack_50: 50,
  token_pack_100: 100,
};

// Power tier subscription configurations: daily energy bar capacity
const POWER_TIER_CONFIG = {
  power_lithium_monthly: {
    subscription_type: 'power_lithium',
    daily_limit: 50,
  },
  power_lithium_annual: {
    subscription_type: 'power_lithium',
    daily_limit: 50,
  },
  power_generator_monthly: {
    subscription_type: 'power_generator',
    daily_limit: 200,
  },
  power_generator_annual: {
    subscription_type: 'power_generator',
    daily_limit: 200,
  },
};

// Single purchase that boosts energy immediately
const INSTANT_BOOST_CONFIG = {
  power_insert_coin: {
    boost_tokens: 100,
    description: 'Instant energy boost',
  },
};

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

    // Verify webhook signature for security
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    console.log(`Stripe webhook event: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const purchaseType = session.metadata?.purchase_type;

      if (!userId) {
        console.warn('No user_id in session metadata, skipping.');
        return Response.json({ received: true });
      }

      const base44 = createClientFromRequest(req);

      // ===== CASE 1: Token Packs (one-time, add to balance) =====
      if (TOKEN_GRANTS[purchaseType]) {
        const tokensToAdd = TOKEN_GRANTS[purchaseType];
        const users = await base44.asServiceRole.entities.User.filter({ id: userId });
        const userData = users[0];
        const currentTokens = userData?.ai_tokens || 0;
        const newTokens = currentTokens + tokensToAdd;

        await base44.asServiceRole.entities.User.update(userId, {
          ai_tokens: newTokens,
        });

        console.log(`Token pack (${purchaseType}) applied for user ${userId}: +${tokensToAdd} tokens → total ${newTokens}`);

      // ===== CASE 2: Annual Pass (one-time, set 1-year expiry) =====
      } else if (purchaseType === 'annual_pass') {
        const users = await base44.asServiceRole.entities.User.filter({ id: userId });
        const userData = users[0];
        let baseDate = new Date();
        
        // If annual pass is already active, extend from current expiry; otherwise from today
        if (userData?.annual_pass_expires_at) {
          const currentExpiry = new Date(userData.annual_pass_expires_at + 'T00:00:00');
          if (currentExpiry > baseDate) baseDate = currentExpiry;
        }
        baseDate.setFullYear(baseDate.getFullYear() + 1);
        const expiresStr = baseDate.toISOString().split('T')[0];

        await base44.asServiceRole.entities.User.update(userId, {
          annual_pass_expires_at: expiresStr,
        });

        console.log(`Annual pass granted for user ${userId} until ${expiresStr}`);

      // ===== CASE 3: Power Tier Monthly/Annual Subscriptions (recurring, update subscription type + daily limit) =====
      } else if (POWER_TIER_CONFIG[purchaseType]) {
        const tierConfig = POWER_TIER_CONFIG[purchaseType];
        
        await base44.asServiceRole.entities.User.update(userId, {
          subscription_type: tierConfig.subscription_type,
          ai_tokens_daily_limit: tierConfig.daily_limit,
          subscription_start_date: new Date().toISOString().split('T')[0],
        });

        console.log(`Power tier subscription (${purchaseType}) activated for user ${userId}: daily limit set to ${tierConfig.daily_limit} energy bars`);

      // ===== CASE 4: Instant Boost (one-time, add immediate energy) =====
      } else if (INSTANT_BOOST_CONFIG[purchaseType]) {
        const boostConfig = INSTANT_BOOST_CONFIG[purchaseType];
        const users = await base44.asServiceRole.entities.User.filter({ id: userId });
        const userData = users[0];
        const currentTokens = userData?.ai_tokens || 0;
        const newTokens = currentTokens + boostConfig.boost_tokens;

        await base44.asServiceRole.entities.User.update(userId, {
          ai_tokens: newTokens,
        });

        console.log(`Instant boost (${purchaseType}) applied for user ${userId}: +${boostConfig.boost_tokens} tokens → total ${newTokens}`);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 400 });
  }
});