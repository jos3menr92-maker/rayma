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
    appName: "Debt & Bills", dashboard: "Dashboard", loans: "Loans", bills: "Bills", finance: "Finance", more: "More", signIn: "Sign in", signOut: "Sign Out", getStartedFree: "Get Started Free",
    hello: "Hi", stayOnTop: "Stay on top of your finances", cashLeft: "Cash Left This Month", overspent: "overspent", income: "income", obligations: "obligations",
    monthlyRecap: "Monthly Recap", summary: "Income & spending summary", assets: "Assets", netWorthTracker: "Net worth tracker", expenseBreakdown: "Expense Breakdown",
    totalMonthly: "Total Monthly", loanBalances: "Loan Balances", remaining: "Remaining", totalPaid: "Total Paid", monthlyDue: "Monthly Due", activeLoans: "Active Loans", noLoans: "No loans yet",
    refreshing: "Refreshing...", releaseRefresh: "Release to refresh", pullRefresh: "Pull to refresh",
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
    createFreeAccount: "Create Free Account — No Card Needed", startJourney: "Start your debt-free journey today", journeyDesc: "Free to start. Takes 2 minutes. No bank login required.",
    accountSection: "Account", raymaAISection: "RAYMA AI", navigateSection: "Navigate", toolsSection: "Tools", aboutRAYMASection: "About RAYMA", privacyLegalSection: "Privacy & Legal",
    fullName: "Full Name", email: "Email", profileSettings: "Profile Settings", aiConsultations: "AI Consultations",
    incomeAndCashFlow: "Income & Cash Flow", savingsVault: "Savings Vault", assetsAndNetWorth: "Assets & Net Worth", documentVault: "Document Vault",
    taxSummary: "Tax Summary", annualReport: "Annual report", exportMyData: "Export My Data", goToSecurityVault: "Go to Security Vault",
    raymaVersion: "RAYMA", raymaVersionNumber: "v2.0.0", supportEmailLabel: "Support Email", raymaAppEmail: "rayma.app2026@gmail.com",
    securityLabel: "Security", allDataEncrypted: "All data encrypted", deleteAccountLabel: "Delete Account", signOutButton: "Sign Out"
  },
  zh: {
    appName: "债务与账单", dashboard: "仪表板", loans: "贷款", bills: "账单", finance: "财务", more: "更多", signIn: "登录", signOut: "退出登录", getStartedFree: "免费开始",
    hello: "你好", stayOnTop: "掌控您的财务", cashLeft: "本月剩余现金", overspent: "超支", income: "收入", obligations: "负债",
    monthlyRecap: "月度总结", summary: "收支汇总", assets: "资产", netWorthTracker: "净资产追踪", expenseBreakdown: "支出明细",
    totalMonthly: "每月总计", loanBalances: "贷款余额", remaining: "剩余", totalPaid: "已还款", monthlyDue: "每月到期", activeLoans: "活跃贷款", noLoans: "暂无贷款",
    refreshing: "刷新中...", releaseRefresh: "松开以刷新", pullRefresh: "下拉以刷新",
    goodMorning: "早上好", goodAfternoon: "下午好", goodEvening: "晚上好", netWorth: "净资产", totalDebt: "总债务", monthlyPayments: "每月还款", upcomingBills: "即将到期账单",
    addLoan: "添加贷款", loanName: "贷款名称", balance: "余额", interestRate: "利率", monthlyPayment: "每月还款额", paidOff: "已还清", active: "进行中",
    addBill: "添加账单", billName: "账单名称", amount: "金额", dueDate: "到期日", frequency: "频率", monthly: "每月", weekly: "每周", biweekly: "每两周",
    profile: "个人资料", identity: "身份", preferences: "偏好设置", personalization: "个性化", paySchedule: "工资日程", privacyLegal: "隐私与法律",
    displayName: "显示名称", customGreeting: "自定义问候语", avatar: "头像", preferredCurrency: "首选货币", preferredLanguage: "首选语言", appTheme: "应用主题",
    light: "浅色", dark: "深色", system: "跟随系统", compactMode: "紧凑模式", saveChanges: "保存更改", saving: "保存中...", saved: "已保存！",
    payFrequency: "工资频率", paydayWeek: "发薪日（星期几）", paydayMonth: "发薪日（几号）", privacyPolicy: "隐私政策", termsOfService: "服务条款", deleteAccount: "删除我的账户",
    aiAdvisor: "RAYMA AI顾问", tokensRemaining: "剩余次数", getMoreTokens: "获取更多次数", annualPassActive: "年度通行证有效", freeMonthly: "每月5次免费",
    support: "支持", starterPack: "入门包", popularPack: "热门包", bestValuePack: "超值包", annualPass: "年度通行证", unlimited: "一年无限AI咨询",
    heroTitle: "掌控你的", heroDebtBills: "债务与账单", heroDesc: "RAYMA追踪您的贷款、账单、预算和净资产——一切尽在一处。您的AI财务顾问告诉您下一步该怎么做。",
    startTrackingFree: "免费开始追踪", seeHowItWorks: "了解工作原理", noCreditCard: "无需信用卡", noBankLogin: "无需银行登录", worksAnyDevice: "适用于任何设备",
    freePlan: "永久免费", freeDesc: "所有核心功能，永久免费", simplePricing: "简单透明的定价", pricingDesc: "无订阅，无隐藏费用。只需为您需要的AI咨询付费。",
    createFreeAccount: "免费创建账户 — 无需信用卡", startJourney: "今天开始您的无债之旅", journeyDesc: "免费开始，2分钟内完成，无需银行登录。",
    accountSection: "账户", raymaAISection: "RAYMA AI", navigateSection: "导航", toolsSection: "工具", aboutRAYMASection: "关于RAYMA", privacyLegalSection: "隐私与法律",
    fullName: "全名", email: "电子邮件", profileSettings: "个人资料设置", aiConsultations: "AI咨询",
    incomeAndCashFlow: "收入和现金流", savingsVault: "储蓄保险库", assetsAndNetWorth: "资产和净资产", documentVault: "文件保险库",
    taxSummary: "税务摘要", annualReport: "年度报告", exportMyData: "导出我的数据", goToSecurityVault: "前往安全保险库",
    raymaVersion: "RAYMA", raymaVersionNumber: "v2.0.0", supportEmailLabel: "支持电子邮件", raymaAppEmail: "rayma.app2026@gmail.com",
    securityLabel: "安全", allDataEncrypted: "所有数据已加密", deleteAccountLabel: "删除账户", signOutButton: "退出登录"
  },
  es: {
    appName: "Deudas y Facturas", dashboard: "Panel", loans: "Préstamos", bills: "Facturas", finance: "Finanzas", more: "Más", signIn: "Iniciar sesión", signOut: "Cerrar sesión", getStartedFree: "Empezar gratis",
    hello: "Hola", stayOnTop: "Mantén el control de tus finanzas", cashLeft: "Efectivo restante este mes", overspent: "gastado de más", income: "ingresos", obligations: "obligaciones",
    monthlyRecap: "Resumen mensual", summary: "Resumen de ingresos y gastos", assets: "Activos", netWorthTracker: "Rastreador de patrimonio", expenseBreakdown: "Desglose de gastos",
    totalMonthly: "Total mensual", loanBalances: "Saldos de préstamos", remaining: "Restante", totalPaid: "Total pagado", monthlyDue: "Pago mensual", activeLoans: "Préstamos activos", noLoans: "Aún no hay préstamos",
    refreshing: "Actualizando...", releaseRefresh: "Suelta para actualizar", pullRefresh: "Desliza para actualizar",
    goodMorning: "Buenos días", goodAfternoon: "Buenas tardes", goodEvening: "Buenas noches", netWorth: "Patrimonio neto", totalDebt: "Deuda total", monthlyPayments: "Pagos mensuales", upcomingBills: "Próximas facturas",
    addLoan: "Añadir préstamo", loanName: "Nombre del préstamo", balance: "Saldo", interestRate: "Tasa de interés", monthlyPayment: "Pago mensual", paidOff: "Pagado", active: "Activo",
    addBill: "Añadir factura", billName: "Nombre de la factura", amount: "Cantidad", dueDate: "Fecha de vencimiento", frequency: "Frecuencia", monthly: "Mensual", weekly: "Semanal", biweekly: "Quincenal",
    profile: "Perfil", identity: "Identidad", preferences: "Preferencias", personalization: "Personalización", paySchedule: "Horario de pago", privacyLegal: "Privacidad y Legal",
    displayName: "Nombre de visualización", customGreeting: "Saludo personalizado", avatar: "Avatar", preferredCurrency: "Moneda preferida", preferredLanguage: "Idioma preferido", appTheme: "Tema de la app",
    light: "Claro", dark: "Oscuro", system: "Sistema", compactMode: "Modo compacto", saveChanges: "Guardar cambios", saving: "Guardando...", saved: "¡Guardado!",
    payFrequency: "Frecuencia de pago", paydayWeek: "Día de pago (día de la semana)", paydayMonth: "Día de pago (día del mes)", privacyPolicy: "Política de privacidad", termsOfService: "Términos de servicio", deleteAccount: "Eliminar mi cuenta",
    aiAdvisor: "Asesor AI RAYMA", tokensRemaining: "tokens restantes", getMoreTokens: "Obtener más tokens", annualPassActive: "Pase anual activo", freeMonthly: "5 gratis/mes",
    support: "Soporte", starterPack: "Pack Inicial", popularPack: "Pack Popular", bestValuePack: "Mejor Valor", annualPass: "Pase Anual", unlimited: "AI ilimitado por 1 año",
    heroTitle: "Toma el control de tus", heroDebtBills: "Deudas y Facturas", heroDesc: "RAYMA rastrea tus préstamos, facturas, presupuesto y patrimonio neto — todo en un lugar. Tu coach financiero AI te dice exactamente qué hacer.",
    startTrackingFree: "Empezar a rastrear gratis", seeHowItWorks: "Ver cómo funciona", noCreditCard: "Sin tarjeta de crédito", noBankLogin: "Sin acceso al banco", worksAnyDevice: "Funciona en cualquier dispositivo",
    freePlan: "Gratis para siempre", freeDesc: "Todas las funciones principales, siempre", simplePricing: "Precios simples y honestos", pricingDesc: "Sin suscripciones. Sin cargos ocultos. Paga solo por las consultas AI que necesitas.",
    createFreeAccount: "Crear cuenta gratis — Sin tarjeta", startJourney: "Comienza tu viaje libre de deudas hoy", journeyDesc: "Gratis para empezar. Toma 2 minutos. Sin acceso bancario requerido.",
    accountSection: "Cuenta", raymaAISection: "RAYMA AI", navigateSection: "Navegar", toolsSection: "Herramientas", aboutRAYMASection: "Acerca de RAYMA", privacyLegalSection: "Privacidad y Legal",
    fullName: "Nombre completo", email: "Correo electrónico", profileSettings: "Configuración de perfil", aiConsultations: "Consultas de IA",
    incomeAndCashFlow: "Ingresos y flujo de caja", savingsVault: "Bóveda de ahorros", assetsAndNetWorth: "Activos y patrimonio neto", documentVault: "Bóveda de documentos",
    taxSummary: "Resumen fiscal", annualReport: "Informe anual", exportMyData: "Exportar mis datos", goToSecurityVault: "Ir a la Bóveda de seguridad",
    raymaVersion: "RAYMA", raymaVersionNumber: "v2.0.0", supportEmailLabel: "Correo de soporte", raymaAppEmail: "rayma.app2026@gmail.com",
    securityLabel: "Seguridad", allDataEncrypted: "Todos los datos encriptados", deleteAccountLabel: "Eliminar cuenta", signOutButton: "Cerrar sesión"
  },
  hi: {
    appName: "कर्ज और बिल", dashboard: "डैशबोर्ड", loans: "ऋण", bills: "बिल", finance: "वित्त", more: "अधिक", signIn: "साइन इन करें", signOut: "साइन आउट करें", getStartedFree: "निःशुल्क प्रारंभ करें",
    hello: "नमस्ते", stayOnTop: "अपने वित्त पर नियंत्रण रखें", cashLeft: "इस महीने नकद बचा", overspent: "ज्यादा खर्च", income: "आय", obligations: "बाध्यताएं",
    accountSection: "खाता", raymaAISection: "RAYMA AI", navigateSection: "नेविगेट करें", toolsSection: "उपकरण", aboutRAYMASection: "RAYMA के बारे में", privacyLegalSection: "गोपनीयता और कानूनी",
    fullName: "पूरा नाम", email: "ईमेल", profileSettings: "प्रोफ़ाइल सेटिंग्स", aiConsultations: "AI परामर्श",
    incomeAndCashFlow: "आय और नकद प्रवाह", savingsVault: "बचत तिजोरी", assetsAndNetWorth: "संपत्ति और शुद्ध मूल्य", documentVault: "दस्तावेज़ तिजोरी",
    taxSummary: "कर सारांश", annualReport: "वार्षिक रिपोर्ट", exportMyData: "मेरा डेटा निर्यात करें", goToSecurityVault: "सुरक्षा तिजोरी पर जाएं",
    raymaVersion: "RAYMA", raymaVersionNumber: "v2.0.0", supportEmailLabel: "समर्थन ईमेल", raymaAppEmail: "rayma.app2026@gmail.com",
    securityLabel: "सुरक्षा", allDataEncrypted: "सभी डेटा एन्क्रिप्ट किए गए", deleteAccountLabel: "खाता हटाएं", signOutButton: "साइन आउट करें"
  },
  fr: {
    appName: "Dettes et Factures", dashboard: "Tableau de bord", loans: "Prêts", bills: "Factures", finance: "Finance", more: "Plus", signIn: "Se connecter", signOut: "Déconnexion", getStartedFree: "Commencer gratuitement",
    hello: "Bonjour", stayOnTop: "Maîtrisez vos finances", cashLeft: "Argent restant ce mois", overspent: "dépensé en excès", income: "revenu", obligations: "obligations",
    accountSection: "Compte", raymaAISection: "RAYMA AI", navigateSection: "Naviguer", toolsSection: "Outils", aboutRAYMASection: "À propos de RAYMA", privacyLegalSection: "Confidentialité et légal",
    fullName: "Nom complet", email: "Email", profileSettings: "Paramètres du profil", aiConsultations: "Consultations AI",
    incomeAndCashFlow: "Revenus et trésorerie", savingsVault: "Coffre d'épargne", assetsAndNetWorth: "Actifs et patrimoine", documentVault: "Coffre-fort de documents",
    taxSummary: "Résumé fiscal", annualReport: "Rapport annuel", exportMyData: "Exporter mes données", goToSecurityVault: "Aller au coffre-fort de sécurité",
    raymaVersion: "RAYMA", raymaVersionNumber: "v2.0.0", supportEmailLabel: "Email support", raymaAppEmail: "rayma.app2026@gmail.com",
    securityLabel: "Sécurité", allDataEncrypted: "Toutes les données chiffrées", deleteAccountLabel: "Supprimer le compte", signOutButton: "Déconnexion"
  },
  ar: {
    appName: "الديون والفواتير", dashboard: "لوحة التحكم", loans: "القروض", bills: "الفواتير", finance: "التمويل", more: "المزيد", signIn: "دخول", signOut: "تسجيل الخروج", getStartedFree: "ابدأ مجاناً",
    hello: "مرحبا", stayOnTop: "تحكم في أموالك", cashLeft: "النقد المتبقي هذا الشهر", overspent: "إنفاق زائد", income: "دخل", obligations: "الالتزامات",
    accountSection: "الحساب", raymaAISection: "RAYMA AI", navigateSection: "التنقل", toolsSection: "الأدوات", aboutRAYMASection: "حول RAYMA", privacyLegalSection: "الخصوصية والشؤون القانونية",
    fullName: "الاسم الكامل", email: "البريد الإلكتروني", profileSettings: "إعدادات الملف الشخصي", aiConsultations: "استشارات الذكاء الاصطناعي",
    incomeAndCashFlow: "الدخل والتدفق النقدي", savingsVault: "خزينة المدخرات", assetsAndNetWorth: "الأصول والصافي", documentVault: "خزينة المستندات",
    taxSummary: "ملخص الضرائب", annualReport: "التقرير السنوي", exportMyData: "تصدير بياناتي", goToSecurityVault: "الذهاب إلى خزينة الأمان",
    raymaVersion: "RAYMA", raymaVersionNumber: "v2.0.0", supportEmailLabel: "بريد الدعم", raymaAppEmail: "rayma.app2026@gmail.com",
    securityLabel: "الأمان", allDataEncrypted: "جميع البيانات مشفرة", deleteAccountLabel: "حذف الحساب", signOutButton: "تسجيل الخروج"
  },
  bn: {
    appName: "ঋণ এবং বিল", dashboard: "ড্যাশবোর্ড", loans: "ঋণ", bills: "বিল", finance: "অর্থ", more: "আরও", signIn: "প্রবেश করুন", signOut: "প্রস্থান করুন", getStartedFree: "বিনামূল্যে শুরু করুন",
    hello: "নমস্কার", stayOnTop: "আপনার অর্থ নিয়ন্ত্রণ করুন", cashLeft: "এই মাসে অবশিষ্ট নগদ", overspent: "অতিরিক্ত খরচ", income: "আয়", obligations: "দায়বদ্ধতা",
    accountSection: "অ্যাকাউন্ট", raymaAISection: "RAYMA AI", navigateSection: "নেভিগেট করুন", toolsSection: "সরঞ্জাম", aboutRAYMASection: "RAYMA সম্পর্কে", privacyLegalSection: "গোপনীয়তা এবং আইনি",
    fullName: "সম্পূর্ণ নাম", email: "ইমেল", profileSettings: "প্রোফাইল সেটিংস", aiConsultations: "AI পরামর্শ",
    incomeAndCashFlow: "আয় এবং নগদ প্রবাহ", savingsVault: "সঞ্চয় ভল্ট", assetsAndNetWorth: "সম্পদ এবং নেট মূল্য", documentVault: "নথি ভল্ট",
    taxSummary: "ট্যাক্স সারাংশ", annualReport: "বার্ষিক প্রতিবেদন", exportMyData: "আমার ডেটা রপ্তানি করুন", goToSecurityVault: "নিরাপত্তা ভল্টে যান",
    raymaVersion: "RAYMA", raymaVersionNumber: "v2.0.0", supportEmailLabel: "সহায়তা ইমেল", raymaAppEmail: "rayma.app2026@gmail.com",
    securityLabel: "নিরাপত্তা", allDataEncrypted: "সমস্ত ডেটা এনক্রিপ্ট করা", deleteAccountLabel: "অ্যাকাউন্ট মুছুন", signOutButton: "প্রস্থান করুন"
  },
  pt: {
    appName: "Dívidas e Contas", dashboard: "Painel", loans: "Empréstimos", bills: "Contas", finance: "Finanças", more: "Mais", signIn: "Conectar", signOut: "Sair", getStartedFree: "Começar gratuitamente",
    hello: "Olá", stayOnTop: "Controle suas finanças", cashLeft: "Dinheiro restante este mês", overspent: "gasto em excesso", income: "renda", obligations: "obrigações",
    accountSection: "Conta", raymaAISection: "RAYMA AI", navigateSection: "Navegar", toolsSection: "Ferramentas", aboutRAYMASection: "Sobre RAYMA", privacyLegalSection: "Privacidade e Legal",
    fullName: "Nome completo", email: "Email", profileSettings: "Configurações de perfil", aiConsultations: "Consultas de IA",
    incomeAndCashFlow: "Renda e fluxo de caixa", savingsVault: "Cofre de poupança", assetsAndNetWorth: "Ativos e patrimônio líquido", documentVault: "Cofre de documentos",
    taxSummary: "Resumo fiscal", annualReport: "Relatório anual", exportMyData: "Exportar meus dados", goToSecurityVault: "Ir para o Cofre de segurança",
    raymaVersion: "RAYMA", raymaVersionNumber: "v2.0.0", supportEmailLabel: "Email de suporte", raymaAppEmail: "rayma.app2026@gmail.com",
    securityLabel: "Segurança", allDataEncrypted: "Todos os dados criptografados", deleteAccountLabel: "Deletar conta", signOutButton: "Sair"
  },
  ru: {
    appName: "Долги и счета", dashboard: "Панель управления", loans: "Кредиты", bills: "Счета", finance: "Финансы", more: "Ещё", signIn: "Войти", signOut: "Выйти", getStartedFree: "Начать бесплатно",
    hello: "Привет", stayOnTop: "Контролируйте свои финансы", cashLeft: "Денег осталось на этот месяц", overspent: "перерасходованно", income: "доход", obligations: "обязательства",
    accountSection: "Аккаунт", raymaAISection: "RAYMA AI", navigateSection: "Навигация", toolsSection: "Инструменты", aboutRAYMASection: "О RAYMA", privacyLegalSection: "Конфиденциальность и право",
    fullName: "Полное имя", email: "Электронная почта", profileSettings: "Параметры профиля", aiConsultations: "Консультации ИИ",
    incomeAndCashFlow: "Доход и денежный поток", savingsVault: "Хранилище сбережений", assetsAndNetWorth: "Активы и чистая стоимость", documentVault: "Хранилище документов",
    taxSummary: "Краткий обзор налогов", annualReport: "Годовой отчет", exportMyData: "Экспортировать мои данные", goToSecurityVault: "Перейти в хранилище безопасности",
    raymaVersion: "RAYMA", raymaVersionNumber: "v2.0.0", supportEmailLabel: "Поддержка email", raymaAppEmail: "rayma.app2026@gmail.com",
    securityLabel: "Безопасность", allDataEncrypted: "Все данные зашифрованы", deleteAccountLabel: "Удалить аккаунт", signOutButton: "Выйти"
  },
  ja: {
    appName: "債務と請求書", dashboard: "ダッシュボード", loans: "ローン", bills: "請求書", finance: "ファイナンス", more: "その他", signIn: "ログイン", signOut: "ログアウト", getStartedFree: "無料で始める",
    hello: "こんにちは", stayOnTop: "財務を管理する", cashLeft: "今月残っている現金", overspent: "使いすぎ", income: "収入", obligations: "義務",
    accountSection: "アカウント", raymaAISection: "RAYMA AI", navigateSection: "ナビゲート", toolsSection: "ツール", aboutRAYMASection: "RAYMAについて", privacyLegalSection: "プライバシーと法務",
    fullName: "フルネーム", email: "メール", profileSettings: "プロフィール設定", aiConsultations: "AI相談",
    incomeAndCashFlow: "収入とキャッシュフロー", savingsVault: "貯蓄保管庫", assetsAndNetWorth: "資産と純資産", documentVault: "ドキュメント保管庫",
    taxSummary: "税務サマリー", annualReport: "年間報告書", exportMyData: "データをエクスポート", goToSecurityVault: "セキュリティ保管庫に移動",
    raymaVersion: "RAYMA", raymaVersionNumber: "v2.0.0", supportEmailLabel: "サポートメール", raymaAppEmail: "rayma.app2026@gmail.com",
    securityLabel: "セキュリティ", allDataEncrypted: "すべてのデータが暗号化されています", deleteAccountLabel: "アカウント削除", signOutButton: "ログアウト"
  }
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