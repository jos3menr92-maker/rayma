import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

// Payment types:
//   'token_pack_10'  — $0.99  → +10 AI tokens
//   'token_pack_50'  — $3.99  → +50 AI tokens
//   'token_pack_100' — $6.99  → +100 AI tokens
//   'annual_pass'    — $19.99 → unlimited AI for 1 year

const PRODUCTS = {
  token_pack_10:  { name: 'RAYMA Token Pack (10)',  description: '10 AI consultations',             amount: 99  },
  token_pack_50:  { name: 'RAYMA Token Pack (50)',  description: '50 AI consultations',             amount: 399 },
  token_pack_100: { name: 'RAYMA Token Pack (100)', description: '100 AI consultations',            amount: 699 },
  annual_pass:    { name: 'RAYMA Annual Pass',      description: 'Unlimited AI for 1 year',        amount: 1999 },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { purchaseType, successUrl, cancelUrl } = body;

    if (!purchaseType || !PRODUCTS[purchaseType]) {
      return Response.json({ error: 'Invalid purchaseType. Must be one of: ' + Object.keys(PRODUCTS).join(', ') }, { status: 400 });
    }

    const isValidUrl = (url) => url && /^https?:\/\//.test(url);
    if ((successUrl && !isValidUrl(successUrl)) || (cancelUrl && !isValidUrl(cancelUrl))) {
      return Response.json({ error: 'Invalid redirect URL' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const product = PRODUCTS[purchaseType];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: successUrl || `${req.headers.get('origin') || ''}/support?success=true&type=${purchaseType}`,
      cancel_url: cancelUrl || `${req.headers.get('origin') || ''}/support?cancelled=true`,
      customer_email: user.email,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        user_id: user.id,
        user_email: user.email,
        purchase_type: purchaseType,
      },
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: product.name, description: product.description },
          unit_amount: product.amount,
        },
        quantity: 1,
      }],
    });

    console.log(`Checkout session created: ${session.id} for user ${user.email}, type: ${purchaseType}`);
    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});