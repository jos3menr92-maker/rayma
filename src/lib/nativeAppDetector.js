/**
 * Native App Detection Utility
 * Determines if the current code is running inside a native iOS/Android wrapper
 * This is critical for Apple App Store Directive 3.1.1 compliance:
 * https://developer.apple.com/app-store/review/guidelines/
 */

/**
 * Checks if the code is running inside a native mobile app (iOS/Android wrapper)
 * Uses multiple detection methods for reliability:
 * 1. User Agent parsing for iOS/Android webviews
 * 2. Capacitor API detection (common cross-platform framework)
 * 3. React Native WebView detection
 * 
 * @returns {boolean} True if running in native app, false if running in browser
 */
export const isNativeApp = () => {
  // Check for React Native WebView
  if (typeof window !== 'undefined' && window.ReactNativeWebView) {
    return true;
  }

  // Check for Capacitor plugin
  if (typeof window !== 'undefined' && window.Capacitor) {
    return true;
  }

  // Check User Agent for native indicators
  if (typeof navigator !== 'undefined') {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    // Detect iOS WebView (no Safari or Chrome indicators)
    const isIOSWebView = /iPhone|iPad|iPod/.test(userAgent) && !/Safari|Chrome/.test(userAgent);
    
    // Detect Android WebView (has Android and WebView indicator)
    const isAndroidWebView = /Android/.test(userAgent) && /wv/.test(userAgent);

    if (isIOSWebView || isAndroidWebView) {
      return true;
    }
  }

  // Not running in a native app
  return false;
};

/**
 * Gets a safe fallback message for native apps when payment options aren't available
 * This message complies with App Store guidelines by not directing users to external payment methods
 * 
 * @returns {string} Compliant fallback message
 */
export const getNativeAppFallbackMessage = () => {
  return "To manage your subscription or upgrade your plan, please sign in to your account from your mobile browser or desktop computer.";
};
