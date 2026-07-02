import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAdmin = createClient(
      Deno.env.get("VITE_SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: me.email,
      email_confirm: true,
      password: "RaymaSecurePassword123!",
      user_id: me.id
    });

    if (error) {
      console.error("Supabase user sync failed:", error.message);
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, data });
  } catch (error) {
    console.error("syncSupabaseUser error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});