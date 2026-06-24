import Stripe from 'https://esm.sh/stripe@14.0.0?target=denonext';
import { createClientFromRequest } from 'npm:@base44/sdk@0.1.0';

const PRODUCTS = {
  annual_pass: {
    name: 'RAYMA Annual Pass',
    description: '200 daily Energy Bars + Gold Sponsor Badge (annual)',
    amount: 9599,
    billing_type: 'recurring',
    interval: 'year',
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // --- 🛡️ COMPLIANCE SAFETY INTERCEPTOR ---
    const userAgent = req.headers.get("user-agent") || "";
    
    // Detects requests from an iOS wrapper that aren't using a standard mobile browser
    const isIOSNative = /iPhone|iPad|iPod/.test(userAgent) && !/Safari|Chrome/.test(userAgent);
    // Detects requests from an Android wrapper ('wv' indicates Android WebView)
    const isAndroidNative = /Android/.test(userAgent) && /wv/.test(userAgent);

    if (isIOSNative || isAndroidNative) {
      console.warn('Blocked Stripe checkout attempt from native mobile wrapper.');
      return Response.json({
        error: 'In-app purchases must be made via the web browser to comply with App Store policies.'
      }, { status: 403 });
    }
    // ----------------------------------------

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

    // Build session config with conditional mode based on product type
    const sessionConfig = {
      payment_method_types: ['card'],
      mode: product.billing_type === 'recurring' ? 'subscription' : 'payment',
      success_url: successUrl || `${req.headers.get('origin') || ''}/store?success=true&type=${purchaseType}`,
      cancel_url: cancelUrl || `${req.headers.get('origin') || ''}/store?cancelled=true`,
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
          ...(product.billing_type === 'recurring' && {
            recurring: {
              interval: product.interval,
            },
          }),
        },
        quantity: 1,
      }],
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log(`Checkout session created: ${session.id} for user ${user.email}, type: ${purchaseType}`);
    return Response.json({ url: session.url });

  } catch (error) {
    console.error('Stripe checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
