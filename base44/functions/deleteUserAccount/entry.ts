import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSupabaseAdmin } from '../../shared/supabaseClient.ts';
import { permanentlyDeleteUser } from '../../shared/accountWipe.js';

/**
 * deleteUserAccount — hard-wipes the calling user immediately.
 *
 * API contract is unchanged: accepts { supabaseUserId } and returns
 * { success: true }. The wipe logic now lives in the shared accountWipe module
 * so the frontend (this function) and the cron (processExpiredDeletions) stay
 * perfectly in sync.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { supabaseUserId } = body;
    if (!supabaseUserId) {
      return Response.json({ error: 'Supabase user ID required' }, { status: 400 });
    }

    const { client: supabaseAdmin } = getSupabaseAdmin();

    // Verify the Supabase user email matches the Base44 user email (security check).
    const { data: supaUserData, error: lookupError } = await supabaseAdmin.auth.admin.getUserById(supabaseUserId);
    if (lookupError || !supaUserData?.user) {
      return Response.json({ error: 'Supabase user not found' }, { status: 404 });
    }
    if (supaUserData.user.email !== user.email) {
      return Response.json({ error: 'Email mismatch — account deletion denied' }, { status: 403 });
    }

    await permanentlyDeleteUser({
      supabaseAdmin,
      supabaseUserId,
      email: user.email,
      base44,
      base44UserId: user.id,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Account deletion error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});