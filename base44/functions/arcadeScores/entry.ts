import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Instantiate Supabase admin client
    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration secrets.");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Resolve the Supabase UUID from the Base44 user's email (scalable server-side search)
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ search: user.email });
    if (listError) throw listError;

    const supabaseUser = users.find(u => u.email === user.email);
    if (!supabaseUser) {
      throw new Error("Supabase user not found for email: " + user.email);
    }

    const supaUserId = supabaseUser.id;

    // Query all scores for this user, sorted by score descending
    const { data, error } = await supabaseAdmin
      .from('arcade_scores')
      .select('game_id, score')
      .eq('user_id', supaUserId)
      .order('score', { ascending: false });

    if (error) throw error;

    // Group by game_id and keep only the highest score per game
    const highScoresByGame = {};
    if (data && data.length > 0) {
      for (const row of data) {
        if (!highScoresByGame[row.game_id] || row.score > highScoresByGame[row.game_id]) {
          highScoresByGame[row.game_id] = row.score;
        }
      }
    }

    // Convert to array format for the frontend
    const scores = Object.entries(highScoresByGame).map(([gameId, score]) => ({
      gameId,
      score
    }));

    return Response.json({ scores }, { status: 200 });

  } catch (err) {
    console.error("arcadeScores Error:", err.message);
    return Response.json({ error: err.message, scores: [] }, { status: 500 });
  }
});