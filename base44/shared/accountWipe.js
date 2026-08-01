/**
 * accountWipe.js — Shared permanent account deletion logic.
 *
 * Used by both:
 *   - deleteUserAccount (invoked from the frontend after password re-verification)
 *   - processExpiredDeletions (invoked by the daily cron after the 30-day grace
 *     period elapses)
 *
 * Both perform the exact same hard-wipe so behaviour never diverges:
 *   1. Delete the Supabase auth user (frees the email for re-registration).
 *   2. Wipe the legacy Base44 entities keyed by created_by = email.
 *   3. Wipe Feedback (keyed by created_by_id = Base44 user id).
 *   4. Delete the Base44 User record.
 *   5. Delete the orphaned profiles row.
 *
 * @param {object} opts
 * @param {object} opts.supabaseAdmin   Service-role Supabase client.
 * @param {string} opts.supabaseUserId  Supabase auth user id.
 * @param {string} opts.email           User email (used for created_by wipe).
 * @param {object} opts.base44          Base44 client (with .asServiceRole).
 * @param {string} [opts.base44UserId]  Base44 User id (optional — looked up by email if omitted).
 */
export async function permanentlyDeleteUser({ supabaseAdmin, supabaseUserId, email, base44, base44UserId }) {
  // 1. Delete the Supabase auth user — frees up the email for re-registration (Apple 5.1.1)
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);
  if (deleteError) throw deleteError;
  console.log(`[accountWipe] Supabase auth user deleted: ${supabaseUserId} (email: ${email})`);

  // 2. Wipe legacy Base44 entity data keyed off created_by (email).
  const legacyEntities = [
    'NetWorthSnapshot', 'UserMemory', 'ScannedDocument', 'BankAccount', 'Loan',
    'Bill', 'Payment', 'Transaction', 'Asset', 'SavingsGoal', 'BudgetCategory',
    'LoanAdjustment', 'WeeklyIncome', 'SupportTicket', 'BugReport',
  ];
  for (const entity of legacyEntities) {
    try {
      await base44.asServiceRole.entities[entity].deleteMany({ created_by: email });
      console.log(`[accountWipe] ${entity} records deleted for ${email}`);
    } catch (e) {
      console.error(`[accountWipe] ${entity} cleanup failed:`, e.message);
    }
  }

  // 3. Resolve the Base44 user id (if not supplied) for Feedback + User deletion.
  if (!base44UserId) {
    try {
      const users = await base44.asServiceRole.entities.User.filter({ email });
      base44UserId = users?.[0]?.id || null;
    } catch (e) {
      console.error('[accountWipe] Base44 user lookup failed:', e.message);
    }
  }

  // 4. Feedback keys off created_by_id (UUID), not created_by (email).
  if (base44UserId) {
    try {
      await base44.asServiceRole.entities.Feedback.deleteMany({ created_by_id: base44UserId });
      console.log(`[accountWipe] Feedback records deleted for ${base44UserId}`);
    } catch (e) {
      console.error('[accountWipe] Feedback cleanup failed:', e.message);
    }

    // 5. Delete the Base44 user record (service role only — no client SDK method).
    try {
      await base44.asServiceRole.entities.User.delete(base44UserId);
      console.log(`[accountWipe] Base44 user deleted: ${base44UserId} (email: ${email})`);
    } catch (b44Err) {
      console.error('[accountWipe] Base44 user deletion failed (Supabase user already deleted):', b44Err.message);
    }
  }

  // 6. Remove the orphaned profiles row so the cron doesn't keep retrying.
  try {
    await supabaseAdmin.from('profiles').delete().eq('id', supabaseUserId);
    console.log(`[accountWipe] profiles row deleted for ${supabaseUserId}`);
  } catch (e) {
    console.error('[accountWipe] profiles row cleanup failed:', e.message);
  }

  return { success: true };
}