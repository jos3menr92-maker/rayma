import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const TOKEN_GRANTS = {
  token_pack_10: 10,
  token_pack_50: 50,
  token_pack_100: 100,
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

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const purchaseType = session.metadata?.purchase_type;

      if (!userId) {
        console.warn('No user_id in session metadata, skipping.');
        return Response.json({ received: true });
      }

      const base44 = createClientFromRequest(req);

      if (TOKEN_GRANTS[purchaseType]) {
        // Token pack — add tokens to user's balance
        const tokensToAdd = TOKEN_GRANTS[purchaseType];
        const users = await base44.asServiceRole.entities.User.filter({ id: userId });
        const userData = users[0];
        const currentTokens = userData?.ai_tokens || 0;
        const newTokens = currentTokens + tokensToAdd;

        await base44.asServiceRole.entities.User.update(userId, {
          ai_tokens: newTokens,
        });

        console.log(`Token pack (${purchaseType}) applied for user ${userId}: +${tokensToAdd} tokens → total ${newTokens}`);

      } else if (purchaseType === 'annual_pass') {
        // Annual pass — set expiry 1 year from now (or from current expiry if still active)
        const users = await base44.asServiceRole.entities.User.filter({ id: userId });
        const userData = users[0];
        let baseDate = new Date();
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
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 400 });
  }
});