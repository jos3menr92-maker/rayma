import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSupabaseAdmin } from '../../shared/supabaseClient.ts';
import { getSupaUserIdByEmail } from '../../shared/supabaseUserLookup.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use the shared sanitized admin client (raw env vars contain quotes/whitespace
    // and produce "Invalid URL string" errors).
    const { client: supabaseAdmin } = getSupabaseAdmin();
    const supaUserId = await getSupaUserIdByEmail(supabaseAdmin, user.email);

    // Query all scores for this user, sorted by score descending
    const { data, error } = await supabaseAdmin
      .from('arcade_scores')
      .select('game_id, score')
      .eq('user_id', supaUserId)
      .order('score', { ascending: false });

    if (error) throw error;

    // Group by game_id, keep the highest score per game, and return as an
    // object keyed by game_id — the shape the Arcade page expects to spread.
    const scores = {};
    if (data && data.length > 0) {
      for (const row of data) {
        if (scores[row.game_id] === undefined || row.score > scores[row.game_id]) {
          scores[row.game_id] = row.score;
        }
      }
    }

    return Response.json({ scores }, { status: 200 });

  } catch (err) {
    console.error("arcadeScores Error:", err.message);
    return Response.json({ error: err.message, scores: {} }, { status: 500 });
  }
}