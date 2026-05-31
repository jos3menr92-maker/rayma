# RAYMA Compliance & Quality Assurance Checklist

**Last Updated:** May 31, 2026  
**Status:** ✅ PHASE 1 & 2 COMPLETE | 📋 PHASE 3 (App Store Submission) PENDING

> ⚠️ For coding rules that must be followed on every future change, see **CODING_RULES.md**

---

## 🤖 RAYMA AGENT — TOOL AUDIT

**Status: ✅ ALL TOOLS CONFIRMED ACTIVE**

RAYMA has full read/create/update/delete access to all 13 entities:
- ✅ Loan, Bill, Payment, WeeklyIncome, SavingsGoal
- ✅ Asset, NetWorthSnapshot, ScannedDocument, BankAccount
- ✅ Transaction, BudgetCategory, UserMemory, LoanAdjustment

Backend functions wired:
- ✅ `takeNetWorthSnapshot` — calculates & saves net worth snapshot
- ✅ `detectRecurringPayments` — scans 90 days of transactions for recurring bills

Memory system: ✅ Enabled (scope: both, per-user + cross-session)

---

## ✅ ALL COMPLETED ITEMS

### Core Legal & Privacy
- [x] Privacy Policy — 11-section, GDPR/CCPA, financial disclaimer, contact email
- [x] Terms of Service — 18-section, "not a financial advisor", liability caps, arbitration
- [x] Financial disclaimer — visible on Landing, Onboarding, Support, Profile, PP, ToS
- [x] Account deletion — wipes all 13 entity types, confirmation flow, logout after
- [x] GDPR Right to Erasure, CCPA Right to Deletion documented and enforced

### App Store Technical
- [x] `public/manifest.json` — name, icons, shortcuts, categories, maskable icon
- [x] `index.html` — viewport-fit=cover, apple-mobile-web-app-capable, theme-color
- [x] iOS input zoom prevention (font-size: 16px on inputs)
- [x] IAP guard — `lib/iap.js` blocks Stripe on iOS/Android (`isStripeAllowed()`)
- [x] Annual Pass auto-renewal disclosure on Support page
- [x] No "guaranteed", "will save", "financial advice" language in copy
- [x] Testimonials rewritten to remove implied outcome guarantees
- [x] No crypto / NFTs

### Security
- [x] Row-Level Security on all 13 entities (scoped to user email)
- [x] Stripe webhook uses `constructEventAsync` (async sig verification)
- [x] All backend functions authenticate via `base44.auth.me()`
- [x] Admin functions check `user.role === 'admin'`
- [x] Security audit page (`/security`) — RLS, auth, Stripe, localStorage checks

### Localization & Accessibility
- [x] 10 languages (English, Chinese, Hindi, Spanish, French, Arabic, Bengali, Portuguese, Russian, Japanese)
- [x] RTL support for Arabic
- [x] Initials-based avatars (no external API dependency)

---

## 📋 PHASE 3: YOUR ACTIONS BEFORE APP STORE SUBMISSION

These require manual work by the app owner — cannot be done in code.

### 🔴 CRITICAL
- [ ] **Lawyer review** of Privacy Policy & Terms before submission
- [ ] **Apple IAP (StoreKit 2)** — required if submitting as native iOS app (not needed for PWA)
- [ ] **Google Play Billing v7+** — required if submitting as native Android app (not needed for PWA/TWA)
- [ ] **Decide: PWA or Native?** — this determines the above two items

### 🟠 HIGH — Required by stores
- [ ] **Google Play Data Safety form** — fill out in Play Console:
  - Financial data collected (loans, bills, balances)
  - Shared with: Plaid (optional, read-only), Stripe (payment processing)
  - Purpose: app functionality
  - Encrypted in transit: yes
  - Users can delete: yes (in-app)
- [ ] **Apple Privacy Nutrition Label** — fill out in App Store Connect:
  - Financial info → linked to user
  - Contact info (email) → linked to user
  - Usage data (analytics) → not linked to user
- [ ] **App icon** — provide a proper 1024×1024 PNG (currently using a placeholder URL)
- [ ] **Set PLAID_CLIENT_ID & PLAID_SECRET** — if offering bank linking in production
- [ ] **Screenshots** — capture Dashboard, Loans, Bills, RAYMA AI chat (all on real device)
- [ ] **Store listing copy** — lead with "No bank login required", no forbidden language

### 🟡 MEDIUM — Quality
- [ ] Test Arabic RTL on all pages
- [ ] Dark mode audit on all pages
- [ ] CSV export number/date formatting for EU locales
- [ ] Mobile testing: iOS Safari safe area, Android Chrome

---

## 🏆 COMPETITIVE LANDSCAPE

| Competitor | RAYMA Advantage |
|---|---|
| Monarch Money | Free tier, AI advisor, no bank login |
| YNAB | Less friction, cheaper, works offline |
| Quicken Simplifi | Mobile-first, multilingual, free core |
| PocketGuard | Deeper debt tracking, loan management |
| Empower | Debt focus, manual privacy |
| NerdWallet | AI advisor, document vault |

### Feature gaps to consider closing:
- [ ] Recurring subscription detection UI (backend exists, needs approval UI)
- [ ] Push notification hooks for bill reminders
- [ ] Couple / shared account mode
- [ ] Credit score widget

---

## 🔒 ONGOING COMPLIANCE SCHEDULE

### Monthly
- Review GDPR/CCPA data deletion requests
- Monitor App Store reviews for rejection patterns
- Check Plaid/Stripe security bulletins

### Quarterly
- Run Security Audit page (`/security`)
- Run RAYMA debug mode (`rayma debug mode` + password)
- Update Privacy Policy if any data practices change

### Annually
- Full compliance review
- Renew business liability insurance
- Audit third-party partners (Plaid, Stripe, Base44)
- Review and update CODING_RULES.md

---

## 📞 Contacts

- **Privacy:** privacy@raymaapp.com (30-day SLA)
- **Legal:** legal@raymaapp.com (30-day SLA)
- **Bugs:** support@raymaapp.com
- **GDPR/CCPA:** privacy@raymaapp.com (30–45 day SLA)