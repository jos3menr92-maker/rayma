/**
 * IAP (In-App Purchase) Detection Utility
 *
 * Apple and Google require native billing APIs for digital goods sold inside mobile apps.
 * Stripe (web) cannot be used for in-app purchases on iOS or Android — doing so causes rejection.
 *
 * This utility detects the runtime environment so the app can:
 * - Show Stripe on web (allowed)
 * - Show native IAP prompt on iOS/Android (required by store policies)
 * - Block or warn inside WebViews
 */

/**
 * Detects if running inside a native iOS WebView (WKWebView)
 */
export function isIOSNativeApp() {
  const ua = navigator.userAgent || "";
  // React Native WebView injects a custom UA token
  return /ReactNativeWebView/.test(ua) || window.__RAYMA_PLATFORM === "ios";
}

/**
 * Detects if running inside a native Android WebView
 */
export function isAndroidNativeApp() {
  const ua = navigator.userAgent || "";
  return /ReactNativeWebView/.test(ua) || window.__RAYMA_PLATFORM === "android";
}

/**
 * Returns true if running inside any native mobile app wrapper
 */
export function isNativeMobileApp() {
  return isIOSNativeApp() || isAndroidNativeApp();
}

/**
 * Returns the current platform
 * @returns {"ios" | "android" | "web"}
 */
export function getPlatform() {
  if (isIOSNativeApp()) return "ios";
  if (isAndroidNativeApp()) return "android";
  return "web";
}

/**
 * Returns true if Stripe checkout is allowed in the current environment.
 * Stripe is only allowed on web. On iOS/Android, native IAP must be used.
 */
export function isStripeAllowed() {
  return getPlatform() === "web";
}

/**
 * Native IAP stub — call this to trigger native purchase on iOS/Android.
 * The native wrapper (React Native / Capacitor) must implement window.RAYMA_IAP.purchase().
 *
 * @param {string} productId - e.g. "com.rayma.token_pack_10"
 * @returns {Promise<{success: boolean, transactionId?: string, error?: string}>}
 */
export async function triggerNativeIAP(productId) {
  if (!isNativeMobileApp()) {
    console.warn("[IAP] triggerNativeIAP called on web — use Stripe instead.");
    return { success: false, error: "Not a native app" };
  }

  if (typeof window.RAYMA_IAP?.purchase === "function") {
    return await window.RAYMA_IAP.purchase(productId);
  }

  // Fallback: post message to React Native
  return new Promise((resolve) => {
    const handler = (event) => {
      if (event.data?.type === "IAP_RESULT" && event.data?.productId === productId) {
        window.removeEventListener("message", handler);
        resolve(event.data.result);
      }
    };
    window.addEventListener("message", handler);
    window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "IAP_PURCHASE", productId }));

    // Timeout after 60 seconds
    setTimeout(() => {
      window.removeEventListener("message", handler);
      resolve({ success: false, error: "Purchase timed out" });
    }, 60000);
  });
}

/**
 * Apple App Store product IDs
 * These must match exactly what's configured in App Store Connect
 */
export const APPLE_PRODUCT_IDS = {
  token_pack_10: "com.rayma.tokens.10",
  token_pack_50: "com.rayma.tokens.50",
  token_pack_100: "com.rayma.tokens.100",
  annual_pass: "com.rayma.annual_pass",
};

/**
 * Google Play product IDs
 * These must match exactly what's configured in Google Play Console
 */
export const GOOGLE_PRODUCT_IDS = {
  token_pack_10: "rayma_tokens_10",
  token_pack_50: "rayma_tokens_50",
  token_pack_100: "rayma_tokens_100",
  annual_pass: "rayma_annual_pass",
};