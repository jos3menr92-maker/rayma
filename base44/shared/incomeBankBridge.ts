/**
 * incomeBankBridge.ts — THE income → bank ledger bridge (server-side).
 *
 * Income used to live only in the income ledger while the bank balance only
 * saw debits, so account balances "kept subtracting". This module mirrors an
 * income row into the bank ledger as a linked credit transaction:
 *
 *   - marker: notes = "income_link:<incomeId>" — makes the link discoverable
 *     and makes bridging idempotent (never two credits for one paycheck);
 *   - balance: raises the linked account's balance by the income amount;
 *   - mirror: keeps the "Bank Cash" asset in step with the new balance.
 *
 * Used by manageFinancialRecord (manual/chat-logged income + deletes) and
 * autoLogRecurringIncome (recurring paychecks). Frontend counterparts live in
 * the Finance page (create/edit/delete of income entries).
 */

const MARKER_PREFIX = 'income_link:';

export async function bridgeIncomeToBank(supabaseAdmin: any, uid: string, income: any) {
  if (!supabaseAdmin || !uid || !income?.id) return { bridged: false, reason: 'no income row' };
  const amount = Number(income.amount) || 0;
  if (amount <= 0) return { bridged: false, reason: 'non-positive amount' };

  // Idempotency — if this income already has a bridge transaction, never add a second one.
  const marker = `${MARKER_PREFIX}${income.id}`;
  const { data: existing } = await supabaseAdmin.from('transactions')
    .select('id').eq('user_id', uid).eq('notes', marker).limit(1);
  if (existing && existing.length > 0) return { bridged: true, reason: 'already bridged' };

  // Bank account to credit: the OLDEST active manually-linked account (the
  // live table has no is_primary column — oldest = primary). Plaid-synced
  // balances are authoritative from the bank, so crediting them app-side
  // would inflate them until the next sync — skipped.
  const { data: banks } = await supabaseAdmin.from('bank_accounts')
    .select('id, balance, is_active, link_method').eq('user_id', uid)
    .order('created_at', { ascending: true });
  const bank = (banks || []).find((b: any) => b.is_active !== false && b.link_method !== 'plaid');
  if (!bank) return { bridged: false, reason: 'no bank account' };

  const date = String(income.week_start || '').slice(0, 10) || new Date().toISOString().split('T')[0];
  const description = `Income: ${income.source || income.note || 'Paycheck'}`;

  const { error: txErr } = await supabaseAdmin.from('transactions').insert([{
    user_id: uid,
    bank_account_id: bank.id,
    date,
    description,
    amount,
    category: 'income',
    type: 'credit',
    notes: marker,
  }]);
  if (txErr) throw new Error(`bridge tx insert failed: ${txErr.message}`);

  const newBalance = Number(bank.balance || 0) + amount;
  const { error: balErr } = await supabaseAdmin.from('bank_accounts')
    .update({ balance: newBalance }).eq('id', bank.id).eq('user_id', uid);
  if (balErr) throw new Error(`bank balance update failed: ${balErr.message}`);

  // Keep the "Bank Cash" mirror asset in step with the new balance.
  await supabaseAdmin.from('assets').update({ amount: newBalance })
    .ilike('name', 'Bank Cash%').eq('user_id', uid);

  return { bridged: true, bankAccountId: bank.id };
}

/**
 * Removes an income's bank-bridge transaction and reverses the credited
 * amount. No-op when the income never reached the bank ledger — so calling
 * it after the frontend already cleaned up is always safe.
 */
export async function cleanupIncomeBridge(supabaseAdmin: any, uid: string, incomeId: string) {
  if (!supabaseAdmin || !uid || !incomeId) return { cleaned: false };
  const marker = `${MARKER_PREFIX}${incomeId}`;
  const { data: linked } = await supabaseAdmin.from('transactions')
    .select('id, bank_account_id, amount').eq('user_id', uid).eq('notes', marker).limit(1);
  const tx = linked?.[0];
  if (!tx) return { cleaned: false, reason: 'no bridge transaction' };

  const { data: bankRow } = await supabaseAdmin.from('bank_accounts')
    .select('balance').eq('id', tx.bank_account_id).eq('user_id', uid).single();
  if (bankRow) {
    const newBalance = Number(bankRow.balance || 0) - (Number(tx.amount) || 0);
    await supabaseAdmin.from('bank_accounts')
      .update({ balance: newBalance }).eq('id', tx.bank_account_id).eq('user_id', uid);
    await supabaseAdmin.from('assets').update({ amount: newBalance })
      .ilike('name', 'Bank Cash%').eq('user_id', uid);
  }
  await supabaseAdmin.from('transactions').delete().eq('id', tx.id).eq('user_id', uid);
  return { cleaned: true };
}