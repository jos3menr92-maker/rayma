# RAYMA — Coding Rules & Compliance Standards
# READ THIS BEFORE MAKING ANY CHANGE TO THE APP

**Purpose:** Every future code change must follow these rules to keep RAYMA legally compliant
with Apple App Store, Google Play Store, GDPR, CCPA, and FTC requirements.

---

## 🔴 RULE 1 — NEVER USE STRIPE FOR IN-APP PURCHASES ON NATIVE MOBILE

**Apple Rule 3.1.1 / Google Play Billing Policy:**

- Stripe checkout is ONLY allowed on the **web** version of RAYMA.
- On iOS (native) → must use **Apple StoreKit 2 / In-App Purchase**.
- On Android (native) → must use **Google Play Billing Library v7+**.
- `lib/iap.js` contains `isStripeAllowed()` — ALWAYS call this before showing any purchase UI.
- NEVER bypass or remove this guard.
- If adding a new purchase flow or upsell screen → wrap it with `isStripeAllowed()`.

```js
// CORRECT — always gate Stripe behind this check
import { isStripeAllowed } from "@/lib/iap";
if (!isStripeAllowed()) { /* show native IAP prompt instead */ return; }
```

---

## 🔴 RULE 2 — FINANCIAL DISCLAIMER ON EVERY NEW MONETIZED OR ADVICE-GIVING SCREEN

Any page that:
- Shows financial calculations, projections, or AI advice
- Sells tokens or the Annual Pass
- Discusses debt, loans, budgets, or investments

**MUST** include this disclaimer (or link to it):

```jsx
<div className="p-4 bg-destructive/5 border border-destructive/20 rounded-2xl">
  <p className="text-xs font-semibold text-destructive mb-1">⚠️ Financial Disclaimer</p>
  <p className="text-xs text-muted-foreground">
    RAYMA provides tools for personal finance tracking only. Not financial advice.
    Consult a qualified financial professional before making financial decisions.
    See <a href="/privacy" className="underline text-primary">Privacy Policy</a> for full terms.
  </p>
</div>
```

Pages that already have it: Support, Profile, Landing, Onboarding, PrivacyPolicy, TermsOfService.

---

## 🔴 RULE 3 — FORBIDDEN LANGUAGE (CAUSES STORE REJECTION)

NEVER use these words or phrases anywhere in the app (UI, copy, metadata, store listing):

| ❌ Forbidden | ✅ Use Instead |
|---|---|
| "guaranteed" | "may help", "can help", "designed to" |
| "will save you $X" | "helped identify potential savings of $X" |
| "I paid off $X using RAYMA" | "I tracked $X in debt and paid it off" |
| "financial advice" | "financial insights" / "financial tracking" |
| "investment advice" | "investment tracking" |
| "we guarantee" | "we aim to" |
| "no subscriptions" (if Annual Pass exists) | "no hidden fees" |
| "Join thousands of users" (unverified claim) | "Join users around the world" |
| Any specific dollar savings claim without attribution | Remove or attribute clearly |

---

## 🔴 RULE 4 — DATA COLLECTION MUST STAY IN SYNC WITH PRIVACY POLICY

The Privacy Policy (`pages/PrivacyPolicy.jsx`) explicitly lists every data type collected.

**If you add a new entity, field, or data collection:**
1. Add it to section 2 of PrivacyPolicy.jsx
2. Add it to section 9 of TermsOfService.jsx if it affects data processing
3. Update the Google Play Data Safety form (manual step — flag for owner)
4. Update the Apple Privacy Nutrition Label (manual step — flag for owner)

**Current declared data types:**
- Account: name, email, password (hashed), profile prefs
- Financial: loans, bills, bank accounts, transactions, income, payments, savings, assets, documents
- Third-party: Plaid (bank data), Stripe (payment history)
- Analytics: pages visited, errors, device type

---

## 🔴 RULE 5 — ACCOUNT DELETION MUST WIPE ALL ENTITY TYPES

`pages/DeleteAccount.jsx` must always delete ALL entity types when the user deletes their account.

**Current list (keep this complete):**
Loan, Bill, Payment, Transaction, BankAccount, Asset, SavingsGoal,
BudgetCategory, WeeklyIncome, NetWorthSnapshot, UserMemory, ScannedDocument, LoanAdjustment

**If you add a new entity:** add it to the `Promise.all` delete block in `DeleteAccount.jsx`.

---

## 🔴 RULE 6 — AUTO-RENEWAL MUST ALWAYS BE DISCLOSED

The Annual Pass auto-renews yearly. This disclosure is legally required by Apple, Google, FTC, and EU law.

**Every place the Annual Pass price is shown MUST include:**
> "Auto-renews yearly — cancel anytime before renewal."

Currently on: `pages/Support.jsx` footer.
If you add Annual Pass pricing anywhere else → add this disclosure there too.

---

## 🟠 RULE 7 — NEW BACKEND FUNCTIONS MUST AUTHENTICATE USERS

Every new backend function that handles user data MUST:
1. Call `await base44.auth.me()` at the top
2. Return `401` if no user
3. Return `403` if admin-only and user is not admin
4. Use `base44.asServiceRole` only AFTER authenticating

```js
const base44 = createClientFromRequest(req);
const user = await base44.auth.me();
if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
// For admin-only:
if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
```

---

## 🟠 RULE 8 — ALL NEW ENTITIES NEED ROW-LEVEL SECURITY (RLS)

Every new entity JSON schema MUST include RLS scoped to the user's email:

```json
"rls": {
  "create": { "created_by": "{{user.email}}" },
  "read":   { "created_by": "{{user.email}}" },
  "update": { "created_by": "{{user.email}}" },
  "delete": { "created_by": "{{user.email}}" }
}
```

Exception: Admin-only entities use `"created_by_role": "admin"`.
NEVER create an entity without RLS — it would expose all users' data to each other.

---

## 🟠 RULE 9 — NEW PAYWALL / UPSELL SCREENS REQUIRE LEGAL REVIEW

Before adding any new paid feature, subscription, or token gate:
- Check Apple Rule 3.1.1 (digital goods must use Apple IAP on iOS)
- Check Google Play Billing policy
- Add auto-renewal disclosure if it's a recurring charge
- Add the financial disclaimer if the feature involves financial data or advice
- Never promise specific financial outcomes as a selling point

---

## 🟠 RULE 10 — CHILDREN'S PRIVACY (COPPA / GDPR-K)

RAYMA is for users 13+ (18+ in some jurisdictions). NEVER:
- Add features that could appeal to children as the primary audience
- Collect data from users who disclose they are under 13
- Add any marketing or data collection that violates COPPA

If age verification is added in the future, it must gate access for under-13 users.

---

## 🟡 RULE 11 — KEEP MANIFEST.JSON AND INDEX.HTML IN SYNC

`public/manifest.json` and `index.html` are required for PWA installation and Google Play TWA.

If you change the app name, icons, theme color, or add new pages:
- Update `manifest.json` shortcuts if relevant
- Update `theme_color` in both `manifest.json` and `index.html` `<meta name="theme-color">`
- Keep `apple-touch-icon` and manifest icons pointing to the same image

---

## 🟡 RULE 12 — STORE-SAFE COPY STANDARDS

When writing any user-facing text (UI labels, tooltips, error messages, onboarding):

1. **Insights, not advice** — "RAYMA suggests..." not "You should..."
2. **Tracking, not managing** — "track your debt" not "manage your finances for you"
3. **Tools, not guarantees** — "tools to help you" not "we will help you"
4. **Privacy-first framing** — lead with "no bank login required" wherever possible
5. **No unverifiable statistics** — never say "saves users an average of $X/month" unless you have verified data

---

## 📋 COMPLIANCE CHECKLIST FOR NEW FEATURES

When adding any significant new feature, check:

- [ ] Does it collect new user data? → Update Privacy Policy + Data Safety forms
- [ ] Does it involve payments? → Check IAP rules, add auto-renewal disclosure
- [ ] Does it give financial suggestions? → Add financial disclaimer
- [ ] Does it create a new entity? → Add RLS, add to DeleteAccount.jsx
- [ ] Does it create a new backend function? → Add auth check
- [ ] Does it show new copy/marketing? → Check forbidden language list
- [ ] Does it target a new demographic? → Check age/COPPA rules
- [ ] Does it use a new third-party service? → Add to Privacy Policy section 7

---

## 📞 Compliance Contacts

- Privacy questions: privacy@raymaapp.com
- Legal questions: legal@raymaapp.com
- Bug reports: support@raymaapp.com
- GDPR/CCPA requests: privacy@raymaapp.com

**Last reviewed:** May 31, 2026