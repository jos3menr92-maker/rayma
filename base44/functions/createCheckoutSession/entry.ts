import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

/**
 * Stripe Checkout Session Creator
 * ================================
 * Creates payment checkout sessions for all RAYMA purchase types.
 * 
 * Payment types:
 *   'token_pack_10'      — $0.99  → +10 AI tokens (one-time)
 *   'token_pack_50'      — $3.99  → +50 AI tokens (one-time)
 *   'token_pack_100'     — $6.99  → +100 AI tokens (one-time)
 *   'power_insert_coin'  — $1.99  → +100 instant energy (one-time)
 *   'annual_pass'        — $19.99 → unlimited AI for 1 year (one-time)
 *   'power_lithium_monthly'  — $5.99/mo  → 50 daily energy bars (recurring)
 *   'power_lithium_annual'   — $49.99/yr → 50 daily energy bars (recurring)
 *   'power_generator_monthly' — $11.99/mo → 200 daily energy bars (recurring)
 *   'power_generator_annual'  — $95.99/yr → 200 daily energy bars (recurring)
 */

const PRODUCTS = {
  // Token packs: one-time purchases that add to token balance
  token_pack_10:  { 
    name: 'RAYMA Token Pack (10)',  
    description: '10 AI consultations',             
    amount: 99,
    billing_type: 'one_time',
  },
  token_pack_50:  { 
    name: 'RAYMA Token Pack (50)',  
    description: '50 AI consultations',             
    amount: 399,
    billing_type: 'one_time',
  },
  token_pack_100: { 
    name: 'RAYMA Token Pack (100)', 
    description: '100 AI consultations',            
    amount: 699,
    billing_type: 'one_time',
  },
  
  // Annual pass: one-time, year-long AI access
  annual_pass:    { 
    name: 'RAYMA Annual Pass',      
    description: 'Unlimited AI for 1 year',        
    amount: 1999,
    billing_type: 'one_time',
  },
  
  // Instant boost: one-time, immediate energy restoration
  power_insert_coin: {
    name: 'RAYMA Insert Coin',
    description: 'Instantly restore 100 energy',
    amount: 199,
    billing_type: 'one_time',
  },
  
  // Power tier monthly: recurring subscription for daily energy capacity boost
  power_lithium_monthly: {
    name: 'Lithium Upgrade (Monthly)',
    description: 'Upgrade your daily capacity to 50 Energy Bars',
    amount: 599,
    billing_type: 'recurring',
    interval: 'month',
  },
  power_lithium_annual: {
    name: 'Lithium Upgrade (Annual)',
    description: 'Upgrade your daily capacity to 50 Energy Bars (annual)',
    amount: 4999,
    billing_type: 'recurring',
    interval: 'year',
  },
  
  // Power tier generator: recurring subscription for daily energy capacity boost
  power_generator_monthly: {
    name: 'Arcade Generator (Monthly)',
    description: '200 daily Energy Bars + Gold Sponsor Badge',
    amount: 1199,
    billing_type: 'recurring',
    interval: 'month',
  },
  power_generator_annual: {
    name: 'Arcade Generator (Annual)',
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
