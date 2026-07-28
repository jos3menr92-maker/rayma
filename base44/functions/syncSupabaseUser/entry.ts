import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    
    if (!me) return Response.json({ error: 'Unauthorized', reason: 'Base44 auth failed' }, { status: 401 });

    const rawUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL") || "";
    const urlMatch = rawUrl.match(/https:\/\/[^\s"'<>\[\]]+/);
    const supabaseUrl = urlMatch ? urlMatch[0] : "";
    const rawKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const keyMatch = rawKey.match(/eyJ[A-Za-z0-9_\-.]+/);
    const supabaseKey = keyMatch ? keyMatch[0] : rawKey.trim().replace(/^["'\[\]]|["'\[\]]$/g, "");

    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase configuration secrets (URL or SERVICE_ROLE_KEY).");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    const tempToken = "R@" + crypto.randomUUID();

    // 1. Try to create the user via direct fetch (bypasses SDK to see raw server response)
    const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: me.email,
        email_confirm: true,
        password: tempToken
      })
    });

    if (createRes.ok) {
      return Response.json({ success: true, tempToken });
    }

    const rawBody = await createRes.text();

    // 2. If user already exists (422), paginate to find them and update their password
    if (createRes.status === 422 || rawBody.includes("already been registered") || rawBody.includes("already exists")) {
      let existingUser = null;
      let page = 1;

      while (!existingUser) {
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });
        if (listError) throw new Error(`ListUsers failed: ${listError.message || JSON.stringify(listError)}`);

        const users = listData?.users || [];
        existingUser = users.find(u => u.email?.toLowerCase() === me.email?.toLowerCase());

        if (existingUser || users.length === 0) break;
        page++;
      }

      if (existingUser) {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          password: tempToken
        });
        if (updateError) throw new Error(`UpdateUser failed: ${updateError.message || JSON.stringify(updateError)}`);
        return Response.json({ success: true, tempToken });
      }
    }

    // 3. Real error — surface the raw HTTP response
    throw new Error(`CreateUser HTTP ${createRes.status}: ${rawBody.substring(0, 300)}`);
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