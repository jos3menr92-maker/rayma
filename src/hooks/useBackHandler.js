import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Intercepts the hardware back button / iOS swipe-from-left gesture
 * so that open overlays (chat, menus, drawers) close instead of
 * navigating away from the app — a requirement for App Store / Play
 * Store approval in a WebView bridge.
 *
 * @param {Array<{isOpen: boolean, onClose: Function}>} overlays
 */
export function useBackHandler(overlays) {
  const location = useLocation();
  const overlaysRef = useRef(overlays);
  overlaysRef.current = overlays;
  const locationRef = useRef("");
  locationRef.current = location.pathname + location.search;

  useEffect(() => {
    const handlePopState = () => {
      const openOverlays = overlaysRef.current.filter((o) => o.isOpen);
      if (openOverlays.length > 0) {
        // Close the most recently opened overlay
        openOverlays[openOverlays.length - 1].onClose();
        // Cancel the back navigation by re-pushing the current URL
        window.history.pushState(null, "", locationRef.current);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
}