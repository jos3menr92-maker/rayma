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
      return Response.json({ error: 'Email mismatch — account deletion denied' }, { status: 403 });
    }

    // Delete the Supabase auth user — frees up the email for re-registration (Apple 5.1.1)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);
    if (deleteError) throw deleteError;
    console.log(`Supabase auth user deleted: ${supabaseUserId} (email: ${user.email})`);

    // Wipe legacy Base44 entity data to ensure zero orphaned PII remains on Base44 servers
    const legacyEntities = ['NetWorthSnapshot', 'UserMemory', 'ScannedDocument'];
    for (const entity of legacyEntities) {
      try {
        await base44.asServiceRole.entities[entity].deleteMany({ created_by: user.email });
        console.log(`${entity} records deleted for ${user.email}`);
      } catch (e) {
        console.error(`${entity} cleanup failed:`, e.message);
      }
    }

    // Delete the Base44 user record using service role (no client-side SDK method exists)
    try {
      await base44.asServiceRole.entities.User.delete(user.id);
      console.log(`Base44 user deleted: ${user.id} (email: ${user.email})`);
    } catch (b44Err) {
      console.error('Base44 user deletion failed (Supabase user already deleted):', b44Err.message);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Account deletion error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});