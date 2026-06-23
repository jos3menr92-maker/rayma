/**
 * Triggers the correct checkout flow depending on the user's device.
 * @param {string} productId - The ID of the item being purchased (e.g., 'lithium_pack_1')
 */
export const triggerCheckout = (productId) => {
  // 1. Are we inside the React Native mobile app?
  if (window.ReactNativeWebView) {
    console.log("Mobile App Detected! Sending signal to React Native...");
    
    const message = {
      action: 'TRIGGER_NATIVE_PAYMENT',
      productId: productId
    };
    
    // Send the signal up to the index.tsx antenna!
    window.ReactNativeWebView.postMessage(JSON.stringify(message));
  } 
  // 2. We are on a normal web browser.
  else {
    console.log("Standard Web Browser Detected. Redirecting to Stripe...");
    // Add your normal Stripe checkout redirect logic here
    // window.location.href = `/checkout?product=${productId}`;
  }
};
