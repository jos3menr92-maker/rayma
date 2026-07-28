/**
 * Shared hard-wipe logic for account deletion.
 * Used by both `deleteUserAccount` (user-initiated) and
 * `processExpiredDeletions` (cron-initiated).
 */

const LEGACY_ENTITIES = [
  'NetWorthSnapshot', 'UserMemory', 'ScannedDocument', 'BankAccount',
  'Loan', 'Bill', 'Payment', 'Transaction', 'Asset', 'SavingsGoal',
  'BudgetCategory', 'LoanAdjustment', 'WeeklyIncome', 'Feedback',
];

/**
 * Permanently deletes a user's account and all associated data.
 *
 * @param {object} opts
 * @param {object} opts.supabaseAdmin - Supabase admin client
 * @param {string} opts.supabaseUserId - Supabase auth user ID
 * @param {string} opts.email - User email (for Base44 entity cleanup)
 * @param {object} opts.base44ServiceRole - base44.asServiceRole client
 * @returns {Promise<{ success: boolean }>}
 */
export async function permanentlyDeleteUser({ supabaseAdmin, supabaseUserId, email, base44ServiceRole }) {
  // 1. Delete the Supabase auth user — frees email for re-registration (Apple 5.1.1)
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);
  if (deleteError) throw deleteError;
  console.log(`Supabase auth user deleted: ${supabaseUserId} (email: ${email})`);

  // 2. Wipe legacy Base44 entity data by created_by = email
  for (const entity of LEGACY_ENTITIES) {
    try {
      await base44ServiceRole.entities[entity].deleteMany({ created_by: email });
      console.log(`${entity} records deleted for ${email}`);
    } catch (e) {
      console.error(`${entity} cleanup failed:`, e.message);
    }
  }

  // 3. Delete the Base44 User record
  try {
    // Look up the Base44 user by email to get their id
    const users = await base44ServiceRole.entities.User.filter({ email });
    if (users?.length) {
      await base44ServiceRole.entities.User.delete(users[0].id);
      console.log(`Base44 user deleted: ${users[0].id} (email: ${email})`);
    }
  } catch (b44Err) {
    console.error('Base44 user deletion failed:', b44Err.message);
  }

  return { success: true };
}
