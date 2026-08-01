import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import Stripe from 'npm:stripe@14.21.0';

/**
 * Stripe Webhook Handler — Rayma AI Coin Model
 * ============================================
 * 1 coin = 1/3 of a question or scan. 3 coins per chat question, 3 per scan.
 *
 * Tiers:
 *   - Insert Coin:  +30 coins (one-time)          $2.99
 *   - Lithium:      +100 coins (monthly grant)    $4.99/mo
 *   - Generator:    +200 coins (monthly grant)    $9.99/mo
 *   - Unlimited:    ∞ (no coin counting)          $34.99/mo
 *
 * Purchased + earned coins carry over forever. Free users get 15 coins/week
 * (topped up weekly, not carried over) — handled by resetDailyEnergyBars.
 *
 * Events:
 *   checkout.session.completed   → set subscription_type, grant initial coins
 *   invoice.paid                  → grant monthly coins on renewal (subscription_cycle)
 *   customer.subscription.deleted → revoke premium
 *   customer.subscription.updated → revoke on cancellation
 *   invoice.payment_failed        → revoke premium
 */

// Monthly coin grants per subscription tier (granted on checkout + each renewal)
const POWER_TIER_CONFIG = {
  power_lithium_monthly:   { subscription_type: 'power_lithium',   coins_grant: 100 },
  power_lithium_annual:    { subscription_type: 'power_lithium',   coins_grant: 100 },
  power_generator_monthly: { subscription_type: 'power_generator', coins_grant: 200 },
  power_generator_annual:  { subscription_type: 'power_generator', coins_grant: 200 },
  power_unlimited_monthly: { subscription_type: 'power_unlimited', coins_grant: 0  },
  power_unlimited_annual:  { subscription_type: 'power_unlimited', coins_grant: 0  },
};

// One-time coin pack
const INSTANT_BOOST_CONFIG = {
  power_insert_coin: { coins_grant: 30, description: 'Insert Coin — +30 coins' },
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

    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    console.log(`Stripe webhook event: ${event.type}`);

    const base44 = createClientFromRequest(req);

    // ===== checkout.session.completed — initial purchase: set tier + grant coins =====
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const purchaseType = session.metadata?.purchase_type;

      if (!userId) {
        console.warn('No user_id in session metadata, skipping.');
        return Response.json({ received: true });
      }

      // Subscription tier — set subscription_type and grant initial coins
      if (POWER_TIER_CONFIG[purchaseType]) {
        const tierConfig = POWER_TIER_CONFIG[purchaseType];
        const updateFields = {
          subscription_type: tierConfig.subscription_type,
          subscription_start_date: new Date().toISOString().split('T')[0],
        };

        // Grant initial coins for Lithium/Generator (Unlimited has coins_grant 0)
        if (tierConfig.coins_grant > 0) {
          const users = await base44.asServiceRole.entities.User.filter({ id: userId });
          const current = users[0]?.ai_tokens || 0;
          updateFields.ai_tokens = current + tierConfig.coins_grant;
        }

        await base44.asServiceRole.entities.User.update(userId, updateFields);
        console.log(`Subscription ${purchaseType} activated for ${userId}: ${tierConfig.subscription_type}, +${tierConfig.coins_grant} coins`);

      // One-time coin pack (Insert Coin)
      } else if (INSTANT_BOOST_CONFIG[purchaseType]) {
        const boost = INSTANT_BOOST_CONFIG[purchaseType];
        const users = await base44.asServiceRole.entities.User.filter({ id: userId });
        const current = users[0]?.ai_tokens || 0;
        await base44.asServiceRole.entities.User.update(userId, {
          ai_tokens: current + boost.coins_grant,
        });
        console.log(`Insert Coin (${purchaseType}) for ${userId}: +${boost.coins_grant} coins → ${current + boost.coins_grant}`);
      }
    }

    // ===== invoice.paid — grant monthly coins on subscription renewal =====
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object;
      const userId = invoice.metadata?.user_id;
      const purchaseType = invoice.metadata?.purchase_type;
      const billingReason = invoice.billing_reason; // 'subscription_create' | 'subscription_cycle' | ...

      // Only grant on renewal cycles — initial grant already happened on checkout
      if (userId && purchaseType && billingReason === 'subscription_cycle' && POWER_TIER_CONFIG[purchaseType]) {
        const tierConfig = POWER_TIER_CONFIG[purchaseType];
        if (tierConfig.coins_grant > 0) {
          const users = await base44.asServiceRole.entities.User.filter({ id: userId });
          const current = users[0]?.ai_tokens || 0;
          await base44.asServiceRole.entities.User.update(userId, {
            ai_tokens: current + tierConfig.coins_grant,
          });
          console.log(`Monthly renewal ${purchaseType} for ${userId}: +${tierConfig.coins_grant} coins → ${current + tierConfig.coins_grant}`);
        }
      }
    }

    // ===== customer.subscription.deleted — cancelled: revoke premium =====
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const userId = subscription.metadata?.user_id;
      if (userId) {
        await base44.asServiceRole.entities.User.update(userId, {
          subscription_type: 'free',
        });
        console.log(`Subscription cancelled (deleted) for ${userId}. Reverted to free.`);
      }
    }

    // ===== customer.subscription.updated — cancellation/downgrade =====
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const userId = subscription.metadata?.user_id;
      if (userId && subscription.status === 'canceled') {
        await base44.asServiceRole.entities.User.update(userId, {
          subscription_type: 'free',
        });
        console.log(`Subscription updated to 'canceled' for ${userId}. Reverted to free.`);
      }
    }

    // ===== invoice.payment_failed — failed renewal: revoke premium =====
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const userId = invoice.metadata?.user_id;
      if (userId) {
        await base44.asServiceRole.entities.User.update(userId, {
          subscription_type: 'free',
        });
        console.log(`Payment failed for ${userId}. Reverted to free.`);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 400 });
  }
});