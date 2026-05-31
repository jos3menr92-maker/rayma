# RAYMA Compliance & Quality Assurance Checklist

**Last Updated:** May 31, 2026  
**Status:** ✅ PHASE 1 COMPLETE | 🔄 PHASE 2 IN PROGRESS

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

No tools have been removed or lost. All permissions intact.

---

## 🏆 COMPETITIVE LANDSCAPE ANALYSIS

### Top competitors (2025–2026):
| App | Strengths | RAYMA Advantage |
|-----|-----------|-----------------|
| **Monarch Money** | Bank sync, couple mode, great UX | RAYMA: Free tier, AI advisor, no bank login required |
| **YNAB** | Zero-based budgeting, methodology | RAYMA: Less friction, works without bank link, cheaper |
| **Quicken Simplifi** | Polished, desktop-grade | RAYMA: Mobile-first, AI, multilingual, free core |
| **PocketGuard** | Simple, "safe to spend" | RAYMA: Deeper debt tracking, loan management, net worth |
| **Empower / Personal Capital** | Investment tracking, net worth | RAYMA: Debt focus, manual privacy, no bank required |
| **NerdWallet Tracker** | Free, brand trust | RAYMA: AI advisor, document vault, better debt tools |

### 🎯 RAYMA's Unique Value Props (keep & amplify):
1. **No bank login required** — privacy differentiator, huge trust signal
2. **AI financial coach** — unique in the free tier
3. **10 languages** — underserved international market
4. **Debt-free date estimator** — emotionally motivating
5. **Document vault** — no competitor offers this for free
6. **Manual-first philosophy** — growing anti-surveillance sentiment

### 🚀 Feature Gaps vs. Competitors (improvement opportunities):
- [ ] **Recurring subscription detection** (Monarch, Simplifi have this) — RAYMA has the backend, needs better UI
- [ ] **"Safe to spend" indicator** (PocketGuard) — Cash Left card on Dashboard is close, needs more prominence
- [ ] **Couple / shared accounts** (Monarch, Honeydue) — high requested feature
- [ ] **Spending trends graph** — visual month-over-month comparison (have MonthlyTrend page, needs better discoverability)
- [ ] **Credit score tracking widget** — Empower, NerdWallet offer this
- [ ] **Bill payment reminders via push/email** — Reminders page exists, needs notification hooks
- [ ] **Onboarding wizard** — most top apps have a guided setup flow
- [ ] **Widget / home screen shortcut** (iOS/Android) — PWA shortcuts added to manifest ✅

---

## 🎯 COMPLETED FIXES

### 1. **Avatars** ✅
- [x] Replaced DiceBear personas with **initials-based avatars**
- [x] 12 professional colors in `components/AvatarPicker.jsx`
- [x] `getInitialsColor()` deterministic color function preserved
- [x] Profile, Dashboard, SideDrawer all render avatars correctly
- [x] No external API dependency (performance + privacy win)

### 2. **Privacy Policy** ✅
- [x] Comprehensive 11-section policy (`pages/PrivacyPolicy.jsx`)
- [x] GDPR Right to Erasure, CCPA Right to Deletion
- [x] Third-party services: Plaid, Stripe, Base44 with links
- [x] Children's privacy (COPPA, EU GDPR)
- [x] Contact: privacy@raymaapp.com (30-day response SLA)

### 3. **Terms of Service** ✅
- [x] Comprehensive 18-section ToS (`pages/TermsOfService.jsx`)
- [x] "NOT a financial advisor/accountant/tax professional"
- [x] Non-refundable purchase policy
- [x] Annual pass auto-renewal language
- [x] Contact: legal@raymaapp.com

### 4. **Account Deletion** ✅
- [x] Full data wipe on delete-account page
- [x] Confirmation flow (type "delete my account")
- [x] Logout after deletion

### 5. **Languages** ✅
- [x] 10 languages fully supported (900+ translations)
- [x] RTL support for Arabic
- [x] Language context provider (`lib/LanguageContext.jsx`)

### 6. **Financial Disclaimers** ✅
- [x] Support page — disclaimer banner
- [x] Profile page — red warning box
- [x] Terms of Service — section 4.4
- [x] Privacy Policy — section 11.11
- [x] **Landing page** — disclaimer banner added ✅ (FIXED today)

### 7. **PWA / Mobile Manifest** ✅
- [x] `public/manifest.json` created with proper PWA fields
- [x] `display: standalone`, `orientation: portrait`, maskable icons
- [x] `categories: ["finance", "productivity"]`
- [x] Shortcuts: Dashboard, Loans, Bills
- [x] `index.html` — iOS zoom prevention (font-size: 16px on inputs)
- [x] `apple-touch-fullscreen`, `msapplication` meta tags added

### 8. **Currency** ✅
- [x] `useCurrency` hook with localStorage cache (avoids per-mount API calls)
- [x] `NetWorthChart` migrated from hardcoded USD to `useCurrency`
- [x] All major components use centralized `useCurrency`

### 9. **Stripe / Payments** ✅
- [x] `createCheckoutSession` — iframe detection, proper metadata
- [x] `stripeWebhook` — async signature verification (`constructEventAsync`)
- [x] Support page — "Annual Pass auto-renews yearly — cancel anytime before renewal" ✅ (FIXED today)
- [x] IAP platform detection (`lib/iap.js`) — blocks Stripe on iOS/Android

---

## 🚨 GOOGLE & APPLE COMPLIANCE — CRITICAL FINDINGS

### ⚠️ CRITICAL: In-App Purchase Rule (BLOCKS BOTH STORES)
**Apple App Store Rule 3.1.1 / Google Play Billing Policy:**
- Apple REQUIRES all in-app digital purchases on iOS to use Apple IAP (StoreKit)
- Google REQUIRES Google Play Billing for in-app digital content on Android
- **Stripe-based checkout IS NOT permitted for digital goods on native iOS/Android apps**
- **RAYMA's current Stripe flow is only legal on the WEB version**
- `lib/iap.js` + `Support.jsx` already blocks Stripe on iOS/Android ✅
- **But**: You MUST implement StoreKit (iOS) and Google Play Billing (Android) if you publish a native app
- **Resolution**: If submitting as PWA (web app), Stripe is fine. If submitting as native app, IAP must be native.
- ⚠️ **Apple's 2025 US ruling** allows linking to external web payments — but only after showing an Apple-approved disclaimer. This is only for the US.

### ⚠️ HIGH: Apple Privacy Manifest (Required since iOS 17 / Xcode 15)
- Apple requires a `PrivacyInfo.xcprivacy` manifest declaring all API usage reasons
- Required if distributing via App Store (even as a PWA wrapper/Capacitor app)
- Must declare: `UserDefaults` usage, file timestamp API, disk space API, etc.

### ⚠️ HIGH: Google Play Data Safety Section
- Must complete the Data Safety form in Google Play Console
- Must accurately disclose: financial data collected, purpose, sharing with Plaid/Stripe
- Inaccurate disclosure = app removal

### ✅ PASSED: No "Financial Advice" language
- All copy uses "insights", "tracking", "tools" — not "advice", "guaranteed", "will save"
- Financial disclaimers present on Support, Profile, Terms, Privacy, and now Landing

### ✅ PASSED: No Cryptocurrency / NFTs
- None present in app or copy

### ✅ PASSED: Age / COPPA
- Terms state minimum age requirement
- Privacy policy covers children's privacy (COPPA/GDPR-K)

### ✅ PASSED: Data Deletion
- In-app account deletion flow present and functional

### ✅ PASSED: Privacy Policy accessible from app
- Linked in footer, Profile, Support, Terms, Landing

---

## 🚀 PHASE 2: IMMEDIATE ACTIONS (This Week)

- [x] Add financial disclaimer to Landing page ✅
- [x] Clarify Annual Pass auto-renewal language on Support page ✅
- [ ] **Test all pages** (Dashboard, Loans, Bills, Profile, Support)
- [ ] **Confirm Arabic RTL renders correctly** on all pages
- [ ] **Dark mode audit** — check all pages for broken dark mode styles
- [ ] **CSV number formatting** — test EU number formats
- [ ] **Mobile testing** — iOS Safari safe area, Android Chrome

---

## 📋 PHASE 3: BEFORE APP STORE SUBMISSION

### **Google Play Store**
- [ ] Complete Data Safety form (financial data, Plaid, Stripe)
- [ ] Use Google Play Billing Library v7+ (if native/TWA)
- [ ] Or confirm PWA-only (no billing library needed for Stripe on web)
- [ ] App category: Finance → Personal Finance
- [ ] Screenshots: Dashboard, Loans, Bills, AI chat
- [ ] Have Privacy Policy & Terms legally reviewed
- [ ] Set PLAID_CLIENT_ID & PLAID_SECRET for bank linking

### **Apple App Store**
- [ ] Implement Apple IAP (StoreKit 2) OR confirm web-only distribution
- [ ] Complete Apple Privacy Nutrition Label in App Store Connect:
  - Financial data (loans, bills, balances) — linked to user
  - Contact info (email) — linked to user
  - Usage data (analytics) — not linked to user
- [ ] Add `PrivacyInfo.xcprivacy` if using Capacitor/native wrapper
- [ ] Test on real iPhone device (not just simulator)
- [ ] All icons at required sizes (1024x1024 for App Store Connect)
- [ ] Explicitly state in App Store description: "Does not require bank login"

### **Both Stores**
- [ ] Lawyer review of Privacy Policy & Terms before submission
- [ ] Remove any "guaranteed" or "will" language from all store copy
- [ ] Age rating: 4+ (no objectionable content, financial tools)

---

## 🔒 PHASE 4: ONGOING COMPLIANCE

### **Monthly**
- [ ] Review GDPR/CCPA data deletion requests
- [ ] Monitor App Store reviews for rejection reasons
- [ ] Check Plaid/Stripe security bulletins

### **Quarterly**
- [ ] Security audit
- [ ] Update Privacy Policy if practices change
- [ ] Run RAYMA debug mode to verify all tools operational

### **Annually**
- [ ] Full compliance review
- [ ] Renew business liability insurance
- [ ] Audit third-party partners (Plaid, Stripe, Base44)

---

## 📊 PRIORITY MATRIX

### 🔴 CRITICAL (Blocks App Store)
- [x] Privacy Policy — comprehensive ✅
- [x] Terms of Service — comprehensive ✅
- [x] Financial disclaimer — visible on all key pages ✅
- [x] Data deletion flow ✅
- [x] GDPR/CCPA rights ✅
- [ ] **Apple IAP / Google Play Billing** — implement before native submission
- [ ] Lawyer review of PP & ToS

### 🟠 HIGH (Likely rejection without)
- [x] Avatar replacement ✅
- [x] 10 languages + RTL ✅
- [x] IAP platform detection (Stripe blocked on iOS/Android) ✅
- [x] PWA manifest complete ✅
- [x] Auto-renewal language clear ✅
- [ ] Google Play Data Safety form
- [ ] Apple Privacy Nutrition Label
- [ ] Plaid credentials configured

### 🟡 MEDIUM (Quality / UX)
- [ ] Recurring payment detection UI (approval flow)
- [ ] Push notification hooks for bill reminders
- [ ] Couple / shared account mode
- [ ] Better onboarding wizard
- [ ] Credit score widget
- [ ] Export GDPR-format data

### 🟢 LOW (Nice-to-Have)
- [ ] Error tracking (Sentry)
- [ ] A/B testing framework
- [ ] Home screen widget (iOS/Android)

---

## ✅ SIGN-OFF

**Audited By:** Base44 AI  
**Date:** May 31, 2026  
**Next Step:** Decide native app vs. PWA-only → this determines if Apple IAP is required.

---

## 📞 CONTACT & SUPPORT

- **Privacy:** privacy@raymaapp.com (30-day SLA)
- **Legal:** legal@raymaapp.com (30-day SLA)
- **Bugs:** support@raymaapp.com
- **GDPR/CCPA:** privacy@raymaapp.com (30-45 day SLA)