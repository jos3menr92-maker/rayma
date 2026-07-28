# Rayma AI — Soft Deletion with 30-Day Grace Period

## Overview

Implement a "pending deletion" flow that gives users a 30-day recovery window before their account and data are permanently wiped. This satisfies Apple App Store Review Guideline 5.1.1v and Google Play User Data Policy by ensuring:

1. Account deletion is **real and complete** (auto-wipe fires after 30 days).
2. Users are **clearly informed** and can **cancel by logging back in**.
3. No duplicate accounts with the same email during the grace window.

---

## Architecture Summary

| Layer | Change |
|-------|--------|
| **Supabase `profiles` table** | Add `deletion_scheduled_at` (timestamptz, nullable) column |
| **New backend function: `scheduleAccountDeletion`** | Sets the flag, revokes all Supabase sessions |
| **Existing backend function: `deleteUserAccount`** | No change — already does the hard wipe; called by cron after expiry |
| **New backend function: `processExpiredDeletions`** | Cron-triggered; queries expired flags and calls deleteUserAccount |
| **New Base44 automation** | Scheduled daily at 03:00 UTC → runs `processExpiredDeletions` |
| **AuthContext.jsx** | After auth resolves, check `deletion_scheduled_at`; if in the future → clear it and show welcome-back toast; if in the past → block and force wipe |
| **Auth.jsx (sign-up)** | If "user already registered" error → redirect to login with message (no restore-from-signup) |
| **Profile.jsx** | Replace instant `handleDelete` with call to `scheduleAccountDeletion`; show confirmation dialog with the 30-day messaging |
| **i18n keys** | Add all new user-facing strings to `src/lib/i18n.js` |

---

## 1. Supabase SQL Migration

Run this once in the Supabase SQL Editor:

```sql
-- Add the deletion scheduling column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS deletion_scheduled_at timestamptz DEFAULT NULL;

-- Index for fast cron lookups
CREATE INDEX IF NOT EXISTS idx_profiles_deletion_scheduled
ON profiles (deletion_scheduled_at)
WHERE deletion_scheduled_at IS NOT NULL;
```

**Do NOT change any RLS policies.** The existing `profiles` RLS already allows users to read/update their own row. The cron function uses the service role key, bypassing RLS.

---

## 2. New Backend Function: `scheduleAccountDeletion`

**File:** `base44/functions/scheduleAccountDeletion/entry.ts`

**Purpose:** Called from Profile.jsx when the user confirms deletion. Sets the `deletion_scheduled_at` flag to `now() + 30 days` and revokes all active Supabase sessions for that user.

**Behavior:**
1. Get the calling Base44 user via `base44.auth.me()`.
2. Accept `supabaseUserId` in the request body (sent from the frontend).
3. Verify the Supabase user's email matches the Base44 user's email (same security check as `deleteUserAccount`).
4. Update the `profiles` table: `deletion_scheduled_at = now() + interval '30 days'` where `id = supabaseUserId`.
5. Revoke all Supabase refresh tokens for that user: `supabaseAdmin.auth.admin.signOutByUserId(supabaseUserId)`.
6. Return `{ success: true, deletionDate: <ISO string> }`.
7. Log all steps with `console.log` / `console.error` for debugging.

**Environment variables to use (already set as secrets):**
- `VITE_SUPABASE_URL` or `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**Reference:** Mirror the structure of `base44/functions/deleteUserAccount/entry.ts` for imports, client creation, and the email-match security check.

---

## 3. New Backend Function: `processExpiredDeletions`

**File:** `base44/functions/processExpiredDeletions/entry.ts`

**Purpose:** Cron-triggered daily. Finds all profiles where `deletion_scheduled_at < now()` and permanently deletes them.

**Behavior:**
1. Create a Supabase admin client with the service role key.
2. Query: `SELECT id, email FROM profiles WHERE deletion_scheduled_at IS NOT NULL AND deletion_scheduled_at < now()`.
   - Join with `auth.users` to get the email (profiles may not store email directly — if it does, use that; otherwise join `auth.users` on `profiles.id = auth.users.id`).
3. For each expired user:
   a. Call the same hard-wipe logic as `deleteUserAccount` — **extract that logic into a shared module** (see section 4 below).
   b. Log: `"[CRON] Permanently deleted user: <email> (supabase id: <id>)"`.
   c. If any step fails, log the error and continue to the next user (fail-safe, never stop the loop).
4. Return `{ processed: <count>, errors: <count> }`.

**Important:** This function runs as a service role — it does NOT have a Base44 user session. It must use `base44.asServiceRole` for all Base44 entity operations. See section 4 for the shared wipe module.

---

## 4. Shared Module: `base44/shared/accountWipe.js`

**File:** `base44/shared/accountWipe.js`

**Purpose:** Both `deleteUserAccount` (called from frontend after password verification) and `processExpiredDeletions` (called by cron) need to perform the exact same hard-wipe. Extract the logic to avoid duplication.

**Exported function:**

```js
export async function permanentlyDeleteUser({ supabaseAdmin, supabaseUserId, email, base44ServiceRole }) {
  // 1. Delete the Supabase auth user (frees email for re-registration)
  // 2. Wipe all 14 legacy Base44 entities by created_by = email
  // 3. Delete the Base44 User record by user.id
  // Returns { success: true } or throws
}
```

**The 14 legacy Base44 entities to wipe (by `created_by` = email):**
`NetWorthSnapshot`, `UserMemory`, `ScannedDocument`, `BankAccount`, `Loan`, `Bill`, `Payment`, `Transaction`, `Asset`, `SavingsGoal`, `BudgetCategory`, `LoanAdjustment`, `WeeklyIncome`, `Feedback`.

**Refactor `deleteUserAccount/entry.ts`** to import and call `permanentlyDeleteUser` from the shared module instead of inlining the logic.

**Refactor `processExpiredDeletions/entry.ts`** to import and call the same function.

---

## 5. Scheduled Automation

Create a Base44 scheduled automation:

| Field | Value |
|-------|-------|
| `automation_type` | `scheduled` |
| `name` | `Process Expired Account Deletions` |
| `function_name` | `processExpiredDeletions` |
| `schedule_type` | `cron` |
| `cron_expression` | `0 3 * * *` (daily at 03:00 UTC) |
| `is_active` | `true` |

---

## 6. AuthContext.jsx — Grace Period Check on Login

**File:** `src/lib/AuthContext.jsx`

In `checkUserAuth()`, AFTER the Supabase session sync succeeds and BEFORE setting `setUser(me)`, add a check:

```js
// After supabase session is confirmed:
const { data: { session } } = await supabase.auth.getSession();
if (session) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('deletion_scheduled_at')
    .eq('id', session.user.id)
    .single();

  if (profile?.deletion_scheduled_at) {
    const deletionDate = new Date(profile.deletion_scheduled_at);
    if (deletionDate > new Date()) {
      // GRACE PERIOD ACTIVE — user logged back in, cancel the deletion
      await supabase
        .from('profiles')
        .update({ deletion_scheduled_at: null })
        .eq('id', session.user.id);
      // Show welcome-back toast (handled via a flag in context state)
      setDeletionCancelled(true); // new state variable
    } else {
      // EXPIRED — account should have been wiped by cron.
      // Block login and redirect to /auth.
      await supabase.auth.signOut();
      setAuthError({ type: 'auth_required', message: 'Account permanently deleted' });
      return;
    }
  }
}
```

Add a new `deletionCancelled` state variable and expose it in the context value so the UI (Dashboard or a global toast) can show a welcome-back message. Clear it after displaying.

**Important:** Wrap the profile check in try/catch — if the profiles table is unreachable, do NOT block login (non-fatal, same pattern as the existing Supabase sync).

---

## 7. Auth.jsx — Sign-Up Interception

**File:** `src/pages/Auth.jsx`

In the `handleSubmit` catch block, when `isLogin === false` (sign-up mode), check for "already registered" errors:

```js
if (!isLogin) {
  const errMsg = err.message?.toLowerCase() || "";
  if (errMsg.includes("already") || errMsg.includes("exists") || errMsg.includes("registered")) {
    setError(""); // clear the raw error
    setIsLogin(true); // flip to login mode
    setFormData({ ...formData, password: "" }); // clear password
    // Show a helpful message
    setError(T("accountExistsLoginInstead", "An account with this email already exists. Please sign in instead."));
    return;
  }
}
```

**Do NOT attempt to restore the account from the sign-up flow.** If the account is in its 30-day grace period, the user should log in (which triggers the cancellation in AuthContext). If the account is already wiped, the email is free and sign-up will succeed normally.

---

## 8. Profile.jsx — Replace Instant Delete with Scheduling

**File:** `src/pages/Profile.jsx`

### 8a. Update `handleDelete`

Replace the existing instant-wipe logic with a call to `scheduleAccountDeletion`:

```js
const handleDelete = async () => {
  setDeleting(true);
  try {
    const uid = supaUser?.id;
    if (!uid) throw new Error("User ID missing.");

    const res = await base44.functions.invoke('scheduleAccountDeletion', {
      supabaseUserId: uid,
    });

    if (res?.data?.deletionDate) {
      // Show confirmation screen with the deletion date
      setScheduledDeletionDate(new Date(res.data.deletionDate));
    }

    // Sign out and redirect
    await supabase.auth.signOut();
    window.location.href = "/auth";
  } catch (err) {
    console.error("Scheduling failed:", err.message);
    setAuthError(T("deletionScheduleFailed", "Failed to schedule account deletion. Please try again."));
  } finally {
    setDeleting(false);
  }
};
```

### 8b. Confirmation Dialog UI

Before calling `handleDelete`, show a confirmation dialog (use the existing shadcn `Dialog` component) with this messaging:

- **Title:** `T("deleteAccountTitle", "Delete Account")`
- **Body:** `T("deletionGracePeriodNotice", "Your account will be scheduled for permanent deletion in 30 days. If you log back in before then, your deletion will be cancelled and your data restored. After 30 days, all your data will be permanently erased and cannot be recovered.")`
- **Confirm button:** `T("scheduleDeletion", "Schedule Deletion")`
- **Cancel button:** `T("cancel", "Cancel")`

### 8c. Post-Scheduling Screen

After `scheduleAccountDeletion` succeeds (before redirect), show a full-screen confirmation:

```
"Your account is scheduled for permanent deletion on {date}.

Log back in anytime before then to cancel and restore your account."
```

Use `setScheduledDeletionDate` state to control this view.

---

## 9. i18n Keys

**File:** `src/lib/i18n.js`

Add these keys for **all supported languages** (en, es, pt at minimum). The values below are English defaults — Copilot must add the equivalent translations for each language block.

| Key | English Default |
|-----|----------------|
| `deleteAccountTitle` | "Delete Account" |
| `deletionGracePeriodNotice` | "Your account will be scheduled for permanent deletion in 30 days. If you log back in before then, your deletion will be cancelled and your data restored. After 30 days, all your data will be permanently erased and cannot be recovered." |
| `scheduleDeletion` | "Schedule Deletion" |
| `cancel` | "Cancel" |
| `deletionScheduledTitle` | "Deletion Scheduled" |
| `deletionScheduledBody` | "Your account is scheduled for permanent deletion on {date}. Log back in anytime before then to cancel and restore your account." |
| `deletionScheduleFailed` | "Failed to schedule account deletion. Please try again." |
| `welcomeBackDeletionCancelled` | "Welcome back! Your account deletion has been cancelled and your data is restored." |
| `accountPermanentlyDeleted` | "This account has been permanently deleted." |
| `accountExistsLoginInstead` | "An account with this email already exists. Please sign in instead." |

**Rules:**
- Never hardcode English strings in JSX — always wrap in `T("key", "fallback")`.
- The `{date}` placeholder should be replaced at render time with the localized date string.
- Follow the existing pattern in `i18n.js` for structure.

---

## 10. Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| User logs in on day 15 of grace period | Flag cleared, welcome-back toast shown, full access restored |
| User logs in on day 31 (cron hasn't run yet) | AuthContext detects `deletion_scheduled_at < now()`, signs them out, shows "account permanently deleted" error |
| User logs in on day 31 (cron already ran) | Supabase auth user is deleted → login fails with "invalid credentials" → standard error shown |
| User tries to sign up with same email during grace period | "already exists" error → redirected to login → login cancels the deletion |
| User tries to sign up with same email after wipe | Sign-up succeeds (email is free) |
| Cron job fails for a user | Logged, continues to next user, retries next day |
| Profiles table doesn't have the column yet | Migration not run — AuthContext check fails silently (try/catch), login proceeds normally |
| Google/Apple OAuth login during grace period | Same check applies — `syncSupabaseUser` creates/updates the Supabase user, then AuthContext checks the flag. (Note: OAuth is currently disabled in Auth.jsx, but the check should still work when re-enabled.) |

---

## 11. Testing Checklist

- [ ] SQL migration runs without error in Supabase
- [ ] `scheduleAccountDeletion` sets the flag and returns a future date
- [ ] All Supabase sessions are revoked after scheduling (user is logged out everywhere)
- [ ] Logging back in within 30 days clears the flag and shows welcome-back toast
- [ ] Logging in after 30 days (with cron not yet run) blocks login with "permanently deleted" message
- [ ] `processExpiredDeletions` cron function wipes all data for expired users
- [ ] Sign-up with existing email during grace period redirects to login
- [ ] Profile.jsx confirmation dialog shows the 30-day messaging clearly
- [ ] All new strings are translated in all supported languages
- [ ] No hardcoded English strings in any new/modified code

---

## 12. Files to Create / Modify

### Create:
1. `base44/functions/scheduleAccountDeletion/entry.ts`
2. `base44/functions/processExpiredDeletions/entry.ts`
3. `base44/shared/accountWipe.js`

### Modify:
1. `base44/functions/deleteUserAccount/entry.ts` — refactor to use shared `accountWipe.js`
2. `src/lib/AuthContext.jsx` — add grace-period check in `checkUserAuth()`
3. `src/pages/Auth.jsx` — add sign-up interception for "already registered"
4. `src/pages/Profile.jsx` — replace instant delete with scheduling + confirmation dialog
5. `src/lib/i18n.js` — add all new keys for all languages

### Supabase (run in SQL Editor):
1. `ALTER TABLE profiles ADD COLUMN deletion_scheduled_at timestamptz DEFAULT NULL;`
2. `CREATE INDEX idx_profiles_deletion_scheduled ON profiles (deletion_scheduled_at) WHERE deletion_scheduled_at IS NOT NULL;`

### Base44 Platform:
1. Create scheduled automation: `processExpiredDeletions` daily at 03:00 UTC

---

## 13. Security Requirements

- `scheduleAccountDeletion` must verify email match between Base44 user and Supabase user (same as `deleteUserAccount`).
- `processExpiredDeletions` runs with service role key only — never expose it via frontend.
- All Supabase operations in cron use the admin client, bypassing RLS (intentional — cron has no user session).
- The password re-verification pattern in Profile.jsx (`verifyAndExecute`) must remain intact — deletion can only be scheduled after the user re-enters their password.
- All new backend functions must log errors with `console.error` for debugging.

---

## 14. Do NOT

- Do NOT remove or modify the existing `deleteUserAccount` function — refactor it to use the shared module, but keep its API contract.
- Do NOT auto-create Supabase tables from the app — the SQL migration is run manually.
- Do NOT block login if the profiles table check fails (non-fatal).
- Do NOT attempt to restore accounts from the sign-up flow — always redirect to login.
- Do NOT change any existing RLS policies.
- Do NOT add extra features (e.g., email reminders during the grace period) unless explicitly requested.