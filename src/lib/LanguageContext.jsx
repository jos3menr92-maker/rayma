import { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { detectBrowserLanguage, getDir } from "@/lib/i18n";

const LOCALE_REGION_MAP = {
  "es-CO": { lang: "es", currency: "COP", country: "Colombia", tz: "America/Bogota" },
  "es-AR": { lang: "es", currency: "ARS", country: "Argentina", tz: "America/Argentina/Buenos_Aires" },
  "pt-BR": { lang: "pt", currency: "BRL", country: "Brazil", tz: "America/Sao_Paulo" },
  "es-PE": { lang: "es", currency: "PEN", country: "Peru", tz: "America/Lima" },
  "en-US": { lang: "en", currency: "USD", country: "United States", tz: "America/New_York" },
  "en-GB": { lang: "en", currency: "GBP", country: "United Kingdom", tz: "Europe/London" },
  "fr-FR": { lang: "fr", currency: "EUR", country: "France", tz: "Europe/Paris" },
  "de-DE": { lang: "de", currency: "EUR", country: "Germany", tz: "Europe/Berlin" },
  "it-IT": { lang: "it", currency: "EUR", country: "Italy", tz: "Europe/Rome" },
  "ja-JP": { lang: "ja", currency: "JPY", country: "Japan", tz: "Asia/Tokyo" },
  "zh-CN": { lang: "zh", currency: "CNY", country: "China", tz: "Asia/Shanghai" },
  "hi-IN": { lang: "hi", currency: "INR", country: "India", tz: "Asia/Kolkata" },
  "ar-AE": { lang: "ar", currency: "AED", country: "United Arab Emirates", tz: "Asia/Dubai" },
  "bn-BD": { lang: "bn", currency: "BDT", country: "Bangladesh", tz: "Asia/Dhaka" },
  "pt-PT": { lang: "pt", currency: "EUR", country: "Portugal", tz: "Europe/Lisbon" },
  "ru-RU": { lang: "ru", currency: "RUB", country: "Russia", tz: "Europe/Moscow" },
};

const LanguageContext = createContext({
  lang: "en",
  setLang: () => {},
  locale: "en-US",
  setLocale: () => {}
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const stored = localStorage.getItem("rayma_lang");
    if (stored) return stored;
    return detectBrowserLanguage();
  });

  const [locale, setLocaleState] = useState(() => {
    // 🌍 First, try localStorage (user's most recent choice)
    const stored = localStorage.getItem("rayma_locale");
    if (stored) return stored;
    // Default based on language
    if (lang === "es") return "es-CO"; // Default Latin American Spanish to Colombia
    if (lang === "pt") return "pt-BR"; // Default Portuguese to Brazil
    return "en-US";
  });

  // Apply RTL direction and persist to localStorage when language changes
  useEffect(() => {
    const dir = getDir(lang);
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.classList.toggle("rtl", dir === "rtl");
    localStorage.setItem("rayma_lang", lang);
  }, [lang]);

  // Persist locale to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("rayma_locale", locale);
  }, [locale]);

  // 🌍 Only sync from base44 on FIRST visit (no localStorage value yet)
  useEffect(() => {
    const storedLang = localStorage.getItem("rayma_lang");
    const storedLocale = localStorage.getItem("rayma_locale");
    if (storedLang && storedLocale) return;

    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        try {
          const me = await base44.auth.me();
          if (me?.preferred_language && me.preferred_language !== lang && !storedLang) {
            setLangState(me.preferred_language);
          }
          if (me?.preferred_locale && me.preferred_locale !== locale && !storedLocale) {
            setLocaleState(me.preferred_locale);
          }
        } catch (err) {
          console.debug("Language/Locale sync skipped", err?.message);
        }
      }
    });
  }, []);

  function setLang(newLang) {
    setLangState(newLang);
  }

  function setLocale(newLocale) {
    setLocaleState(newLocale);
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}