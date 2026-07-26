import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    
    if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase configuration secrets.");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    
    // 🚀 Injected "R@" to guarantee strong password compliance
    const tempToken = "R@" + crypto.randomUUID();

    // 1. Try to create the user in Supabase
    const { error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: me.email,
      email_confirm: true,
      password: tempToken
    });

    if (createError) {
      // 2. If user already exists, list users correctly and update their password
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listError) throw listError;

      const existingUser = users.find(u => u.email === me.email);

      if (existingUser) {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { 
            password: tempToken 
        });
        if (updateError) throw updateError;
      } else {
        throw createError;
      }
    }

    return Response.json({ success: true, tempToken });
  } catch (error) {
    console.error("syncSupabaseUser error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
