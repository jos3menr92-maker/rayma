import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId, customAmount, donationType, successUrl, cancelUrl } = await req.json();

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    const baseMetadata = {
      base44_app_id: Deno.env.get('BASE44_APP_ID'),
      user_id: user.id,
      user_email: user.email,
      donation_type: donationType || 'donation', // 'donation' (6mo RAYMA) or 'lifetime'
    };

    let sessionConfig = {
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: successUrl || `${req.headers.get('origin') || ''}/support?success=true`,
      cancel_url: cancelUrl || `${req.headers.get('origin') || ''}/support?cancelled=true`,
      customer_email: user.email,
      metadata: baseMetadata,
    };

    if (customAmount) {
      // Custom amount — build a price on the fly
      const amountCents = Math.round(parseFloat(customAmount) * 100);
      if (amountCents < 100) {
        return Response.json({ error: 'Minimum donation is $1.00' }, { status: 400 });
      }
      sessionConfig.line_items = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: donationType === 'lifetime' ? 'RAYMA Lifetime Access' : 'RAYMA 6-Month Donation',
            description: donationType === 'lifetime'
              ? 'One-time payment for lifetime access to RAYMA'
              : 'Support RAYMA for 6 months — keeps AI features running',
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }];
    } else if (priceId) {
      sessionConfig.line_items = [{ price: priceId, quantity: 1 }];
    } else {
      return Response.json({ error: 'priceId or customAmount is required' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    console.log(`Checkout session created: ${session.id} for user ${user.email}, type: ${donationType}`);
    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});