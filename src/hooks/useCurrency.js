/**
 * useCurrency hook
 * Returns a formatCurrency function that respects the user's preferred_currency setting.
 * Reads from localStorage cache first to avoid redundant API calls.
 * Falls back to USD if not set.
 */
import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const CACHE_KEY = "rayma_preferred_currency";

export function useCurrency() {
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

  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  }, [currency]);

  return { formatCurrency, currency };
}