import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    
    if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Safely look for either environment variable name
    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase configuration secrets.");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    
    // 🚀 FIXED: Injected "R@" to guarantee strong password compliance
    const tempToken = "R@" + crypto.randomUUID();

    // 1. Fetch existing users to find the correct Supabase UUID by email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const existingUser = users.find(u => u.email === me.email);

    if (existingUser) {
      // 2. If they exist, update using the REAL Supabase ID
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { 
          password: tempToken 
      });
      if (updateError) throw updateError;
    } else {
      // 3. If they don't exist, let Supabase create them and generate a valid UUID
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: me.email,
        email_confirm: true,
        password: tempToken
      });
      if (createError) throw createError;
    }

    return Response.json({ success: true, tempToken });
  } catch (error) {
    console.error("syncSupabaseUser error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});