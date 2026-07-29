import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSupabaseAdmin } from '../../shared/supabaseClient.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();

    if (!me || !me.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      return Response.json({ error: 'Invalid code' }, { status: 400 });
    }

    // 1. Look up promo code in the Base44 PromoCode entity (service role bypasses RLS)
    const promoCodes = await base44.asServiceRole.entities.PromoCode.filter({
      code: code.toUpperCase().trim(),
      is_active: true
    });
    const promoCode = promoCodes[0];

    if (!promoCode) {
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

    // 4. Check if user already redeemed (anti-reuse lock via redeemed_by array)
    const redeemedBy = promoCode.redeemed_by || [];
    if (redeemedBy.includes(me.id)) {
      return Response.json({ error: 'You have already redeemed this code' }, { status: 400 });
    }

    // 5. Lock the code — add user to redeemed_by and increment times_used BEFORE granting reward
    await base44.asServiceRole.entities.PromoCode.update(promoCode.id, {
      redeemed_by: [...redeemedBy, me.id],
      times_used: (promoCode.times_used || 0) + 1,
    });

    // 6. Grant the reward
    const users = await base44.asServiceRole.entities.User.filter({ id: me.id });
    const userRecord = users[0];
    if (!userRecord) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    let rewardMessage = '';
    let updatedFields = {};

    if (promoCode.reward_type === 'tokens') {
      const currentTokens = userRecord.ai_tokens || 0;
      const newTokens = currentTokens + (promoCode.reward_value || 0);
      updatedFields = { ai_tokens: newTokens };
      rewardMessage = `You've been granted ${promoCode.reward_value} AI tokens! 🤖`;
    } else if (promoCode.reward_type === 'energy_bars') {
      const currentBars = userRecord.energy_bars || 0;
      const newBars = currentBars + (promoCode.reward_value || 0);
      updatedFields = { energy_bars: newBars };
      rewardMessage = `You've been granted ${promoCode.reward_value} Energy Bars! ⚡`;
    } else if (promoCode.reward_type === 'annual_pass') {
      let baseDate = new Date();
      if (userRecord.annual_pass_expires_at) {
        const currentExpiry = new Date(userRecord.annual_pass_expires_at);
        if (currentExpiry > baseDate) baseDate = currentExpiry;
      }
      baseDate.setFullYear(baseDate.getFullYear() + 1);
      updatedFields = { annual_pass_expires_at: baseDate.toISOString().split('T')[0] };
      rewardMessage = `You've been granted the Annual Pass! 🎉`;
    } else if (promoCode.reward_type === 'game_access') {
      let baseDate = new Date();
      if (userRecord.game_access_expires_at) {
        const currentExpiry = new Date(userRecord.game_access_expires_at);
        if (currentExpiry > baseDate) baseDate = currentExpiry;
      }
      baseDate.setDate(baseDate.getDate() + 30);
      updatedFields = { game_access_expires_at: baseDate.toISOString().split('T')[0] };
      rewardMessage = `You've been granted 30 days of sponsor game access! 🎮`;
    } else {
      // Unsupported type — roll back the redemption lock
      await base44.asServiceRole.entities.PromoCode.update(promoCode.id, {
        redeemed_by: redeemedBy,
        times_used: promoCode.times_used || 0,
      });
      return Response.json({ error: `Unsupported reward type: ${promoCode.reward_type}` }, { status: 400 });
    }

    // Update Base44 User
    await base44.asServiceRole.entities.User.update(me.id, updatedFields);

    // Also update Supabase profiles table (best-effort — resolves UUID from email)
    try {
      const { client: supabase, url: supabaseUrl } = getSupabaseAdmin();
      const serviceKeyRaw = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
      const keyMatch = serviceKeyRaw.match(/eyJ[A-Za-z0-9_\-.]+/);
      const supabaseKey = keyMatch ? keyMatch[0] : serviceKeyRaw.trim();

      // Resolve Supabase UUID from email
      let page = 1;
      let supaUuid = null;
      while (!supaUuid) {
        const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=100`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
        });
        if (!listRes.ok) break;
        const listData = await listRes.json();
        const usersList = listData.users || [];
        if (usersList.length === 0) break;
        supaUuid = usersList.find(u => u.email?.toLowerCase() === me.email?.toLowerCase())?.id;
        if (usersList.length < 100) break;
        page++;
      }

      if (supaUuid) {
        await supabase.from('profiles').update(updatedFields).eq('id', supaUuid);
      }
    } catch (profileErr) {
      console.warn('Profile sync failed (non-fatal):', profileErr.message);
    }

    console.log(`✓ Promo code redeemed: ${code} by user ${me.email} | Type: ${promoCode.reward_type} | Value: +${promoCode.reward_value}`);

    return Response.json({
      success: true,
      reward_type: promoCode.reward_type,
      reward_value: promoCode.reward_value,
      message: rewardMessage,
      updated_fields: updatedFields,
    });
  } catch (error) {
    console.error('Promo code redemption error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});