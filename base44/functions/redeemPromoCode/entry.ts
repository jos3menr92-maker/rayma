import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { code, userId } = await req.json();

    if (!code || typeof code !== 'string') {
      return Response.json({ error: 'Invalid code' }, { status: 400 });
    }
    if (!userId || typeof userId !== 'string') {
      return Response.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Initialize Supabase client for promo validation/redemption
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('VITE_SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) {
      return Response.json({ error: 'Supabase credentials not configured' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 1. Validate the promo code in Supabase
    const { data: promoCode, error: fetchError } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('is_active', true)
      .single();

    if (fetchError || !promoCode) {
      return Response.json({ error: 'Promo code not found or inactive' }, { status: 404 });
    }

    // 2. Check expiry
    if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
      return Response.json({ error: 'This promo code has expired' }, { status: 400 });
    }

    // 3. Check max uses
    if (promoCode.max_uses && (promoCode.times_used || 0) >= promoCode.max_uses) {
      return Response.json({ error: 'This promo code has reached its usage limit' }, { status: 400 });
    }

    // 4. Check if user already redeemed (anti-reuse lock)
    const { data: existingRedemption } = await supabase
      .from('promo_redemptions')
      .select('id')
      .eq('promo_code_id', promoCode.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingRedemption) {
      return Response.json({ error: 'You have already redeemed this code' }, { status: 400 });
    }

    // 5. Apply reward via Base44 User entity
    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    const user = users[0];
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    let rewardMessage = '';

    if (promoCode.reward_type === 'energy_bars') {
      const currentEnergy = user.energy_bars || 0;
      const newEnergy = currentEnergy + (promoCode.reward_value || 0);
      await base44.asServiceRole.entities.User.update(userId, { energy_bars: newEnergy });
      rewardMessage = `You've unlocked ${promoCode.reward_value} Energy Bars! ⚡`;
    } else if (promoCode.reward_type === 'tokens') {
      const currentTokens = user.ai_tokens || 0;
      const newTokens = currentTokens + (promoCode.reward_value || 0);
      await base44.asServiceRole.entities.User.update(userId, { ai_tokens: newTokens });
      rewardMessage = `You've been granted ${promoCode.reward_value} AI tokens! 🤖`;
    } else if (promoCode.reward_type === 'annual_pass') {
      let baseDate = new Date();
      if (user.annual_pass_expires_at) {
        const currentExpiry = new Date(user.annual_pass_expires_at);
        if (currentExpiry > baseDate) baseDate = currentExpiry;
      }
      baseDate.setFullYear(baseDate.getFullYear() + 1);
      await base44.asServiceRole.entities.User.update(userId, {
        annual_pass_expires_at: baseDate.toISOString().split('T')[0],
      });
      rewardMessage = `You've been granted the Annual Pass! 🎉`;
    } else {
      return Response.json({ error: `Unsupported reward type: ${promoCode.reward_type}` }, { status: 400 });
    }

    // 6. Lock the code — insert redemption record
    const { error: insertError } = await supabase
      .from('promo_redemptions')
      .insert({
        promo_code_id: promoCode.id,
        user_id: userId,
        reward_type: promoCode.reward_type,
        reward_value: promoCode.reward_value,
      });

    if (insertError) {
      console.error('Failed to log redemption:', insertError.message);
      // Reward was applied but lock failed — warn but don't fail the response
    }

    console.log(`✓ Promo code redeemed: ${code} by user ${userId} | Type: ${promoCode.reward_type} | Value: +${promoCode.reward_value}`);

    return Response.json({
      success: true,
      reward_type: promoCode.reward_type,
      reward_value: promoCode.reward_value,
      message: rewardMessage,
    });
  } catch (error) {
    console.error('Promo code redemption error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});