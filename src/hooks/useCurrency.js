/**
 * useCurrency hook
 * Returns a formatCurrency function that respects the user's locale and preferred_currency
 * Uses Intl API for proper regional formatting (separators, symbols, etc.)
 */
import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { formatCurrency, formatCurrencyNoDecimals } from "@/utils/formatLocalized";

const CACHE_KEY = "rayma_preferred_currency";

export function useCurrency() {
  const { locale } = useLanguage();
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem(CACHE_KEY) || "USD";
  });

  useEffect(() => {
    base44.auth.me().then(u => {
      const c = u?.preferred_currency || "USD";
      setCurrency(c);
      localStorage.setItem(CACHE_KEY, c);
    }).catch(() => {});
  }, []);

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