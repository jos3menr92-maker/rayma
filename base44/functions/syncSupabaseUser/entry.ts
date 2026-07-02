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

    const tempToken = crypto.randomUUID() + crypto.randomUUID();

    let { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: me.email,
      email_confirm: true,
      password: tempToken,
      user_id: me.id 
    });

    if (error && error.message.includes('already exists')) {
      const updateRes = await supabaseAdmin.auth.admin.updateUserById(me.id, {
        password: tempToken
      });
      data = updateRes.data;
      error = updateRes.error;
    }

    if (error) {
      console.error("Supabase user sync failed:", error.message);
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, tempToken });
  } catch (error) {
    console.error("syncSupabaseUser error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
