# Copilot Instructions — Rayma AI

## Project Overview
Rayma AI is a comprehensive financial advisory app built with React (Vite), Supabase, Tailwind CSS, framer-motion, and shadcn/ui. It helps users track loans, bills, budgets, net worth, and provides AI-driven financial coaching.

## Tech Stack
- **Frontend:** React 18 + Vite + Tailwind CSS + shadcn/ui (Radix primitives)
- **Backend:** Base44 serverless functions (Deno runtime, `base44/functions/*/entry.ts`)
- **Database:** Supabase (PostgreSQL with RLS)
- **Auth:** Dual auth — Base44 (primary) + Supabase (session sync)
- **State:** React Context (`AuthContext`, `FinancialDataContext`, `LanguageContext`)
- **Icons:** lucide-react only
- **Payments:** Stripe (live mode)

## Strict Coding Rules (NON-NEGOTIABLE)

### Branding
- The app is named **"Rayma AI"**. Never use legacy "RAYMA" in new code.

### Translations (i18n)
- **ALL** user-facing text must use the translation engine.
- Import: `import { useLanguage, useT } from "@/lib/LanguageContext";`
- Usage: `const T = useT();` then `T("key", "English fallback")`
- Keys live in `src/lib/i18n.js` — add new keys to **every language block** (en, zh, hi, es, fr, ar, bn, pt, ru, ja).
- Never hardcode English strings in JSX.

### Security
- Any destructive action (delete account, loan, payment) MUST require password re-verification.
- Pattern: show a password modal → call `supabase.auth.signInWithPassword()` to verify → only then execute the destructive action.
- Never allow unauthenticated or one-click deletions.

### UI Components
- Always use shadcn/ui components from `@/components/ui/` (Button, Input, Label, Select, Dialog, etc.).
- Use existing wrappers: `ProtectedLayout`, `SideDrawer`, `AuthLayout`.
- Never build raw HTML/CSS elements when a shadcn component exists.

### Environment Variables
- Always use `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY`.
- Never hardcode credentials, URLs, or keys.
- Backend functions use `Deno.env.get()` for server-side secrets.

### Localization
- Format dates and currencies dynamically to support South American locales (Colombia COP, Argentina ARS, Brazil BRL, Chile CLP) and US defaults.
- Use the existing `useCurrency` hook for currency formatting.

## Import Conventions
- Use the `@/` alias for all imports: `@/components/ui/button`, `@/lib/utils`, `@/api/base44Client`.
- Never use relative paths like `../../components/`.
- `cn` comes from `@/lib/utils`.
- Each shadcn component is imported from its own file: `import { Button } from "@/components/ui/button"`.

## File Structure
- Pages: `src/pages/*.jsx` (default export, named same as file)
- Components: `src/components/*.jsx` (subfolders allowed)
- Backend functions: `base44/functions/{functionName}/entry.ts`
- Shared backend logic: `base44/shared/*.js` (imported by multiple functions)
- Entities: `base44/entities/*.jsonc`
- Contexts: `src/lib/*.jsx`
- i18n: `src/lib/i18n.js`

## Backend Functions (Deno)
- Import SDK: `import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';`
- Import Supabase: `import { createClient } from 'npm:@supabase/supabase-js@2.39.0';`
- Pattern: `Deno.serve(async (req) => { ... })`
- Get user: `const base44 = createClientFromRequest(req); const me = await base44.auth.me();`
- Service role (cron, no user session): `base44.asServiceRole`
- Supabase admin: `createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))`
- Log all errors with `console.error` for debugging.

## Auth Architecture (CRITICAL)
The app uses **dual auth**:
1. **Base44** is the primary auth provider (login, register, OTP, passkey).
2. **Supabase** sessions are synced via the `syncSupabaseUser` backend function, which creates/updates a Supabase auth user with a temp token.
3. Frontend then calls `supabase.auth.signInWithPassword()` with the temp token to establish the Supabase session.
4. `AuthContext.jsx` orchestrates this — any auth change must account for both systems.

## Supabase Data Layer
- Financial data lives in Supabase tables (not Base44 entities).
- Frontend queries use: `supabase.from('table_name').select('*').eq('user_id', supaUser.id)`
- **RLS is mandatory** — every query must filter by `user_id`.
- The `profiles` table links `auth.users.id` to app-level profile data.
- Legacy Base44 entities still exist for some features but are being phased out.

## Testing & Verification
- After implementing changes, verify:
  - No console errors in the preview.
  - All imports resolve correctly.
  - i18n keys exist in all 10 language blocks.
  - Mobile-responsive layout works.
  - Destructive actions require password verification.

---

## Current Task: Soft Deletion with 30-Day Grace Period

**Full specification:** See `src/SOFT_DELETION_SPEC.md` in the repo root.

### Summary
Implement a pending-deletion flow where clicking "Delete Account" schedules deletion for 30 days later. Users can cancel by logging back in. After 30 days, a daily cron permanently wipes the account.

### Files to Create
1. `base44/functions/scheduleAccountDeletion/entry.ts` — Sets the `deletion_scheduled_at` flag, revokes sessions.
2. `base44/functions/processExpiredDeletions/entry.ts` — Cron job, wipes expired accounts.
3. `base44/shared/accountWipe.js` — Shared hard-wipe logic used by both functions.

### Files to Modify
1. `base44/functions/deleteUserAccount/entry.ts` — Refactor to import from `base44/shared/accountWipe.js`.
2. `src/lib/AuthContext.jsx` — Add grace-period check in `checkUserAuth()` after Supabase session sync.
3. `src/pages/Auth.jsx` — Intercept "already registered" on sign-up, redirect to login.
4. `src/pages/Profile.jsx` — Replace instant `handleDelete` with `scheduleAccountDeletion` call + confirmation dialog.
5. `src/lib/i18n.js` — Add all new keys to every language block.

### SQL Migration (run manually in Supabase SQL Editor)
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deletion_scheduled_at timestamptz DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_deletion_scheduled ON profiles (deletion_scheduled_at) WHERE deletion_scheduled_at IS NOT NULL;
```

### Key i18n Strings to Add (all 10 languages)
- `deleteAccountTitle`, `deletionGracePeriodNotice`, `scheduleDeletion`, `deletionScheduledTitle`, `deletionScheduledBody`, `deletionScheduleFailed`, `welcomeBackDeletionCancelled`, `accountPermanentlyDeleted`, `accountExistsLoginInstead`

### Important Constraints
- Do NOT remove or change the API contract of `deleteUserAccount`.
- Do NOT block login if the profiles table check fails (non-fatal, wrap in try/catch).
- Do NOT attempt account restoration from the sign-up flow — always redirect to login.
- Do NOT change any existing RLS policies.
- Do NOT add features beyond what the spec describes.
- The password re-verification pattern in Profile.jsx (`verifyAndExecute`) must remain intact.

### Verification Checklist
- [ ] `scheduleAccountDeletion` sets flag + revokes all Supabase sessions
- [ ] Logging in within 30 days clears the flag and shows welcome-back toast
- [ ] Logging in after 30 days blocks with "permanently deleted" message
- [ ] `processExpiredDeletions` cron wipes all data for expired users
- [ ] Sign-up with existing email redirects to login
- [ ] Profile.jsx confirmation dialog shows 30-day messaging clearly
- [ ] All new strings translated in all 10 languages
- [ ] No hardcoded English strings anywhere