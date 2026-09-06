import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSupabaseAdmin } from '../../shared/supabaseClient.ts';
import { getSupaUserIdByEmail } from '../../shared/supabaseUserLookup.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.email) {
      return Response.json({ error: 'Unauthorized', highScore: 0 }, { status: 401 });
    }

    // gameId can arrive in the JSON body, as a ?gameId= query param, or as a
    // trailing path segment (/api/base44/arcadeScore/<gameId>) — accept all so
    // any invocation style works.
    const body = await req.json().catch(() => ({}));
    const url = new URL(req.url);
    const gameId = body.gameId || url.searchParams.get('gameId') || url.pathname.split('/').filter(Boolean).pop();

    if (!gameId) {
      return Response.json({ error: 'Missing gameId', highScore: 0 }, { status: 400 });
    }

    // Use the shared sanitized admin client (raw env vars contain quotes/whitespace
    // and produce "Invalid URL string" errors).
    const { client: supabaseAdmin } = getSupabaseAdmin();
    const supaUserId = await getSupaUserIdByEmail(supabaseAdmin, user.email);

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

    return Response.json({ highScore }, { status: 200 });

  } catch (err) {
    console.error("arcadeScore Error:", err.message);
    return Response.json({ error: err.message, highScore: 0 }, { status: 500 });
  }
}