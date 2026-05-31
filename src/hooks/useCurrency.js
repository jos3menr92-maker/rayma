/**
 * useCurrency hook
 * Returns a formatCurrency function that respects the user's preferred_currency setting.
 * Falls back to USD if not set.
 */
import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

export function useCurrency() {
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u?.preferred_currency) setCurrency(u.preferred_currency);
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