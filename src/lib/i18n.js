// RAYMA Internationalization
export const LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸", dir: "ltr" },
  { code: "zh", label: "中文 (Chinese)", flag: "🇨🇳", dir: "ltr" },
  { code: "hi", label: "हिन्दी (Hindi)", flag: "🇮🇳", dir: "ltr" },
  { code: "es", label: "Español (Spanish)", flag: "🇪🇸", dir: "ltr" },
  { code: "fr", label: "Français (French)", flag: "🇫🇷", dir: "ltr" },
  { code: "ar", label: "العربية (Arabic)", flag: "🇸🇦", dir: "rtl" },
  { code: "bn", label: "বাংলা (Bengali)", flag: "🇧🇩", dir: "ltr" },
  { code: "pt", label: "Português (Portuguese)", flag: "🇧🇷", dir: "ltr" },
  { code: "ru", label: "Русский (Russian)", flag: "🇷🇺", dir: "ltr" },
  { code: "ja", label: "日本語 (Japanese)", flag: "🇯🇵", dir: "ltr" }
];

export const translations = {
  en: {
    // Nav / Layout
    appName: "Debt & Bills", dashboard: "Dashboard", loans: "Loans", bills: "Bills", finance: "Finance", more: "More", signIn: "Sign in", signOut: "Sign Out", getStartedFree: "Get Started Free",
    
    // Dashboard Keys
    hello: "Hi", stayOnTop: "Stay on top of your finances", cashLeft: "Cash Left This Month", overspent: "overspent", income: "income", obligations: "obligations",
    monthlyRecap: "Monthly Recap", summary: "Income & spending summary", assets: "Assets", netWorthTracker: "Net worth tracker", expenseBreakdown: "Expense Breakdown",
    totalMonthly: "Total Monthly", loanBalances: "Loan Balances", remaining: "Remaining", totalPaid: "Total Paid", monthlyDue: "Monthly Due", activeLoans: "Active Loans", noLoans: "No loans yet",
    refreshing: "Refreshing...", releaseRefresh: "Release to refresh", pullRefresh: "Pull to refresh",
    
    // Original Keys
    goodMorning: "Good morning", goodAfternoon: "Good afternoon", goodEvening: "Good evening", netWorth: "Net Worth", totalDebt: "Total Debt", monthlyPayments: "Monthly Payments", upcomingBills: "Upcoming Bills",
    addLoan: "Add Loan", loanName: "Loan Name", balance: "Balance", interestRate: "Interest Rate", monthlyPayment: "Monthly Payment", paidOff: "Paid Off", active: "Active",
    addBill: "Add Bill", billName: "Bill Name", amount: "Amount", dueDate: "Due Date", frequency: "Frequency", monthly: "Monthly", weekly: "Weekly", biweekly: "Bi-weekly",
    profile: "Profile", identity: "Identity", preferences: "Preferences", personalization: "Personalization", paySchedule: "Pay Schedule", privacyLegal: "Privacy & Legal",
    displayName: "Display Name", customGreeting: "Custom Greeting", avatar: "Avatar", preferredCurrency: "Preferred Currency", preferredLanguage: "Preferred Language", appTheme: "App Theme",
    light: "Light", dark: "Dark", system: "System", compactMode: "Compact Mode", saveChanges: "Save Changes", saving: "Saving...", saved: "Saved!",
    yourName: "Your name", greetingPlaceholder: "e.g. Let's crush that debt!", greetingDesc: "Shown on your dashboard every time you log in.",
    uploading: "Uploading...", uploadPhoto: "Upload Photo", removePhoto: "Remove photo", langUpdateDesc: "App language updates after saving.",
    adminRole: "Admin", memberRole: "Member", compactModeDesc: "Reduce spacing for a denser layout",
    dashboardAccent: "Dashboard Accent", colorDefault: "Default", colorViolet: "Violet", colorRose: "Rose", colorAmber: "Amber", colorSky: "Sky", colorEmerald: "Emerald",
    accentDesc: "Accent color preference is saved to your profile.",
    payScheduleDesc: "Used for income reminders and cash flow accuracy", payFrequency: "Pay Frequency", paydayWeek: "Payday (day of week)", paydayMonth: "Payday (day of month)",
    selectFrequency: "Select frequency…", freqWeekly: "Weekly", freqBiweekly: "Bi-weekly", freqMonthly: "Monthly", selectDay: "Select day…",
    dayMonday: "Monday", dayTuesday: "Tuesday", dayWednesday: "Wednesday", dayThursday: "Thursday", dayFriday: "Friday", daySaturday: "Saturday", daySunday: "Sunday",
    financialDisclaimer: "Financial Disclaimer", disclaimerText1: "RAYMA is not a financial advisor. All information is for educational purposes. Consult qualified professionals before making financial decisions. See", disclaimerText2: "for full details.", termsLink: "Terms of Service",
    privacyLegalDesc: "Your data rights and policies", privacyPolicy: "Privacy Policy", termsOfService: "Terms of Service", exportData: "Export My Data", deleteAccount: "Delete My Account",
    deleteWarning: "FINAL WARNING: This will permanently erase your profile and account. Proceed?", deletingAccount: "Deleting Account Requirements...",
    aiAdvisor: "RAYMA AI Advisor", tokensRemaining: "tokens remaining", getMoreTokens: "Get More Tokens", annualPassActive: "Annual Pass Active", freeMonthly: "5 free/month",
    support: "Support", starterPack: "Starter Pack", popularPack: "Popular Pack", bestValuePack: "Best Value Pack", annualPass: "Annual Pass", unlimited: "Unlimited AI for 1 year",
    heroTitle: "Take Control of Your", heroDebtBills: "Debt & Bills", heroDesc: "RAYMA tracks your loans, bills, budget, and net worth — all in one place. Your AI financial coach tells you exactly what to do next.",
    startTrackingFree: "Start Tracking Free", seeHowItWorks: "See How It Works", noCreditCard: "No credit card required", noBankLogin: "No bank login", worksAnyDevice: "Works on any device",
    freePlan: "Free Forever", freeDesc: "All core features, always", simplePricing: "Simple, honest pricing", pricingDesc: "No subscriptions. No hidden fees. Pay only for AI consultations you need.",
    createFreeAccount: "Create Free Account — No Card Needed", startJourney: "Start your debt-free journey today", journeyDesc: "Free to start. Takes 2 minutes. No bank login required."
  },
  // Note: For brevity in this message, add these same keys to the other languages (zh, hi, es, etc.) using the same structure. 
  // If you test the dashboard now, it will use these English keys, and you can fill in the translations later!
  zh: {}, hi: {}, es: {}, fr: {}, ar: {}, bn: {}, pt: {}, ru: {}, ja: {}
};

export function t(lang, key) {
  return translations[lang]?.[key] ?? translations["en"]?.[key] ?? key;
}

export function getDir(lang) {
  return LANGUAGES.find(l => l.code === lang)?.dir ?? "ltr";
}

export function detectBrowserLanguage() {
  const browserLang = navigator.language?.split("-")[0]?.toLowerCase();
  const supported = LANGUAGES.map(l => l.code);
  return supported.includes(browserLang) ? browserLang : "en";
}