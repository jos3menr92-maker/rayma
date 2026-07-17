# 🧠 Rayma AI — Complete Brain Transfer Document

> **Last Updated:** 2026-07-17  
> **Purpose:** Full knowledge handoff capturing everything the app is, how it works, what's broken, and what needs to be done. This is the single source of truth for any developer (human or AI) working on this project.

---

## 1. APP IDENTITY

- **Name:** Rayma AI (NOT "RAYMA" — legacy references must be removed)
- **Mission:** AI-driven financial advisory platform helping users manage money — debts, bills, income, assets, budgets, net worth, and spending — through a secure, mobile-first web app.
- **Tagline:** "Take control of your finances"
- **Branding Rule:** All user-facing text and code comments must use "Rayma AI", never "RAYMA" or "Debt Tracker"

---

## 2. TECH STACK

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 (Vite), ESM only |
| Styling | Tailwind CSS + shadcn/ui components |
| Animation | framer-motion |
| Charts | recharts |
| Icons | lucide-react |
| Maps | react-leaflet |
| Drag & Drop | @hello-pangea/dnd |
| Data Fetching | @tanstack/react-query |
| Primary Auth | Base44 SDK (`@/api/base44Client`) |
| Database (Financial Data) | Supabase (PostgreSQL) |
| Database (Scanned Documents, Promos, User Memories) | Base44 entities |
| Payments | Stripe (live mode) + native IAP bridge |
| Backend Functions | Deno Deploy (via `base44/functions/`) |
| File Storage | Supabase Storage (avatars), Base44 UploadFile (documents) |

---

## 3. DUAL-DATABASE ARCHITECTURE (THE MOST CRITICAL CONCEPT)

Rayma AI uses **two separate databases** that must stay synchronized:

### Database A: Base44 (Built-in)
- **Used for:** User accounts, authentication, ScannedDocument, PromoCode, UserMemory, Feedback, NetWorthSnapshot, and all Base44 entity schemas defined in `base44/entities/*.jsonc`
- **Auth:** `base44.auth.me()`, `base44.auth.loginViaEmailPassword()`, `base44.auth.register()`, `base44.auth.verifyOtp()`
- **Entity SDK:** `base44.entities.EntityName.list/filter/create/update/delete`
- **User entity:** Built-in, read-only fields: id, created_date, full_name, email, role. Custom fields added via `base44/entities/User.jsonc` (all cosmetic/preference fields are optional/nullable).
- **Access pattern:** `base44.auth.me()` returns the Base44 user object. Its `.id` is a **Base44 UUID**, NOT a Supabase UUID.

### Database B: Supabase (Financial Data)
- **Used for:** loans, bills, incomes, payments, transactions, bank_accounts, assets, savings_goals, profiles, loan_adjustments
- **Connection:** `src/lib/supabaseClient.js` initializes the Supabase client using `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY`
- **Tables:** All financial tables have a `user_id` column (Supabase auth UUID) and RLS policies that restrict access to the authenticated user's own records
- **Auth:** Supabase auth sessions are established via a backend function (`syncSupabaseUser`) that creates/finds a Supabase user matching the Base44 email and returns a temp token

### The Bridge (How They Connect)
1. User authenticates with **Base44** (email/password, OTP, passkey, or OAuth)
2. Frontend calls `base44.functions.invoke('syncSupabaseUser', {})` — this backend function:
   - Gets the Base44 user's email
   - Looks up or creates a matching user in Supabase auth
   - Sets/resets a temp password on the Supabase user
   - Returns `{ tempToken: "..." }`
3. Frontend uses the temp token to call `supabase.auth.signInWithPassword({ email, password: tempToken })`
4. This establishes a Supabase session → `supaUser` is populated in `FinancialDataContext`
5. All financial data operations now work

### ⚠️ THE ROOT CAUSE OF ALL CURRENT FAILURES
**Vite environment variables (`VITE_` prefix) are baked at build time, not runtime.** The secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` were set AFTER the app was published. The published build contains the fallback values:
```js
// src/lib/supabaseClient.js
supabaseUrl || "https://placeholder.supabase.co"
supabaseAnonKey || "placeholder-anon-key"
```
Every Supabase call from the published app hits `placeholder.supabase.co` (non-existent) → `TypeError: Failed to fetch`.

**FIX:** Unpublish the app → ensure secrets are set → re-publish so the build picks up the real `VITE_` values. This single fix resolves: profile save failures, bill/loan/bank account insertions, assets/net worth not loading, photo upload crashes.

---

## 4. AUTH FLOW (Auth.jsx)

### Login Flow
1. `base44.auth.loginViaEmailPassword(email, password)` — sets Base44 token
2. `base44.functions.invoke('syncSupabaseUser', {})` — gets temp token
3. `supabase.auth.signInWithPassword({ email, password: tempToken })` — establishes Supabase session
4. Supabase errors are **swallowed silently** (console.error only) — Base44 auth proceeds
5. `window.location.href = '/'` — hard redirect forces fresh mount

### Registration Flow
1. `base44.auth.register({ email, password })` — does NOT log in; user is unverified
2. OTP screen shown
3. `base44.auth.verifyOtp({ email, otpCode })` — returns `access_token`
4. `base44.auth.setToken(result.access_token)`
5. Same syncSupabaseUser → supabase session flow as login
6. `navigate("/")` + `window.location.reload()`

### Passkey Flow (Web only — hidden on mobile)
1. `base44.auth.signInWithPasskey()`
2. `base44.auth.me()` to get email
3. syncSupabaseUser → supabase session
4. `window.location.reload()`

### Auth Rules (CRITICAL)
- NEVER call `loginViaEmailPassword` right after `register` — unverified users get broken sessions
- ALWAYS use `window.location.href` hard redirects (not `navigate()`) after auth — the auth provider must re-initialize
- Supabase session sync failures are caught and swallowed — **this is a known issue** that causes the app to appear logged in while Supabase has no session
- OAuth (Google/Apple) buttons are temporarily disabled for MVP launch

---

## 5. FINANCIAL DATA CONTEXT (The Brain)

**File:** `src/lib/FinancialDataContext.jsx`

This is the central data provider that wraps the entire authenticated app. It manages:

### State
- `loans`, `bills`, `incomes`, `payments`, `assets`, `savingsGoals` — all from Supabase
- `userProfile` — the **Base44** user object (from `base44.auth.me()`). Its `.id` is the Base44 UUID.
- `supaUser` — the **Supabase** auth user object. Its `.id` is the Supabase UUID.
- `loading` — global loading state

### loadAll() Function
1. Fetches Base44 user (`base44.auth.me()`) and Supabase session in parallel
2. Sets `userProfile` = Base44 user, `supaUser` = Supabase session user
3. **BAIL-OUT:** If `!currentSupaUser?.id`, sets all financial arrays to empty and returns — this is why pages show no data when Supabase session is missing
4. Fetches all 6 financial tables from Supabase in parallel, filtered by `user_id`
5. On auth state change (SIGNED_IN, TOKEN_REFRESHED, SIGNED_OUT), re-runs loadAll()

### Mutation Functions
- `payBill(bill, amount, date)` — optimistic insert into payments table
- `updateLoan(loanId, updates)` — optimistic update, scoped by user_id
- `addTransaction(data)` — optimistic insert into payments
- `reload()` — re-runs loadAll()
- `refreshUserProfile()` — re-fetches `base44.auth.me()`

### Key Pattern
All mutations use optimistic updates + rollback on error + toast notifications. Errors surface via `toast({ variant: "destructive" })`.

---

## 6. ENTITY / DATA MODEL

### Supabase Tables (Financial Data)
All have `user_id` (Supabase UUID) and RLS policies restricting to `created_by = {{user.email}}` or `user_id = auth.uid()`.

| Table | Key Fields | Required |
|-------|-----------|----------|
| **loans** | name, original_amount, current_balance, interest_rate, monthly_payment, payment_frequency (monthly/weekly/biweekly), due_day, due_day_of_week, start_date, category, status | name, original_amount, current_balance |
| **bills** | name, amount, payment_frequency, due_day, due_day_of_week, category, is_active, suggested_by_rayma, rayma_approval_status | name, amount |
| **incomes** | amount, week_start, note | amount, week_start |
| **payments** | loan_id, bill_id, payment_type (loan/bill), amount, payment_date, note | amount, payment_date |
| **transactions** | bank_account_id, date, description, amount, category, type (debit/credit), notes | date, amount, description |
| **bank_accounts** | name, institution, account_type, balance, currency, last_synced, link_method (manual/plaid), is_active | name, institution, balance |
| **assets** | name, amount, type (cash/investment/property/savings/other), notes | name, amount |
| **savings_goals** | name, target_amount, current_saved, weekly_contribution, target_date, status | name, target_amount |
| **profiles** | preferred_name, avatar_id, avatar_emoji, avatar_photo_url, preferred_currency, preferred_language, pay_frequency, pay_day, compact_mode, smart_alerts, auto_insights, subscription_type, ai_tokens_daily_limit | (all optional/nullable) |
| **loan_adjustments** | loan_id, amount, direction (add/subtract), reason, date | loan_id, amount, direction, date |

### Base44 Entities (Non-Financial)
| Entity | Purpose | RLS |
|--------|---------|-----|
| **ScannedDocument** | Uploaded documents for AI analysis | per-user (created_by email) |
| **PromoCode** | Promo codes for tokens/annual passes | admin only |
| **UserMemory** | AI memories (preferences, goals, habits) | per-user |
| **Feedback** | User feedback (bug, feature_request, general, compliment) | per-user + admin read |
| **NetWorthSnapshot** | Periodic net worth snapshots | per-user |
| **BudgetCategory** | Budget spending categories | per-user |
| **WeeklyIncome** | Weekly income tracking | per-user |
| **User** | Built-in — id, email, full_name, role + custom cosmetic/preference fields | built-in security |

---

## 7. PAGE-BY-PAGE ANALYSIS

### Dashboard (`/`)
- **Data:** Uses `useFinancialData()` for loans, bills, incomes, userProfile
- **Features:** Net worth summary, debt/bill carousels, mini-calendar, financial health score, AI insights, pull-to-refresh
- **Status:** Works IF Supabase session is established. Shows empty data otherwise (silent).

### Loans (`/loans`, `/add-loan`, `/loan/:id`)
- **LoansList:** Pulls from `useFinancialData().loans`
- **AddLoan:** Writes to Supabase `loans` table. Auto-calculates due date if not provided. Correctly throws "Missing User ID" error when `supaUser` is null.
- **LoanDetail:** Loan detail view with payment logging
- **Issue:** AddLoan sends `remaining_balance` and `due_date` fields that may not exist in the Supabase schema — needs verification.

### Bills (`/bills`)
- **Data:** `useFinancialData().bills`
- **Issues:**
  - `handleSave` does NOT destructure `{ error }` from Supabase insert/update responses — errors are silently swallowed (Supabase returns errors as objects, not thrown exceptions)
  - `user_id` uses optional chaining (`supaUser?.id`) — if null, insert fails silently via RLS
  - Delete uses password re-verification (Vault pattern) ✅
  - Mark-as-paid logs a payment to the payments table

### Bank Accounts (`/bank-accounts`)
- **Data:** Fetches its own local state (NOT from FinancialDataContext) — `bank_accounts` and `transactions` tables
- **Issues:**
  - `saveAccount` and `saveTx` catch errors but only `console.error` — no user-facing feedback
  - `supaUser?.id` used correctly (optional chaining)
  - Delete uses Vault pattern ✅
  - CSV export for transactions
  - No Plaid bank linking UI (backend functions exist but not wired)

### Assets (`/assets`)
- **Data:** Local state + `useFinancialData().loans` for liabilities
- **Issues:**
  - `handleSave` has NO try/catch wrapper — `if (error) throw error;` but nothing catches → crashes React component
  - Uses `supaUser.id` (no optional chaining) on line 93 — crashes if supaUser is null
  - `useEffect` correctly guards with `if (supaUser?.id) loadAssets()` but `handleSave` doesn't
  - Delete uses Vault pattern ✅

### Profile (`/profile`)
- **Data:** `useFinancialData().userProfile` (Base44 user) + `supaUser`
- **Issues:**
  - `handleSave` uses `.eq('id', userProfile.id)` — `userProfile` is the Base44 user object, so `.id` is the Base44 UUID, NOT the Supabase auth UUID → update matches zero rows → silently does nothing
  - Photo upload uses `supaUser.id` without null check → crashes if supaUser is null
  - `safePayload` sends `null` for empty strings — if profiles table has NOT NULL constraints, this fails
  - Delete account: sequential Supabase table wipes + `deleteUserAccount` backend function + Supabase signOut + redirect
  - Export data: calls `exportUserData` backend function, downloads JSON
  - Both export and delete require password re-verification (Vault pattern) ✅

### Budget (`/budget`, `/budget-dashboard`)
- Budget category management and spending tracking

### Finance (`/finance`)
- Aggregated financial overview

### Monthly Trend (`/trend`)
- Spending/income trends over time

### Debt Payoff Simulator (`/debt-simulator`, `/simulator`)
- Loan payoff simulation tools

### Tax Summary (`/tax-summary`)
- Tax-related expense/income summary

### Monthly Recap (`/monthly-recap`)
- Monthly financial recap

### Document Vault (`/documents`)
- **Data:** Base44 `ScannedDocument` entity (NOT Supabase)
- **Status:** ✅ WORKS — because it uses Base44, not Supabase. No bridge dependency.
- Features: Upload documents, AI analysis, review modal, folder categorization

### Store (`/store`)
- **Stripe integration:** Lithium ($49.99/yr, $5.99/mo), Insert Coin ($1.99 one-time), Arcade Generator ($11.99/mo, $95.99/yr)
- Promo code redemption via `redeemPromoCode` backend function
- Native IAP bridge for mobile (hides Stripe checkout in WebView)
- **DO NOT TOUCH** — mobile bridging logic is sensitive

### Admin (`/admin`)
- **Issue:** Reads from Base44 entities (Loan, Bill, Transaction, User) but financial data was migrated to Supabase → all stats show zero
- Promo code management
- Admin-only (requires `user.role === 'admin'`)

### Reminders (`/reminders`)
- **Issues:**
  - Only has email field — NO phone number input
  - Uses `base44.integrations.Core.SendEmail` — only sends to registered app users
  - NO SMS capability (would need Twilio integration)
  - `bills` state is never populated — `loadData()` only fetches loans from Base44, not bills
  - No phone-based auth exists

### Auth (`/auth`)
- Login, Register (with OTP), Passkey (web only)
- Forgot password / Reset password flows
- **DO NOT modify auth logic without explicit user approval**

### Onboarding (`/onboarding`)
- Initial setup flow for new users

### Legal Pages
- Privacy Policy (`/privacy`), Terms of Service (`/terms`)
- **Issue:** TermsOfService references Plaid in sections 5 and 7 (inconsistency — product is manual-entry, no Plaid)

### Security Audit (`/security`)
- Security overview page

### Feedback (`/feedback`)
- User feedback submission (uses Base44 Feedback entity)

### Arcade (`/arcade`)
- Token-earning mini-games (SkyStriker, RetroSnake, SpaceInvaders)
- Score tracking via `saveArcadeScore` / `arcadeScores` backend functions
- Token rewards via `rewardArcadeTokens`

---

## 8. BACKEND FUNCTIONS

| Function | Purpose | Notes |
|----------|---------|-------|
| `syncSupabaseUser` | Creates/finds Supabase user matching Base44 email, returns temp token | Core of the auth bridge |
| `deleteUserAccount` | Deletes Supabase auth user + Base44 user record (service role) | Called from Profile delete flow |
| `exportUserData` | Exports all user data as JSON | Called from Profile export flow |
| `createCheckoutSession` | Creates Stripe checkout session | Includes `base44_app_id` in metadata |
| `stripeWebhook` | Handles Stripe webhooks (checkout.session.completed, etc.) | Uses async signature validation |
| `redeemPromoCode` | Validates and redeems promo codes, grants tokens/annual pass | Anti-reuse: inserts record before granting |
| `plaidLinkToken` | Generates Plaid link token | NOT wired to frontend UI |
| `plaidExchangeToken` | Exchanges Plaid public token for access token | NOT wired to frontend UI |
| `detectRecurringPayments` | AI detection of recurring payments from transactions | Not actively used in UI |
| `takeNetWorthSnapshot` | Periodic net worth snapshot | Should be scheduled via automation |
| `arcadeScore` / `arcadeScores` / `saveArcadeScore` | Arcade game score management | |
| `rewardArcadeTokens` | Grants AI tokens for arcade achievements | |
| `resetDailyEnergyBars` | Resets daily token limits | Should be scheduled (daily at midnight) |
| `resetFreeUserEnergyBars` | Resets free user token limits | Should be scheduled |
| `cleanupOrphanedTransactions` | Cleans up orphaned transaction records | Maintenance function |

### SDK Version Note
Backend functions pin an older version of the Base44 SDK (`npm:@base44/sdk@0.8.38`). The frontend uses `@base44/sdk@0.8.39`.

---

## 9. CRITICAL KNOWN ISSUES

### 🔴 ROOT CAUSE (Blocks Everything)
1. **Missing Vite env vars in published build** — `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` were set after publishing. Published app uses placeholder values. **FIX: Unpublish → verify secrets → re-publish.**

### 🔴 Silent Failures
2. **AuthContext swallows Supabase sync errors** — `AuthContext.jsx` catches syncSupabaseUser failures silently, proceeds as if logged in. User appears authenticated but Supabase has no session.
3. **FinancialDataContext bails silently** — When `supaUser` is null, `loadAll()` sets all data to empty arrays and returns. No error shown to user.
4. **Bills.jsx doesn't check insert errors** — Supabase insert errors returned as objects, not thrown. Code doesn't destructure `{ error }` or check it.
5. **BankAccounts.jsx only console.errors** — Errors caught but not surfaced to user.
6. **AssetDashboard.jsx has no try/catch on handleSave** — Uncaught errors crash the component.

### 🔴 ID Mismatches
7. **Profile.jsx uses wrong ID** — `.eq('id', userProfile.id)` uses Base44 UUID, not Supabase auth UUID. Should use `supaUser.id`.
8. **Profile photo upload crashes** — Uses `supaUser.id` without null check.

### 🟡 Feature Gaps
9. **No phone number field in Reminders** — Only email. No SMS capability.
10. **No phone-based auth** — Only email/password/passkey.
11. **No calendar page** — `/calendar` route doesn't exist. MiniCalendar only embedded in Dashboard.
12. **Plaid not wired to frontend** — Backend functions exist, no UI.
13. **Admin reads from wrong database** — Uses Base44 entities (empty) instead of Supabase.
14. **Reminders doesn't load bills** — `loadData()` only fetches loans.

### 🟡 Inconsistencies
15. **TermsOfService references Plaid** — Sections 5 and 7 mention Plaid; product is manual-entry.
16. **Auth.jsx has hardcoded English strings** — Not fully i18n covered.
17. **Landing.jsx has hardcoded English strings** — Not fully i18n covered.
18. **Apple Sign-In button present but not implemented.**
19. **Missing "Restore Purchases" flow** — IAP restore not wired.
20. **Currency picker** — Has COP, ARS, BRL, CLP added but may need locale formatting verification.

---

## 10. THE 4 PROPOSED PATCHES (Gemini's Plan) — AUDIT

These patches aim to "unmask" silent failures and fix ID mismatches. **None have been applied.** Here's the specific analysis:

### Patch 1: Profile.jsx ID Fix
- **Proposal:** Change `.eq('id', userProfile.id)` to `.eq('id', supaUser.id)`
- **Diagnosis:** ✅ Correct — userProfile is Base44 user, wrong ID
- **Problem:** No null guard on `supaUser`. `handleSave` checks `if (!userProfile) return` but NOT `if (!supaUser)`. If supaUser is null (the exact failure scenario), `supaUser.id` throws TypeError → crash.
- **Correct fix:** Add `if (!userProfile || !supaUser?.id) return;` before the query, then use `.eq('id', supaUser.id)`.

### Patch 2: BankAccounts.jsx Error Unmasking
- **Proposal:** Change `console.error` to `alert("Error: " + error.message)`, add `.eq('user_id', supaUser.id)`
- **Problems:**
  - Variable name bug: catch variable is `err`, not `error` — `error.message` would be a ReferenceError
  - Removes null safety: says `supaUser.id` but code correctly uses `supaUser?.id`
  - Redundant: insert already includes `user_id: supaUser?.id`
  - Wrong UI pattern: app has toast system (`@/components/ui/use-toast`), not `alert()`

### Patch 3: Bills.jsx Error Unmasking
- **Proposal:** `const { error } = await supabase.from('bills').insert([data]); if (error) { alert(...); return; }`
- **Problems:**
  - `return` before `setSaving(false)` and `setDialogOpen(false)` → button stuck on "Saving...", dialog locked open
  - Only fixes insert path, not update path (line 87 also ignores errors)
  - Uses `alert()` instead of toast

### Patch 4: AssetDashboard.jsx Error Unmasking
- **Proposal:** Wrap handleSave in try/catch, `alert(err.message)`
- **Problems:**
  - Doesn't address `supaUser.id` null safety on line 93
  - Uses `alert()` instead of toast
- **Diagnosis:** ✅ Correct that try/catch is missing

### Overall Assessment of the 4 Patches
- **Diagnoses:** All 4 correctly identify real issues
- **Fixes:** All 4 have implementation bugs (wrong variable names, missing null guards, stuck UI states, wrong error display pattern)
- **Root cause:** None address the actual root cause (missing env vars). They convert silent failures to visible errors — useful for debugging but doesn't fix the data flow.

---

## 11. CODING RULES & PREFERENCES

### Branding
- App name: "Rayma AI" everywhere
- Remove all legacy "RAYMA" / "Debt Tracker" references

### i18n (Translations)
- ALL user-facing text wrapped in translation engine
- Import `useLanguage` from `@/lib/LanguageContext` and `t` from `@/lib/i18n`
- Or use `useT()` hook (lazy-loaded for performance)
- Never hardcode English strings in UI
- Support South American locales: Colombia (COP), Argentina (ARS), Brazil (BRL), Chile (CLP) + US (USD), EUR, GBP, MXN

### Security (The Vault)
- Any destructive action (delete account, loan, bill, payment, asset, bank account) MUST use password re-verification
- Pattern: Show password modal → `supabase.auth.signInWithPassword()` to verify → execute deletion
- Never allow direct unauthenticated deletions

### UI Consistency
- Use shadcn/ui components from `@/components/ui/`
- Use custom wrappers: `ProtectedLayout`, `SideDrawer`, `Layout`
- Use toast notifications (`@/components/ui/use-toast`), NOT `alert()`
- Icons: lucide-react only

### Environment Variables
- Always use `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY`
- Never hardcode credentials
- Vite env vars are build-time — must be set BEFORE publishing

### Mobile Responsiveness
- All components must be mobile-responsive and touch-friendly
- No hover-dependent styling
- Lock body scroll and block pointer events during modals/menus/tours
- Native-feel CSS resets (no overscroll, no text select)
- Hide web-based Stripe checkout in mobile WebView
- Safe area insets for notches

### Data Operations
- Optimistic UI updates for financial transactions
- Sequential (not parallel) deletions for account deletion (prevents partial wipes)
- All Supabase operations wrapped in try/catch
- All API calls require try/catch for production stability

### Auth
- Use `window.location.href = '/auth'` for redirects, not SDK calls
- Protected routes must await AuthContext loading states
- Hard redirects after auth success (not `navigate()`)
- Do not modify auth logic without explicit user approval

### Component Structure
- Small focused files (50 lines or less per component)
- Every new component/page gets its own file
- Export as default, named same as file
- Use `@/` alias imports, not relative paths
- ESM only — never use `require()` or `module.exports`
- JSX only in `.jsx` files

---

## 12. AUTOMATIONS (Scheduled Tasks Needed)

| Automation | Function | Schedule | Status |
|-----------|----------|----------|--------|
| Daily energy bar reset | `resetDailyEnergyBars` | Daily at midnight (user local) | Not created |
| Free user energy reset | `resetFreeUserEnergyBars` | Daily at midnight | Not created |
| Net worth snapshot | `takeNetWorthSnapshot` | Daily or weekly | Not created |

---

## 13. PENDING WORK / TODO LIST

### Critical (Blocks Core Functionality)
- [ ] Unpublish app, verify Supabase env vars are set, re-publish
- [ ] Fix Profile.jsx ID mismatch (use `supaUser.id` with null guard)
- [ ] Fix Profile.jsx photo upload null safety
- [ ] Add error checking to Bills.jsx insert/update (with proper state cleanup)
- [ ] Add try/catch to AssetDashboard.jsx handleSave (with null guard on supaUser)
- [ ] Surface BankAccounts.jsx errors via toast (not alert, not console.error)
- [ ] Make AuthContext Supabase sync failure visible (not silent)

### High Priority
- [ ] Fix Admin panel to read from Supabase instead of Base44 entities
- [ ] Fix Reminders.jsx to load bills (currently only loads loans)
- [ ] Create scheduled automations for energy bar resets
- [ ] Create scheduled automation for net worth snapshots

### Feature Gaps
- [ ] Add phone number field to Reminders
- [ ] Implement SMS reminders (requires Twilio integration + backend function + secret)
- [ ] Implement phone-based auth (requires Supabase phone auth config)
- [ ] Create full calendar page (`/calendar`)
- [ ] Wire Plaid bank linking to frontend UI
- [ ] Implement "Restore Purchases" flow for IAP
- [ ] Remove Plaid references from TermsOfService
- [ ] Implement Apple Sign-In (button exists but not functional)
- [ ] Add full i18n coverage to Auth.jsx and Landing.jsx

### Polish
- [ ] Verify locale formatting for COP, ARS, BRL, CLP
- [ ] Replace default favicons and placeholder app icons
- [ ] Update backend functions to use latest Base44 SDK version

---

## 14. KEY FILE MAP

### Core Infrastructure
- `src/App.jsx` — Router, auth wrappers, lazy-loaded pages
- `src/main.jsx` — Entry point
- `src/lib/AuthContext.jsx` — Auth provider, session sync, loading states
- `src/lib/FinancialDataContext.jsx` — Central data provider (the "Brain")
- `src/lib/supabaseClient.js` — Supabase client initialization
- `src/lib/LanguageContext.jsx` — i18n provider
- `src/lib/i18n.js` — Translation strings
- `src/lib/utils.js` — `cn()` utility
- `src/lib/query-client.js` — React Query client
- `src/lib/PageNotFound.jsx` — 404 page

### Layout & Navigation
- `src/components/Layout.jsx` — App shell (top bar, bottom nav, Quick Add, RaymaChat)
- `src/components/ProtectedLayout.jsx` — Auth guard wrapper
- `src/components/ProtectedRoute.jsx` — Route-level auth guard
- `src/components/SideDrawer.jsx` — Slide-out menu
- `src/components/QuickAddMenu.jsx` — Quick add floating menu
- `src/components/MoreMenu.jsx` — More options menu
- `src/components/RaymaChat.jsx` — AI chat assistant

### Pages
- `src/pages/Dashboard.jsx` — Main dashboard
- `src/pages/Auth.jsx` — Login/Register/OTP
- `src/pages/Profile.jsx` — User profile settings
- `src/pages/Bills.jsx` — Bills management
- `src/pages/BankAccounts.jsx` — Bank accounts & transactions
- `src/pages/AssetDashboard.jsx` — Assets & net worth
- `src/pages/AddLoan.jsx` — Add new loan
- `src/pages/LoansList.jsx` — Loans list
- `src/pages/LoanDetail.jsx` — Loan detail
- `src/pages/Store.jsx` — Stripe store (DO NOT TOUCH mobile bridge)
- `src/pages/Admin.jsx` — Admin panel
- `src/pages/Reminders.jsx` — Payment reminders
- `src/pages/DocumentVault.jsx` — Document scanner/vault
- `src/pages/Budget.jsx` — Budget management
- `src/pages/BudgetDashboard.jsx` — Budget overview
- `src/pages/Finance.jsx` — Financial overview
- `src/pages/MonthlyTrend.jsx` — Spending trends
- `src/pages/MonthlyRecap.jsx` — Monthly recap
- `src/pages/TaxSummary.jsx` — Tax summary
- `src/pages/DebtPayoffSimulator.jsx` — Debt payoff simulator
- `src/pages/Simulator.jsx` — Loan simulator
- `src/pages/Onboarding.jsx` — New user onboarding
- `src/pages/Landing.jsx` — Landing page
- `src/pages/SecurityAudit.jsx` — Security audit
- `src/pages/PrivacyPolicy.jsx` — Privacy policy
- `src/pages/TermsOfService.jsx` — Terms of service
- `src/pages/Feedback.jsx` — Feedback form
- `src/pages/RemoteSupport.jsx` — Remote support
- `src/pages/ForgotPassword.jsx` — Password reset request
- `src/pages/ResetPassword.jsx` — Password reset
- `src/arcade.jsx` — Arcade games hub

### Components
- `src/components/RAYMAInsights.jsx` — AI insights + onboarding tour
- `src/components/FinancialHealthScore.jsx` — Health score widget
- `src/components/NetWorthChart.jsx` — Net worth chart
- `src/components/DueSoonAlert.jsx` — Due soon alert
- `src/components/DueThisWeek.jsx` — Due this week
- `src/components/StatsCard.jsx` — Stats card
- `src/components/MiniCalendar.jsx` — Mini calendar
- `src/components/BillCard.jsx` — Bill card
- `src/components/BillCalendar.jsx` — Bill calendar
- `src/components/LoanCard.jsx` — Loan card
- `src/components/LoanForm.jsx` — Loan form
- `src/components/EditLoanForm.jsx` — Edit loan form
- `src/components/PaymentItem.jsx` — Payment item
- `src/components/PaymentButton.jsx` — Payment button
- `src/components/LatePaymentLog.jsx` — Late payment logger
- `src/components/IncomeLogGrouped.jsx` — Income logger
- `src/components/AddBillDialog.jsx` — Add bill dialog
- `src/components/BillPriceAlert.jsx` — Bill price alert
- `src/components/BankSyncNotice.jsx` — Bank sync notice
- `src/components/CashFlowForecast.jsx` — Cash flow forecast
- `src/components/TipCloud.jsx` — Tip cloud
- `src/components/ProgressRing.jsx` — Progress ring
- `src/components/EnergyDisplay.jsx` — AI token battery indicator
- `src/components/AvatarPicker.jsx` — Avatar picker
- `src/components/ThemeToggle.jsx` — Theme toggle
- `src/components/PushNotificationPrompt.jsx` — Push notification prompt
- `src/components/UserNotRegisteredError.jsx` — Not registered error
- `src/components/GoogleIcon.jsx` — Google icon
- `src/components/AuthLayout.jsx` — Auth layout
- `src/components/ui/RemoteAssistanceCard.jsx` — Remote assistance

### Backend Functions (`base44/functions/`)
See section 8 for full list.

### Entities (`base44/entities/`)
See section 6 for full list.

### Agent
- `base44/agents/rayma.jsonc` — Rayma AI agent config

### Hooks
- `src/hooks/useCurrency.js` — Locale-aware currency formatting
- `src/hooks/useBackHandler.js` — Hardware back button handler
- `src/hooks/use-mobile.jsx` — Mobile detection

### Utilities
- `src/utils/energyBarsUtil.js` — Token battery utilities
- `src/utils/formatLocalized.js` — Localized formatting
- `src/utils/index.ts` — General utilities (includes `createPageUrl`)
- `src/paymentBridge.js` — IAP payment bridge
- `src/lib/runRemoteDiagnostic.js` — Remote diagnostics
- `src/lib/app-params.js` — App parameters

---

## 15. STYLING SYSTEM

### Design Tokens (`src/index.css`)
- Light theme: Teal primary (177 85% 45%), Navy foreground (215 25% 18%)
- Dark theme: Teal primary (177 85% 50%), Dark navy background (215 30% 10%)
- Fonts: DM Sans (heading), Inter (body)
- Radius: 0.875rem (rounded-2xl/3xl aesthetic)

### Tailwind Config (`tailwind.config.js`)
- Maps CSS tokens to Tailwind classes
- Dark mode: class-based
- Custom: scrollbar-hide, safe-top, safe-bottom, pb-safe utilities

### CSS Rules
- `body { overscroll-behavior-y: none; user-select: none; }` — native feel
- Tour active state blocks background interaction
- RaymaChat panel hidden during tours

---

## 16. STRIPE INTEGRATION

### Products
| Product | Stripe ID | Pricing |
|---------|-----------|---------|
| Rayma AI Lithium Upgrade | prod_UnHLfPUDLKTLMb | $49.99/year, $5.99/month |
| Rayma AI Insert Coin | prod_UnHLhu40oDhFgI | $1.99 one-time |
| Rayma AI Arcade Generator | prod_UnHL5h2Ma9Ttyk | $11.99/month, $95.99/year |

### Secrets
- `STRIPE_SECRET_KEY` — Live API key
- `STRIPE_PUBLISHABLE_KEY` — Frontend publishable key
- `STRIPE_TEST_SECRET_KEY` — Test mode
- `STRIPE_TEST_PUBLISHABLE_KEY` — Test mode frontend
- `STRIPE_WEBHOOK_SECRET` — Webhook signing secret

### Rules
- Checkout sessions must include `metadata: { base44_app_id: Deno.env.get("BASE44_APP_ID") }`
- Block checkout from iframe — alert user that checkout only works from published app
- App is public (no login required) — do NOT use `base44.auth.me()` in checkout flow
- Webhook handler uses async signature validation (SubtleCrypto)

---

## 17. TEST DATABASE

The app has **two separate databases**: Production and Test.
- Production mode (default): data operations use Production database
- Test mode: must explicitly set `data_env="dev"` in database tool calls
- **Current mode: Production**

---

## 18. LESSONS LEARNED (Dead Ends — Do Not Retry)

1. **Promise.all for account deletion** — leads to partial data wipe on failure; use sequential deletions with error checking.
2. **Bcrypt 72-byte limit** — double UUID generation in syncSupabaseUser exceeds bcrypt's 72-byte password limit. Keep temp tokens short.
3. **Throwing errors in AuthContext syncSupabaseUser** — caused fatal lockout; reverted to silent handling.
4. **Using `navigate()` after auth** — doesn't force provider re-initialization; always use `window.location.href`.

---

*This document is the complete brain transfer for Rayma AI. Any developer (human or AI) should be able to understand the full app state from this document alone.*