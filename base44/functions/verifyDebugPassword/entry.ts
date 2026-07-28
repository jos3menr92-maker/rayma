import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const userInput = body?.password || '';
    const secretPassword = Deno.env.get('RAYMA_DEBUG_PASSWORD');

    if (!secretPassword) {
      console.error('RAYMA_DEBUG_PASSWORD secret is not set');
      return Response.json({ valid: false });
    }

    return Response.json({ valid: userInput === secretPassword });
  } catch (error) {
    console.error('verifyDebugPassword error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});