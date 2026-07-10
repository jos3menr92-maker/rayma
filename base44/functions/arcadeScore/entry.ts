import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract gameId from URL path: /api/base44/arcadeScore/:gameId
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const gameId = pathParts[pathParts.length - 1];

    if (!gameId) {
      return Response.json({ error: 'Missing gameId' }, { status: 400 });
    }

    // Instantiate Supabase admin client
    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration secrets.");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Resolve the Supabase UUID from the Base44 user's email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const supabaseUser = users.find(u => u.email === user.email);
    if (!supabaseUser) {
      throw new Error("Supabase user not found for email: " + user.email);
    }

    const supaUserId = supabaseUser.id;

    // Query the highest score for this user + game
    const { data, error } = await supabaseAdmin
      .from('arcade_scores')
      .select('score')
      .eq('user_id', supaUserId)
      .eq('game_id', gameId)
      .order('score', { ascending: false })
      .limit(1);

    if (error) throw error;

    const highScore = data && data.length > 0 ? data[0].score : 0;

    return Response.json({ score: highScore }, { status: 200 });

  } catch (err) {
    console.error("arcadeScore Error:", err.message);
    return Response.json({ error: err.message, score: 0 }, { status: 500 });
  }
});