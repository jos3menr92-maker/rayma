import Stripe from 'npm:stripe@14.21.0';

/**
 * Stripe Checkout Session Creator
 * ================================
 * Creates payment checkout sessions for Rayma AI purchases.
 *
 * This is a public app — no base44.auth.me() required.
 * The frontend passes customerEmail and userId from the auth context;
 * they are stored in session metadata so the webhook can grant entitlements.
 *
 * Uses real Stripe Price IDs (created in the Stripe dashboard) instead of
 * inline price_data, so subscriptions, reporting, and the Base44 dashboard
 * all stay in sync.
 */

const PRICE_IDS = {
  power_insert_coin:       { price: 'price_1TngnKIer8UHtVVlwOvzMNxm', mode: 'payment'       },
  power_lithium_monthly:   { price: 'price_1TngnKIer8UHtVVl62W0MUwV', mode: 'subscription' },
  power_lithium_annual:    { price: 'price_1TngnKIer8UHtVVlKajZUkXx', mode: 'subscription' },
  power_generator_monthly: { price: 'price_1TngnKIer8UHtVVlEMHICLqz', mode: 'subscription' },
  power_generator_annual:  { price: 'price_1TngnKIer8UHtVVlrvpDn7Xw', mode: 'subscription' },
};

Deno.serve(async (req) => {
  try {
    // --- 🛡️ COMPLIANCE SAFETY INTERCEPTOR ---
    // Blocks ALL native mobile wrappers so Stripe is never called from inside an app,
    // keeping us compliant with Apple App Store §3.1.1 and Google Play billing policies.
    const userAgent = req.headers.get("user-agent") || "";

    const isReactNative = /ReactNativeWebView/.test(userAgent);
    const isCapacitor = /Capacitor/.test(userAgent);
    const isIOSWebView = /iPhone|iPad|iPod/.test(userAgent) && !/Safari|Chrome/.test(userAgent);
    const isAndroidWebView = /Android/.test(userAgent) && /wv/.test(userAgent);

    if (isReactNative || isCapacitor || isIOSWebView || isAndroidWebView) {
      console.warn(`Blocked Stripe checkout attempt from native mobile wrapper. UA: ${userAgent.substring(0, 120)}`);
      return Response.json({
        error: 'In-app purchases must be made via the native App Store / Play Store to comply with store policies.'
      }, { status: 403 });
    }
    // ----------------------------------------

    const body = await req.json();
    const { purchaseType, successUrl, cancelUrl, customerEmail, userId } = body;

    if (!purchaseType || !PRICE_IDS[purchaseType]) {
      return Response.json({ error: 'Invalid purchaseType. Must be one of: ' + Object.keys(PRICE_IDS).join(', ') }, { status: 400 });
    }

    const isValidUrl = (url) => url && /^https?:\/\//.test(url);
    if ((successUrl && !isValidUrl(successUrl)) || (cancelUrl && !isValidUrl(cancelUrl))) {
      return Response.json({ error: 'Invalid redirect URL' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const priceConfig = PRICE_IDS[purchaseType];

    const sessionConfig = {
      payment_method_types: ['card'],
      mode: priceConfig.mode,
      line_items: [{
        price: priceConfig.price,
        quantity: 1,
      }],
      success_url: successUrl || `${req.headers.get('origin') || ''}/store?success=true&type=${purchaseType}`,
      cancel_url: cancelUrl || `${req.headers.get('origin') || ''}/store?cancelled=true`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        user_id: userId || '',
        user_email: customerEmail || '',
        purchase_type: purchaseType,
      },
    };

    // Pre-fill the Stripe checkout email when available
    if (customerEmail) {
      sessionConfig.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log(`Checkout session created: ${session.id} for ${customerEmail || 'guest'}, type: ${purchaseType}`);
    return Response.json({ url: session.url });

  } catch (error) {
    console.error('Stripe checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});