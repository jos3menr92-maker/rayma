import { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { detectBrowserLanguage, getDir } from "@/lib/i18n";

const LanguageContext = createContext({ lang: "en", setLang: () => {} });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem("rayma_lang") || detectBrowserLanguage();
  });

  // Apply RTL direction when language changes
  useEffect(() => {
    const dir = getDir(lang);
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
    localStorage.setItem("rayma_lang", lang);
  }, [lang]);

  // Sync with user's saved preference on mount
  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        const me = await base44.auth.me();
        if (me?.preferred_language) {
          setLangState(me.preferred_language);
        }
      }
    });
  }, []);

  function setLang(newLang) {
    setLangState(newLang);
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}