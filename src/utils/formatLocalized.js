/**
 * Centralized localization formatting utilities
 * Uses Intl API to format dates, currency, and numbers per locale
 * Respects regional preferences (date format, currency symbol, separators)
 */

export function formatDate(date, locale = "en-US", options = {}) {
  if (!date) return "";
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      ...options
    }).format(date);
  } catch (err) {
    console.warn("Date formatting error:", err);
    return date.toString();
  }
}

export function formatCurrency(amount, locale = "en-US", currency = "USD") {
  if (amount === undefined || amount === null) return "";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (err) {
    console.warn("Currency formatting error:", err);
    return `${currency} ${amount}`;
  }
}

export function formatCurrencyNoDecimals(amount, locale = "en-US", currency = "USD") {
  if (amount === undefined || amount === null) return "";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  } catch (err) {
    console.warn("Currency formatting error:", err);
    return `${currency} ${Math.round(amount)}`;
  }
}

export function formatNumber(num, locale = "en-US", decimals = 2) {
  if (num === undefined || num === null) return "";
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  } catch (err) {
    console.warn("Number formatting error:", err);
    return num.toString();
  }
}

export function getMonthName(monthIndex, locale = "en-US", length = "long") {
  try {
    const date = new Date(2000, monthIndex, 1);
    return new Intl.DateTimeFormat(locale, { month: length }).format(date);
  } catch (err) {
    console.warn("Month name formatting error:", err);
    return "";
  }
}

export function getWeekdayNames(locale = "en-US", length = "short") {
  try {
    const names = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(2000, 0, 2 + i);
      names.push(new Intl.DateTimeFormat(locale, { weekday: length }).format(date));
    }
    return names;
  } catch (err) {
    console.warn("Weekday names formatting error:", err);
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  }
}

export function formatDateLong(date, locale = "en-US") {
  if (!date) return "";
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(date);
  } catch (err) {
    console.warn("Long date formatting error:", err);
    return date.toString();
  }
}

export function formatDateShort(date, locale = "en-US") {
  if (!date) return "";
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric"
    }).format(date);
  } catch (err) {
    console.warn("Short date formatting error:", err);
    return date.toString();
  }
}
