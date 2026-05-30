import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    let event;
    if (webhookSecret && signature) {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body);
    }

    console.log(`Stripe webhook event: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const donationType = session.metadata?.donation_type;

      if (!userId) {
        console.warn('No user_id in session metadata, skipping.');
        return Response.json({ received: true });
      }

      const base44 = createClientFromRequest(req);

      if (donationType === 'donation') {
        // Extend from current expiry if still active, otherwise from today
        const currentUser = await base44.asServiceRole.entities.User.list();
        const userData = currentUser.find(u => u.id === userId);
        let baseDate = new Date();
        if (userData?.rayma_expires_at) {
          const currentExpiry = new Date(userData.rayma_expires_at + 'T00:00:00');
          if (currentExpiry > baseDate) baseDate = currentExpiry;
        }
        baseDate.setMonth(baseDate.getMonth() + 6);
        const expiresStr = baseDate.toISOString().split('T')[0];

        await base44.asServiceRole.entities.User.update(userId, {
          rayma_expires_at: expiresStr,
        });

        console.log(`RAYMA access extended for user ${userId} until ${expiresStr}`);
      } else if (donationType === 'lifetime') {
        // Lifetime: set expiry far in the future
        await base44.asServiceRole.entities.User.update(userId, {
          rayma_expires_at: '2099-12-31',
        });
        console.log(`RAYMA lifetime access granted for user ${userId}`);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 400 });
  }
});