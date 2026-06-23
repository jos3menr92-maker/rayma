# RAYMA — Development Rules & Compliance Guard

**This file is LAW for all future development on this app.**  
Every code change, new feature, new page, and new backend function MUST comply with these rules.  
Violating any rule risks Google Play or Apple App Store rejection, legal liability, or user data exposure.

---

## 🔴 RULE 1 — PAYMENTS: Never use Stripe for in-app digital goods on iOS/Android

- Stripe checkout is **only legal on the web version** of RAYMA.
- On iOS (native): use **Apple StoreKit / IAP**.
- On Android (native): use **Google Play Billing**.
- The `isStripeAllowed()` check from `lib/iap.js` MUST be called before every purchase action.
- **Never add a new purchase flow without calling `isStripeAllowed()` first.**
- Product IDs for Apple and Google are defined in `lib/iap.js` — keep them in sync with App Store Connect / Play Console.

```js
// REQUIRED pattern for every purchase button/action:
import { isStripeAllowed, getPlatform } from "@/lib/iap";
if (!isStripeAllowed()) {
  alert(`Purchases on ${getPlatform()} use the native app store.`);
  return;
}
```

---

## 🔴 RULE 2 — FINANCIAL DISCLAIMER: Must appear on every monetized or AI-advice screen

Every page that shows AI insights, financial calculations, or purchase options **must** display:

> "RAYMA is a personal finance tracking tool, not a financial advisor. Always consult a qualified professional before making major financial decisions."

- ✅ Already on: Landing, Onboarding, Support, Profile, Terms, Privacy Policy
- **Any new page that shows AI output, loan projections, savings estimates, or budget advice must include this disclaimer.**
- Use this pattern (copy exactly):

```jsx
<div className="p-4 bg-destructive/5 border border-destructive/20 rounded-2xl">
  <p className="text-xs font-semibold text-destructive mb-1">⚠️ Financial Disclaimer</p>
  <p className="text-xs text-muted-foreground">
    RAYMA provides tools for personal finance tracking only. Not financial advice.
    Consult a qualified financial professional before making financial decisions.
  </p>
</div>
```

---

## 🔴 RULE 3 — COPY: Banned words and phrases

The following words/phrases are **banned** from all user-facing copy (UI, landing page, store listing, onboarding, emails):

| ❌ Banned | ✅ Use instead |
|---|---|
| "guaranteed" | "estimated", "projected" |
| "will save you $X" | "may help identify savings of up to $X" |
| "I paid off $X using RAYMA" | "I tracked $X in debt using RAYMA" |
| "financial advice" | "financial insights" / "tracking tools" |
| "investment advice" | "investment tracking" |
| "earn money" / "make money" | do not use |
| "No subscriptions" (when Annual Pass exists) | "No hidden fees" |
| "thousands of users" (unless verified) | "users around the world" |
| "best app" / "#1 app" (unless verified) | describe features instead |

---

## 🔴 RULE 4 — DATA PRIVACY: Every new entity needs RLS

Every new entity created MUST include row-level security scoped to the user:

```json
"rls": {
  "create": { "created_by": "{{user.email}}" },
  "read":   { "created_by": "{{user.email}}" },
  "update": { "created_by": "{{user.email}}" },
  "delete": { "created_by": "{{user.email}}" }
}
```

- **Never create an entity without RLS** unless it is explicitly admin-only (use `"created_by_role": "admin"`).
- Never expose one user's financial data to another user under any circumstance.
- If a new entity stores financial data (amounts, balances, account info), it MUST be added to the `DeleteAccount` page wipe flow.

---

## 🔴 RULE 5 — ACCOUNT DELETION: Keep DeleteAccount.jsx in sync

`pages/DeleteAccount.jsx` deletes all user data entities on account deletion (GDPR/CCPA requirement).  
**Whenever a new entity is added to the app, it MUST be added to the deletion list in `DeleteAccount.jsx`.**

Current entities covered: Loan, Bill, Payment, Transaction, BankAccount, Asset, SavingsGoal,
BudgetCategory, WeeklyIncome, NetWorthSnapshot, UserMemory, ScannedDocument, LoanAdjustment.

---

## 🔴 RULE 6 — BACKEND FUNCTIONS: Admin-only functions must verify role

Any backend function intended for admin use (scheduled jobs, analytics, data management) MUST:

```js
const user = await base44.auth.me();
if (user?.role !== 'admin') {
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}
```

Never skip this check. A non-admin calling an admin function is a security vulnerability.

---

## 🟠 RULE 7 — PWA MANIFEST: Keep manifest.json valid

`public/manifest.json` must always be valid. After any change:
- `display` must be `"standalone"`
- `start_url` must be `"/"`
- Icons must be reachable URLs (test them)
- `categories` must include `"finance"`
- Shortcuts must point to real routes defined in `App.jsx`

---

## 🟠 RULE 8 — NEW PAGES: Must be accessible from Privacy Policy and Terms of Service

If a new page handles user data or purchases:
1. Reference it in the Privacy Policy (`pages/PrivacyPolicy.jsx`) under the relevant section.
2. Reference it in the Terms of Service (`pages/TermsOfService.jsx`) if it involves payments or legal obligations.
3. Link it from the Profile page (`pages/Profile.jsx`) if it's a settings/account page.

---

## 🟠 RULE 9 — EXTERNAL LINKS: Only link to known, stable third-party URLs

Allowed external links: `plaid.com/privacy`, `plaid.com/legal`, `stripe.com/legal`, `stripe.com/en-us/privacy`.  
Do not add external links to unverified or potentially unstable domains.  
All external links must open in a new tab (`target="_blank" rel="noopener noreferrer"`).

---

## 🟠 RULE 10 — AGE & CHILDREN: Never target or collect data from minors

- Never add features that target users under 13 (COPPA) or 16 (EU GDPR-K).
- Never add social features, user-generated public content, or location tracking.
- Never add advertising SDKs or behavioral tracking pixels.
- Age gate language ("You must be at least 13") is already in ToS — do not remove it.

---

## 🟡 RULE 11 — PLAID: Bank data is read-only and never stored raw

- Plaid access tokens are stored server-side only (never in localStorage or frontend state).
- Bank account numbers are never stored — only masked versions (last 4 digits max).
- If Plaid integration is expanded, update the Privacy Policy section 2 to reflect new data collected.

---

## 🟡 RULE 12 — STRIPE WEBHOOKS: Always use async signature verification

The `stripeWebhook` function must always use:
```js
await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
```
Never use the synchronous `constructEvent()` — it breaks in Deno's async crypto environment.

---

## 🟡 RULE 13 — LOCALIZATION: New user-facing strings need translation keys

- New UI text added to any page should use the `useLanguage` hook from `lib/LanguageContext.jsx`.
- If adding a new feature with significant copy, add translation keys to `lib/i18n.js` for all 10 languages.
- Never hardcode English-only strings on pages that are already translated.
- RTL support: Arabic text (and any future RTL language) needs `dir="rtl"` handling — test in Arabic mode.

---

## 🟡 RULE 14 — CURRENCY: Use the useCurrency hook, never hardcode USD

```js
import { useCurrency } from "@/hooks/useCurrency";
const { formatCurrency } = useCurrency();
// formatCurrency(1234.56) → "$1,234.56" or "€1.234,56" etc.
```

Never write `$${amount.toFixed(2)}` or `USD` directly in UI components.

---

## 📋 PRE-COMMIT CHECKLIST

Before shipping any significant change, verify:

- [ ] No banned copy words (Rule 3)
- [ ] New entities have RLS (Rule 4)
- [ ] New entities added to DeleteAccount wipe (Rule 5)
- [ ] Any AI/advice screen has financial disclaimer (Rule 2)
- [ ] Any purchase UI calls `isStripeAllowed()` (Rule 1)
- [ ] New admin functions have role check (Rule 6)
- [ ] manifest.json still valid (Rule 7)
- [ ] New strings use translation hook (Rule 13)
- [ ] Currency shown via `useCurrency` (Rule 14)

---

## 📞 Compliance Contacts

- Privacy questions: privacy@raymaapp.com
- Legal questions: legal@raymaapp.com
- Bug reports: support@raymaapp.com

**Last reviewed:** May 31, 2026  
**Applies to:** All future development sessions on this app