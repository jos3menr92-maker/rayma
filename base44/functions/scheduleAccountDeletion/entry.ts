import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSupabaseAdmin } from '../../shared/supabaseClient.ts';

/**
 * scheduleAccountDeletion — starts the 30-day grace period.
 *
 * Called from Profile.jsx after the user re-verifies their password. Sets
 * `profiles.deletion_scheduled_at = now() + 30 days` and revokes all active
 * Supabase sessions for the user. The actual data wipe is performed later by
 * the `processExpiredDeletions` cron once the grace period elapses.
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

    // Verify the Supabase user's email matches the Base44 user's email.
    const { data: supaUserData, error: lookupError } = await supabaseAdmin.auth.admin.getUserById(supabaseUserId);
    if (lookupError || !supaUserData?.user) {
      console.error('[scheduleAccountDeletion] Supabase user not found:', lookupError?.message);
      return Response.json({ error: 'Supabase user not found' }, { status: 404 });
    }
    if (supaUserData.user.email !== user.email) {
      return Response.json({ error: 'Email mismatch — deletion denied' }, { status: 403 });
    }

    // Schedule the deletion 30 days from now.
    const deletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ deletion_scheduled_at: deletionDate })
      .eq('id', supabaseUserId);
    if (updateError) {
      console.error('[scheduleAccountDeletion] Failed to set deletion flag:', updateError.message);
      throw updateError;
    }
    console.log(`[scheduleAccountDeletion] Deletion scheduled for ${user.email} (supabase id: ${supabaseUserId}) on ${deletionDate}`);

    // Revoke all Supabase refresh tokens for this user (signs them out everywhere).
    const { error: signOutError } = await supabaseAdmin.auth.admin.signOutByUserId(supabaseUserId);
    if (signOutError) {
      console.error('[scheduleAccountDeletion] signOutByUserId failed:', signOutError.message);
    } else {
      console.log(`[scheduleAccountDeletion] All sessions revoked for ${user.email}`);
    }

    return Response.json({ success: true, deletionDate });
  } catch (error) {
    console.error('[scheduleAccountDeletion] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});