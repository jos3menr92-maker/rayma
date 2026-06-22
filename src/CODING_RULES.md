Markdown
# RAYMA — Coding Rules & Compliance Standards

**Purpose:** Every future code change must follow these rules to keep RAYMA legally compliant with Apple App Store, Google Play Store, GDPR, CCPA, and FTC requirements.

---

## 🔴 RULE 1 — NEVER USE STRIPE FOR IN-APP PURCHASES ON NATIVE MOBILE

**Apple Rule 3.1.1 / Google Play Billing Policy:**

- Stripe checkout is ONLY allowed on the **web** version of RAYMA.
- On iOS/Android native mobile → you MUST use the React Native bridge (`isNativeApp` check).
- NEVER link directly to Stripe on a mobile wrapper. 
- If adding a new purchase flow, you must intercept the click and post the `TRIGGER_NATIVE_PAYMENT` message to the React Native shell.

```js
// CORRECT — always gate Stripe behind the mobile check
if (isNativeApp && window.ReactNativeWebView) {
  window.ReactNativeWebView.postMessage(JSON.stringify({
    action: 'TRIGGER_NATIVE_PAYMENT',
    productId: planId
  }));
  return;
}
// Proceed with Stripe ONLY if on a standard web browser
🔴 RULE 2 — FINANCIAL DISCLAIMER ON EVERY NEW MONETIZED OR ADVICE-GIVING SCREEN
Any page that:

Shows financial calculations, projections, or AI advice

Sells tokens or the Annual Pass

Discusses debt, loans, budgets, or investments

MUST include this disclaimer (or link to it):   

JavaScript
<div className="p-4 bg-destructive/5 border border-destructive/20 rounded-2xl">
  <p className="text-xs font-semibold text-destructive mb-1">⚠️ Financial Disclaimer</p>
  <p className="text-xs text-muted-foreground">
    RAYMA provides tools for personal finance tracking only. Not financial advice.
    Consult a qualified financial professional before making financial decisions.
    See <a href="/privacy" className="underline text-primary">Privacy Policy</a> for full terms.
  </p>
</div>
Pages that already have it: Support, Profile, Landing, Onboarding, PrivacyPolicy, TermsOfService.   

🔴 RULE 3 — FORBIDDEN LANGUAGE (CAUSES STORE REJECTION)
NEVER use these words or phrases anywhere in the app (UI, copy, metadata, store listing):   

❌ Forbidden	✅ Use Instead
"guaranteed"	"may help", "can help", "designed to"
"will save you $X"	"helped identify potential savings of $X"
"I paid off $X using RAYMA"	"I tracked $X in debt and paid it off"
"financial advice"	"financial insights" / "financial tracking"
"investment advice"	"investment tracking"
"we guarantee"	"we aim to"
"no subscriptions" (if Annual Pass exists)	"no hidden fees"
"Join thousands of users" (unverified claim)	"Join users around the world"
Any specific dollar savings claim without attribution	Remove or attribute clearly
  
🔴 RULE 4 — DATA COLLECTION MUST STAY IN SYNC WITH PRIVACY POLICY
The Privacy Policy (pages/PrivacyPolicy.jsx) explicitly lists every data type collected.   

If you add a new entity, field, or data collection:   

Add it to section 2 of PrivacyPolicy.jsx   

Add it to section 9 of TermsOfService.jsx if it affects data processing   

Update the Google Play Data Safety form (manual step)   

Update the Apple Privacy Nutrition Label (manual step)   

Current declared data types:   

Account: name, email, password (hashed), profile prefs   

Financial: loans, bills, bank accounts, transactions, income, payments, savings, assets, documents   

Third-party: Plaid (bank data), Stripe (payment history)   

Analytics: pages visited, errors, device type   

🔴 RULE 5 — 30-DAY SOFT ACCOUNT DELETION (SECURITY VAULT)
DO NOT create a standalone DeleteAccount.jsx file. All account deletion is centralized in the Security Vault (pages/Profile.jsx) behind a password lock.   

When a user deletes their account, we DO NOT hard-delete immediately. Instead, we update their profile with a deletion tag:
  
deleted_at: new Date().toISOString()

A backend cron job will permanently wipe all associated entities (Loans, Bills, Transactions, etc.) after 30 days to comply with GDPR data retention safeguards.

🔴 RULE 6 — AUTO-RENEWAL MUST ALWAYS BE DISCLOSED
The Annual Pass auto-renews yearly. This disclosure is legally required by Apple, Google, FTC, and EU law.

Every place the Annual Pass price is shown MUST include:

"Auto-renews yearly — cancel anytime before renewal."   

Currently on: pages/Support.jsx footer.
If you add Annual Pass pricing anywhere else → add this disclosure there too.   

🟠 RULE 7 — NEW BACKEND FUNCTIONS MUST AUTHENTICATE USERS
Every new backend function that handles user data MUST:   

Call await base44.auth.me() at the top   

Return 401 if no user   

Return 403 if admin-only and user is not admin   

Use base44.asServiceRole only AFTER authenticating   

🟠 RULE 8 — ALL NEW ENTITIES NEED ROW-LEVEL SECURITY (RLS)
Every new entity JSON schema MUST include RLS scoped to the user's email:   

JSON
"rls": {
  "create": { "created_by": "{{user.email}}" },
  "read":   { "created_by": "{{user.email}}" },
  "update": { "created_by": "{{user.email}}" },
  "delete": { "created_by": "{{user.email}}" }
}
Exception: Admin-only entities use "created_by_role": "admin".
NEVER create an entity without RLS — it would expose all users' data to each other.   

🟠 RULE 9 — NEW PAYWALL / UPSELL SCREENS REQUIRE LEGAL REVIEW
Before adding any new paid feature, subscription, or token gate:   

Check Apple Rule 3.1.1 (digital goods must use Apple IAP on iOS)   

Check Google Play Billing policy   

Add auto-renewal disclosure if it's a recurring charge   

Add the financial disclaimer if the feature involves financial data or advice   

🟠 RULE 10 — CHILDREN'S PRIVACY (COPPA / GDPR-K)
RAYMA is for users 13+ (18+ in some jurisdictions). NEVER:   

Add features that could appeal to children as the primary audience   

Collect data from users who disclose they are under 13   

Add any marketing or data collection that violates COPPA   

🟡 RULE 11 — KEEP MANIFEST.JSON AND INDEX.HTML IN SYNC
public/manifest.json and index.html are required for PWA installation and Google Play TWA.   

If you change the app name, icons, theme color, or add new pages:   

Update manifest.json shortcuts if relevant   

Update theme_color in both manifest.json and index.html <meta name="theme-color">

Keep apple-touch-icon and manifest icons pointing to the same image   

🟡 RULE 12 — STORE-SAFE COPY STANDARDS
When writing any user-facing text (UI labels, tooltips, error messages, onboarding):   

Insights, not advice — "RAYMA suggests..." not "You should..."   

Tracking, not managing — "track your debt" not "manage your finances for you"   

Tools, not guarantees — "tools to help you" not "we will help you"   

Privacy-first framing — lead with "no bank login required" wherever possible   

📞 Compliance Contacts
Privacy questions: privacy@raymaapp.com   

Legal questions: legal@raymaapp.com   

Bug reports: support@raymaapp.com   

GDPR/CCPA requests: privacy@raymaapp.com   

Last reviewed: June 22, 2026   


***

Now it looks like it was written by the lead architect of RAYMA. 

Let's keep up this momentum. Do you want to dive into fixing that **"Ghost User" UI bug** next, where the dashboard spins forever for unauthenticated users? Or did you spot something else while reviewing the code?
