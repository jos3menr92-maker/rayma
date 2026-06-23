import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const plaidClientId = Deno.env.get('PLAID_CLIENT_ID');
    const plaidSecret = Deno.env.get('PLAID_SECRET');

    if (!plaidClientId || !plaidSecret) {
      return Response.json({ error: 'Plaid credentials not configured' }, { status: 500 });
    }

    const { user_login } = await req.json();

    if (!user_login?.email && !user_login?.username) {
      return Response.json({ error: 'Missing user email or username' }, { status: 400 });
    }

    const response = await fetch('https://sandbox.plaid.com/link/token/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: plaidClientId,
        secret: plaidSecret,
        user: {
          client_user_id: user.id,
        },
        client_name: 'RAYMA Financial Dashboard',
        language: 'en',
        country_codes: ['US'],
        products: ['auth', 'transactions'],
        user_login,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_message || 'Failed to create link token');
    }

    console.log(`Link token created for user ${user.email}`);
    return Response.json({
      link_token: data.link_token,
      expiration: data.expiration,
    });
  } catch (error) {
    console.error('Plaid link token error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});