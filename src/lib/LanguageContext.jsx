import { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { detectBrowserLanguage, getDir } from "@/lib/i18n";

const LanguageContext = createContext({ lang: "en", setLang: () => {} });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    // 🌍 First, try localStorage (user's most recent choice)
    const stored = localStorage.getItem("rayma_lang");
    if (stored) return stored;
    // If nothing in storage, try browser language
    return detectBrowserLanguage();
  });

  // Apply RTL direction and persist to localStorage when language changes
  useEffect(() => {
    const dir = getDir(lang);
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.classList.toggle("rtl", dir === "rtl");
    // 🌍 Always persist to localStorage so it survives page reloads
    localStorage.setItem("rayma_lang", lang);
  }, [lang]);

  // 🌍 Only sync from base44 on FIRST visit (no localStorage value yet)
  // If localStorage has a value, that always wins — this prevents reload resets
  useEffect(() => {
    const storedLang = localStorage.getItem("rayma_lang");
    if (storedLang) return; // localStorage takes priority — never override it
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        try {
          const me = await base44.auth.me();
          if (me?.preferred_language && me.preferred_language !== lang) {
            // Only update if different from current
            setLangState(me.preferred_language);
          }
        } catch (err) {
          console.debug("Language sync skipped", err?.message);
        }
      }
    });
  }, []); // Empty dependency - only run once on mount

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