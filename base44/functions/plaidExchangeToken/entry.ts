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

    const { public_token } = await req.json();

    if (!public_token) {
      return Response.json({ error: 'Missing public_token' }, { status: 400 });
    }

    // Exchange public token for access token
    const exchangeRes = await fetch('https://sandbox.plaid.com/item/public_token/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: plaidClientId,
        secret: plaidSecret,
        public_token,
      }),
    });

    const exchangeData = await exchangeRes.json();

    if (!exchangeRes.ok) {
      throw new Error(exchangeData.error_message || 'Failed to exchange token');
    }

    const accessToken = exchangeData.access_token;
    const itemId = exchangeData.item_id;

    // Get accounts for this access token
    const accountsRes = await fetch('https://sandbox.plaid.com/accounts/get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: plaidClientId,
        secret: plaidSecret,
        access_token: accessToken,
      }),
    });

    const accountsData = await accountsRes.json();

    if (!accountsRes.ok) {
      throw new Error(accountsData.error_message || 'Failed to get accounts');
    }

    // Create BankAccount records
    const createdAccounts = [];
    const accounts = accountsData.accounts || [];

    for (const account of accounts) {
      const bankAccount = await base44.entities.BankAccount.create({
        name: account.name || account.official_name || 'Unknown Account',
        institution: accountsData.item?.institution?.name || 'Plaid Bank',
        account_type: account.subtype || 'other',
        balance: account.balances?.current || 0,
        plaid_account_id: account.account_id,
        plaid_access_token: accessToken,
        link_method: 'plaid',
        last_synced: new Date().toISOString().split('T')[0],
      });
      createdAccounts.push(bankAccount);
    }

    console.log(`Plaid exchange: ${createdAccounts.length} accounts linked for user ${user.email}`);
    return Response.json({
      success: true,
      item_id: itemId,
      accounts_linked: createdAccounts.length,
      accounts: createdAccounts,
    });
  } catch (error) {
    console.error('Plaid exchange token error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});