import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      return Response.json({ error: 'Invalid code' }, { status: 400 });
    }

    // Find the promo code — must use service role since PromoCode is admin-only RLS
    const promoCodes = await base44.asServiceRole.entities.PromoCode.filter({ code: code.toUpperCase().trim() });
    const promoCode = promoCodes[0];

    if (!promoCode) {
      return Response.json({ error: 'Promo code not found' }, { status: 404 });
    }

    // Check if code is active
    if (!promoCode.is_active) {
      return Response.json({ error: 'This promo code is no longer active' }, { status: 400 });
    }

    // Check if expired
    const expiresAt = new Date(promoCode.expires_at);
    if (expiresAt < new Date()) {
      return Response.json({ error: 'This promo code has expired' }, { status: 400 });
    }

    // Check if user has already redeemed this code
    if (promoCode.redeemed_by && promoCode.redeemed_by.includes(user.id)) {
      return Response.json({ error: 'You have already redeemed this code' }, { status: 400 });
    }

    // Check max uses
    if (promoCode.max_uses && promoCode.times_used >= promoCode.max_uses) {
      return Response.json({ error: 'This promo code has reached its usage limit' }, { status: 400 });
    }

    // Apply reward
    const userData = await base44.auth.me();
    let updateData = {};

    if (promoCode.reward_type === 'tokens') {
      const currentTokens = userData.ai_tokens || 0;
      updateData.ai_tokens = currentTokens + promoCode.reward_value;
    } else if (promoCode.reward_type === 'annual_pass') {
      let baseDate = new Date();
      if (userData.annual_pass_expires_at) {
        const currentExpiry = new Date(userData.annual_pass_expires_at);
        if (currentExpiry > baseDate) baseDate = currentExpiry;
      }
      baseDate.setFullYear(baseDate.getFullYear() + 1);
      updateData.annual_pass_expires_at = baseDate.toISOString().split('T')[0];
    }

    // Mark user as sponsor/employee
    updateData.is_sponsor = true;

    await base44.asServiceRole.entities.User.update(user.id, updateData);

    // Update promo code usage
    const newRedeemedBy = [...(promoCode.redeemed_by || []), user.id];
    await base44.asServiceRole.entities.PromoCode.update(promoCode.id, {
      times_used: (promoCode.times_used || 0) + 1,
      redeemed_by: newRedeemedBy,
    });

    console.log(`Promo code redeemed: ${code} by user ${user.email}`);

    return Response.json({
      success: true,
      reward_type: promoCode.reward_type,
      reward_value: promoCode.reward_value,
      message: `Welcome, sponsor! You've been granted ${promoCode.reward_type === 'tokens' ? promoCode.reward_value + ' AI tokens' : 'the Annual Pass'}. 🎉`,
    });
  } catch (error) {
    console.error('Promo code redemption error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});