import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSupabaseAdmin } from '../../shared/supabaseClient.ts';
import { permanentlyDeleteUser } from '../../shared/accountWipe.js';

/**
 * processExpiredDeletions — cron-triggered daily at 03:00 UTC.
 *
 * Finds every profile whose `deletion_scheduled_at` is in the past and
 * permanently wipes the user via the shared accountWipe module. Runs with the
 * service role (no user session). Fail-safe: a failure for one user is logged
 * and the loop continues to the next.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { client: supabaseAdmin } = getSupabaseAdmin();

    const nowIso = new Date().toISOString();
    const { data: expired, error: queryError } = await supabaseAdmin
      .from('profiles')
      .select('id, deletion_scheduled_at')
      .not('deletion_scheduled_at', 'is', null)
      .lt('deletion_scheduled_at', nowIso);

    if (queryError) {
      console.error('[processExpiredDeletions] Query failed:', queryError.message);
      return Response.json({ error: queryError.message }, { status: 500 });
    }

    let processed = 0;
    let errors = 0;

    for (const profile of expired || []) {
      try {
        // Resolve the email from auth.users (profiles may not store it).
        const { data: supaUserData, error: lookupError } = await supabaseAdmin.auth.admin.getUserById(profile.id);
        if (lookupError || !supaUserData?.user) {
          console.error(`[processExpiredDeletions] User lookup failed for ${profile.id}:`, lookupError?.message);
          // Auth user already gone — clear the stale flag so we don't retry forever.
          await supabaseAdmin.from('profiles').update({ deletion_scheduled_at: null }).eq('id', profile.id).catch(() => {});
          errors++;
          continue;
        }

        await permanentlyDeleteUser({
          supabaseAdmin,
          supabaseUserId: profile.id,
          email: supaUserData.user.email,
          base44,
        });
        console.log(`[CRON] Permanently deleted user: ${supaUserData.user.email} (supabase id: ${profile.id})`);
        processed++;
      } catch (err) {
        console.error(`[processExpiredDeletions] Failed for ${profile.id}:`, err.message);
        errors++;
        // fail-safe: continue to the next user
      }
    }

    console.log(`[processExpiredDeletions] Done — processed: ${processed}, errors: ${errors}`);
    return Response.json({ processed, errors });
  } catch (error) {
    console.error('[processExpiredDeletions] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});