import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { permanentlyDeleteUser } from '../../shared/accountWipe.js';

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Supabase credentials not configured' }, { status: 500 });
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Use service role for Base44 operations (no user session in cron context)
    const base44 = createClientFromRequest(req);
    const base44ServiceRole = base44.asServiceRole;

    // Find all profiles where deletion_scheduled_at is in the past
    const { data: expiredProfiles, error: queryError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .not('deletion_scheduled_at', 'is', null)
      .lt('deletion_scheduled_at', new Date().toISOString());

    if (queryError) {
      console.error('Failed to query expired profiles:', queryError.message);
      return Response.json({ error: queryError.message }, { status: 500 });
    }

    if (!expiredProfiles || expiredProfiles.length === 0) {
      console.log('[CRON] No expired deletion requests found.');
      return Response.json({ processed: 0, errors: 0 });
    }

    console.log(`[CRON] Found ${expiredProfiles.length} expired deletion request(s).`);

    let processed = 0;
    let errors = 0;

    for (const profile of expiredProfiles) {
      try {
        // If profiles table does not store email, fall back to auth.users
        let email = profile.email;
        if (!email) {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id);
          email = authUser?.user?.email;
        }

        if (!email) {
          console.error(`[CRON] Could not resolve email for profile id: ${profile.id} — skipping.`);
          errors++;
          continue;
        }

        await permanentlyDeleteUser({
          supabaseAdmin,
          supabaseUserId: profile.id,
          email,
          base44ServiceRole,
        });

        console.log(`[CRON] Permanently deleted user: ${email} (supabase id: ${profile.id})`);
        processed++;
      } catch (err) {
        console.error(`[CRON] Failed to delete user ${profile.id}:`, err.message);
        errors++;
        // Fail-safe: continue to next user
      }
    }

    console.log(`[CRON] Done. Processed: ${processed}, Errors: ${errors}`);
    return Response.json({ processed, errors });
  } catch (error) {
    console.error('[CRON] processExpiredDeletions fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
