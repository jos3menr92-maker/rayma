/**
 * useCurrency hook
 * Returns a formatCurrency function that respects the user's locale and preferred_currency
 * Uses Intl API for proper regional formatting (separators, symbols, etc.)
 *
 * Pulls preferred_currency from FinancialDataContext.userProfile — no redundant base44.auth.me() calls.
 */
import { useCallback } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { formatCurrency, formatCurrencyNoDecimals } from "@/utils/formatLocalized";

const CACHE_KEY = "rayma_preferred_currency";

export function useCurrency() {
  const { locale } = useLanguage();
  const { userProfile } = useFinancialData();
  const currency = userProfile?.preferred_currency || localStorage.getItem(CACHE_KEY) || "USD";

  // Keep localStorage in sync so pages without FinancialDataContext still have a fallback
  if (typeof window !== "undefined" && userProfile?.preferred_currency) {
    localStorage.setItem(CACHE_KEY, userProfile.preferred_currency);
  }

  const fmt = useCallback((amount) => {
    return formatCurrency(amount, locale, currency);
  }, [locale, currency]);

  const formatCurrencyValue = useCallback((amount) => {
    return formatCurrency(amount, locale, currency);
  }, [locale, currency]);

  const formatCurrencyNoDecimal = useCallback((amount) => {
    return formatCurrencyNoDecimals(amount, locale, currency);
  }, [locale, currency]);

  return { formatCurrency: fmt, currency, formatCurrencyValue, formatCurrencyNoDecimal };
}