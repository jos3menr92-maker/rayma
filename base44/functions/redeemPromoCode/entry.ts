import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      return Response.json({ error: 'Invalid code' }, { status: 400 });
    }

    const userId = user.id;

    // Initialize Supabase admin client to bypass RLS for promo code lookups
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Supabase credentials not configured' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // 5. Lock the code FIRST — insert redemption record BEFORE granting any reward
    //    This prevents race conditions where the reward is applied but the anti-reuse lock fails.
    const { error: insertError } = await supabase
      .from('promo_redemptions')
      .insert({
        promo_code_id: promoCode.id,
        user_id: userId,
        reward_type: promoCode.reward_type,
        reward_value: promoCode.reward_value,
      });

    if (insertError) {
      console.error('Failed to log redemption (aborting reward grant):', insertError.message);
      throw new Error(`Failed to redeem promo code: ${insertError.message}`);
    }

    // 6. Increment the usage counter on the promo code
    await supabase
      .from('promo_codes')
      .update({ times_used: (promoCode.times_used || 0) + 1 })
      .eq('id', promoCode.id);

    // 7. Now safely grant the reward — the lock is already in place
    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    const userRecord = users[0];
    if (!userRecord) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    let rewardMessage = '';

    if (promoCode.reward_type === 'tokens') {
      const currentTokens = userRecord.ai_tokens || 0;
      const newTokens = currentTokens + (promoCode.reward_value || 0);
      await base44.asServiceRole.entities.User.update(userId, { ai_tokens: newTokens });
      rewardMessage = `You've been granted ${promoCode.reward_value} AI tokens! 🤖`;
    } else if (promoCode.reward_type === 'annual_pass') {
      let baseDate = new Date();
      if (userRecord.annual_pass_expires_at) {
        const currentExpiry = new Date(userRecord.annual_pass_expires_at);
        if (currentExpiry > baseDate) baseDate = currentExpiry;
      }
      baseDate.setFullYear(baseDate.getFullYear() + 1);
      await base44.asServiceRole.entities.User.update(userId, {
        annual_pass_expires_at: baseDate.toISOString().split('T')[0],
      });
      rewardMessage = `You've been granted the Annual Pass! 🎉`;
    } else {
      // Unsupported type — roll back the redemption lock
      await supabase.from('promo_redemptions').delete().eq('promo_code_id', promoCode.id).eq('user_id', userId);
      return Response.json({ error: `Unsupported reward type: ${promoCode.reward_type}` }, { status: 400 });
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