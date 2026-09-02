import { supabase } from "@/lib/supabaseClientFrontend";

// Mirrors a bank account's balance onto the user's "Bank Cash" asset row so the
// asset dashboard stays in sync whenever transactions or balances change.
// Frontend counterpart of the backend syncBankCashAsset in manageFinancialRecord (Bug 2).
// The main UI flows (FinancialDataContext.addTransaction, BankAccounts.saveAccount)
// write bank_accounts.balance directly to Supabase and bypass manageFinancialRecord,
// so this keeps the asset mirror consistent for those paths too.
export async function syncBankCashAsset(bankAccountId) {
  if (!bankAccountId) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) return;
    const { data: bankAccount } = await supabase
      .from('bank_accounts')
      .select('balance')
      .eq('id', bankAccountId)
      .eq('user_id', uid)
      .single();
    if (bankAccount) {
      await supabase
        .from('assets')
        .update({ amount: bankAccount.balance })
        .ilike('name', 'Bank Cash%')
        .eq('user_id', uid);
    }
  } catch (e) {
    console.warn('[syncBankCashAsset] failed (non-fatal):', e.message);
  }
}