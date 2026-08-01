import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSupabaseAdmin } from '../../shared/supabaseClient.ts';
import { getSupaUserIdByEmail } from '../../shared/supabaseUserLookup.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gameId, score } = await req.json();

    if (!gameId || typeof score !== 'number') {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Use the shared sanitized admin client (avoids "Invalid URL string" from
    // raw env vars that may contain quotes/whitespace).
    const { client: supabaseAdmin } = getSupabaseAdmin();

    // Resolve the Supabase UUID from the Base44 user's email (exact match)
    const supaUserId = await getSupaUserIdByEmail(supabaseAdmin, user.email);
    if (!supaUserId) {
      throw new Error("Supabase user not found for email: " + user.email);
    }

    // Fetch the current high score for this user + game before inserting
    const { data: existing } = await supabaseAdmin
      .from('arcade_scores')
      .select('score')
      .eq('user_id', supaUserId)
      .eq('game_id', gameId)
      .order('score', { ascending: false })
      .limit(1);

    const previousHigh = existing && existing.length > 0 ? existing[0].score : 0;
    const isNewHighScore = score > previousHigh;

    // Insert the new score record
    const { data, error } = await supabaseAdmin
      .from('arcade_scores')
      .insert([
        { user_id: supaUserId, game_id: gameId, score: score }
      ])
      .select();

    if (error) throw error;

    return Response.json({
      saved: true,
      data,
      newHighScore: isNewHighScore,
      previousHighScore: previousHigh
    }, { status: 200 });

  } catch (err) {
    console.error("saveArcadeScore Error:", err.message);
    return Response.json({ error: err.message, saved: false }, { status: 500 });
  }
}