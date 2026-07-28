import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

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

    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Supabase credentials not configured' }, { status: 500 });
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the Supabase user email matches the Base44 user email (security check)
    const { data: supaUserData, error: lookupError } = await supabaseAdmin.auth.admin.getUserById(supabaseUserId);
    if (lookupError || !supaUserData?.user) {
      return Response.json({ error: 'Supabase user not found' }, { status: 404 });
    }

    if (supaUserData.user.email !== user.email) {
      return Response.json({ error: 'Email mismatch — deletion scheduling denied' }, { status: 403 });
    }

    // Set deletion_scheduled_at to now() + 30 days
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);
    const deletionDateISO = deletionDate.toISOString();

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ deletion_scheduled_at: deletionDateISO })
      .eq('id', supabaseUserId);

    if (updateError) {
      console.error('Failed to set deletion_scheduled_at:', updateError.message);
      throw updateError;
    }

    console.log(`Deletion scheduled for user ${supabaseUserId} (email: ${user.email}) on ${deletionDateISO}`);

    // Revoke all active Supabase sessions for this user
    const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(supabaseUserId, 'global');
    if (signOutError) {
      console.error('Failed to revoke sessions:', signOutError.message);
      // Non-fatal — continue, the flag is already set
    } else {
      console.log(`All sessions revoked for user ${supabaseUserId}`);
    }

    return Response.json({ success: true, deletionDate: deletionDateISO });
  } catch (error) {
    console.error('Schedule account deletion error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
