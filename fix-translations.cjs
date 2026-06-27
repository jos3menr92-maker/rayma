const fs = require('fs');

const filePath = 'src/lib/i18n.js';
let content = fs.readFileSync(filePath, 'utf-8');

const translations = {
  hi: { localizationSubtitle: "अपनी प्राथमिक भाषा और मुद्रा सेट करें", selectLanguage: "भाषा चुनें", selectCurrency: "मुद्रा चुनें", payScheduleDesc: "आय अनुस्मारक और नकदी प्रवाह सटीकता के लिए उपयोग किया जाता है", privacyPolicy: "गोपनीयता नीति", termsOfService: "सेवा की शर्तें और EULA", deleteAccountData: "खाता और डेटा हटाएं" },
  fr: { localizationSubtitle: "Définissez votre langue et devise principales", selectLanguage: "Sélectionner la langue", selectCurrency: "Sélectionner la devise", payScheduleDesc: "Utilisé pour les rappels de revenu et l'exactitude du flux de trésorerie", privacyPolicy: "Politique de confidentialité", termsOfService: "Conditions de service et EULA", deleteAccountData: "Supprimer le compte et les données" },
  ar: { localizationSubtitle: "قم بتعيين اللغة والعملة الأساسية", selectLanguage: "اختر اللغة", selectCurrency: "اختر العملة", payScheduleDesc: "يستخدم لتذكيرات الدخل ودقة التدفق النقدي", privacyPolicy: "سياسة الخصوصية", termsOfService: "شروط الخدمة واتفاقية المستخدم النهائية", deleteAccountData: "حذف الحساب والبيانات" },
  bn: { localizationSubtitle: "আপনার প্রাথমিক ভাষা এবং মুদ্রা সেট করুন", selectLanguage: "ভাষা নির্বাচন করুন", selectCurrency: "মুদ্রা নির্বাচন করুন", payScheduleDesc: "আয়ের অনুস্মারক এবং নগদ প্রবাহ নির্ভুলতার জন্য ব্যবহৃত", privacyPolicy: "গোপনীয়তা নীতি", termsOfService: "সেবার শর্তাবলী এবং ব্যবহারকারী চুক্তি", deleteAccountData: "অ্যাকাউন্ট এবং ডেটা মুছুন" },
  pt: { localizationSubtitle: "Defina sua idioma e moeda principais", selectLanguage: "Selecionar idioma", selectCurrency: "Selecionar moeda", payScheduleDesc: "Usado para lembretes de renda e precisão de fluxo de caixa", privacyPolicy: "Política de Privacidade", termsOfService: "Termos de Serviço e EULA", deleteAccountData: "Excluir conta e dados" },
  ru: { localizationSubtitle: "Установите основной язык и валюту", selectLanguage: "Выберите язык", selectCurrency: "Выберите валюту", payScheduleDesc: "Используется для напоминаний о доходах и точности денежных потоков", privacyPolicy: "Политика конфиденциальности", termsOfService: "Условия обслуживания и EULA", deleteAccountData: "Удалить учетную запись и данные" },
  ja: { localizationSubtitle: "プライマリ言語と通貨を設定します", selectLanguage: "言語を選択", selectCurrency: "通貨を選択", payScheduleDesc: "収入の思い出させることと現金フロー精度のために使用される", privacyPolicy: "プライバシーポリシー", termsOfService: "利用規約とEULA", deleteAccountData: "アカウントとデータを削除" }
};

let replaced = 0;
Object.keys(translations).forEach(lang => {
  // Create a mapping of old pattern to new pattern
  // Find: notifiedOnlyWhen: "value" followed by closing bracket
  // Replace: notifiedOnlyWhen: "value", <new keys> followed by closing bracket
  
  const keys = translations[lang];
  const keyString = Object.keys(keys)
    .map(k => `${k}: "${keys[k].replace(/"/g, '\\"')}"`)
    .join(', ');
  
  // More flexible pattern that handles any quote content
  const pattern = new RegExp(
    `(${lang}:[\\s\\S]*?notifiedOnlyWhen:\\s*"[^"]*")(\\s*\\n\\s*\\})`,
    'g'
  );
  
  const matches = content.match(pattern);
  if (matches && matches.length > 0) {
    console.log(`Found ${matches.length} match(es) for ${lang}`);
    content = content.replace(
      pattern,
      `$1, ${keyString}$2`
    );
    replaced++;
  } else {
    console.log(`No match found for ${lang}`);
  }
});

console.log(`Successfully replaced ${replaced} language sections`);
fs.writeFileSync(filePath, content, 'utf-8');
console.log('File written');
