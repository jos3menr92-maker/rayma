import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.21.0';

/**
 * Stripe Webhook Handler
 * ======================
 * Handles checkout completion, subscription lifecycle events, and payment failures.
 *
 * Events handled:
 *   - checkout.session.completed      → grant entitlements
 *   - customer.subscription.deleted   → revoke premium access
 *   - customer.subscription.updated   → revoke on cancellation/downgrade
 *   - invoice.payment_failed          → revoke premium access
 */

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

    const base44 = createClientFromRequest(req);

    // ===== EVENT: checkout.session.completed — Grant entitlements =====
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const purchaseType = session.metadata?.purchase_type;

      if (!userId) {
        console.warn('No user_id in session metadata, skipping.');
        return Response.json({ received: true });
      }

      // CASE 1: Power Tier Subscriptions (recurring, update subscription type + daily limit)
      if (POWER_TIER_CONFIG[purchaseType]) {
        const tierConfig = POWER_TIER_CONFIG[purchaseType];

        await base44.asServiceRole.entities.User.update(userId, {
          subscription_type: tierConfig.subscription_type,
          ai_tokens_daily_limit: tierConfig.daily_limit,
          subscription_start_date: new Date().toISOString().split('T')[0],
        });

        console.log(`Power tier subscription (${purchaseType}) activated for user ${userId}: daily limit set to ${tierConfig.daily_limit} energy bars`);

      // CASE 2: Instant Boost (one-time, add immediate energy)
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

    // ===== EVENT: customer.subscription.deleted — Subscription cancelled, revoke premium =====
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const userId = subscription.metadata?.user_id;

      if (userId) {
        await base44.asServiceRole.entities.User.update(userId, {
          subscription_type: 'free',
          ai_tokens_daily_limit: 10,
        });
        console.log(`Subscription cancelled (deleted) for user ${userId}. Premium access revoked.`);
      }
    }

    // ===== EVENT: customer.subscription.updated — Handle cancellation/downgrade =====
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const userId = subscription.metadata?.user_id;

      if (userId && subscription.status === 'canceled') {
        await base44.asServiceRole.entities.User.update(userId, {
          subscription_type: 'free',
          ai_tokens_daily_limit: 10,
        });
        console.log(`Subscription updated to 'canceled' for user ${userId}. Premium access revoked.`);
      }
    }

    // ===== EVENT: invoice.payment_failed — Recurring payment failed, revoke premium =====
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const userId = invoice.metadata?.user_id;

      if (userId) {
        await base44.asServiceRole.entities.User.update(userId, {
          subscription_type: 'free',
          ai_tokens_daily_limit: 10,
        });
        console.log(`Payment failed for user ${userId}. Premium access revoked.`);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 400 });
  }
});