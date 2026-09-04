import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * useTabNavigation — preserves an independent navigation stack per bottom tab.
 *
 * Each of the four primary tabs (Home / Finance / Loans / Bills) remembers the last
 * route the user visited while inside it. Switching to another tab and coming
 * back restores that remembered route instead of resetting to the tab root.
 * Tapping the already-active tab resets it to its root route.
 *
 * Pages are mapped to a tab via TAB_PATHS (prefix match). Anything not listed
 * (e.g. Profile, Reminders, Documents, Store, Arcade …) is "neutral" — it does
 * not change the active tab and never clobbers a tab's remembered path.
 */

export const TAB_ROOTS = {
  home: "/dashboard",
  finance: "/finance",
  loans: "/loans",
  bills: "/bills",
};

const TAB_PATHS = {
  home: ["/dashboard", "/trend", "/assets", "/monthly-recap", "/merchants"],
  finance: ["/finance", "/bank-accounts", "/budget-dashboard", "/budget", "/debt-simulator", "/simulator", "/calendar"],
  loans: ["/loans", "/add-loan", "/loan"],
  bills: ["/bills"],
};

function getTabForPath(path) {
  for (const [tab, prefixes] of Object.entries(TAB_PATHS)) {
    for (const p of prefixes) {
      if (path === p || path.startsWith(p + "/")) return tab;
    }
  }
  return null;
}

export function useTabNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => getTabForPath(location.pathname) || "home");
  const tabLastPath = useRef({
    home: TAB_ROOTS.home,
    finance: TAB_ROOTS.finance,
    loans: TAB_ROOTS.loans,
    bills: TAB_ROOTS.bills,
  });

  // As the user moves around, record the current route under its owning tab.
  useEffect(() => {
    const tab = getTabForPath(location.pathname);
    if (tab) {
      setActiveTab(tab);
      tabLastPath.current[tab] = location.pathname;
    }
    // Neutral pages: leave activeTab and all stacks untouched.
  }, [location.pathname]);

  function handleTabClick(tab) {
    if (tab === activeTab) {
      // Tapping the active tab resets it to its root.
      tabLastPath.current[tab] = TAB_ROOTS[tab];
      navigate(TAB_ROOTS[tab]);
    } else {
      // Switch to this tab's last remembered route (or its root if none).
      navigate(tabLastPath.current[tab] || TAB_ROOTS[tab]);
    }
  }

  return { activeTab, handleTabClick };
}