import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    
    if (!me) return Response.json({ error: 'Unauthorized', reason: 'Base44 auth failed' }, { status: 401 });

    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase configuration secrets (URL or SERVICE_ROLE_KEY).");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    const tempToken = "R@" + crypto.randomUUID();

    // 1. Try to create the user in Supabase
    const { error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: me.email,
      email_confirm: true,
      password: tempToken
    });

    if (createError) {
      // 2. If user exists, paginate through the user list until we find them
      let existingUser = null;
      let page = 1;
      
      while (!existingUser) {
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 50 });
        if (listError) throw new Error(`ListUsers failed: ${listError.message || JSON.stringify(listError)}`);
        
        // Case-insensitive match to be perfectly safe
        existingUser = users.find(u => u.email.toLowerCase() === me.email.toLowerCase());
        
        // Break if we found them, or if we hit the end of the database
        if (existingUser || users.length === 0) {
          break;
        }
        page++;
      }

      if (existingUser) {
        // 3. We found the ID! Update their password.
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { 
            password: tempToken 
        });
        if (updateError) throw new Error(`UpdateUser failed: ${updateError.message || JSON.stringify(updateError)}`);
      } else {
        // If they still aren't found, throw the original createError
        throw new Error(`CreateUser failed: ${createError.message || JSON.stringify(createError)}`);
      }
    }

    return Response.json({ success: true, tempToken });
  } catch (error) {
    // 🚨 FALLBACK: Safely extract the exact error reason, even if Supabase sends a weird object
    const errorMessage = error instanceof Error ? error.message : (error?.message || JSON.stringify(error));
    console.error("syncSupabaseUser error:", errorMessage);
    
    return Response.json({ 
      error: "Supabase Sync Failed", 
      reason: errorMessage,
      raw_details: error
    }, { status: 500 });
  }
});
