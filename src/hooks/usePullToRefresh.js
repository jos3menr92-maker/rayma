import { useState, useRef, useCallback } from "react";

/**
 * usePullToRefresh — native-style pull-to-refresh for a scrollable page.
 *
 * Spread the returned `handlers` onto the page's scroll-container element and
 * render <PullToRefreshIndicator> at the top of the content. The refresh fires
 * only when the user pulls down past `threshold` while the scroll position is
 * at the top — matching the original Dashboard behaviour.
 *
 * @param {Function} onRefresh async callback to run on release (e.g. reload)
 * @param {{ threshold?: number, maxPull?: number }} options
 */
export function usePullToRefresh(onRefresh, { threshold = 50, maxPull = 80 } = {}) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const pullStartY = useRef(null);

  const onTouchStart = useCallback((e) => {
    pullStartY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (pullStartY.current === null) return;
    const dist = e.touches[0].clientY - pullStartY.current;
    if (dist > 0 && window.scrollY === 0) setPullDistance(Math.min(dist, maxPull));
  }, [maxPull]);

  const onTouchEnd = useCallback(async () => {
    if (pullDistance > threshold) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPullDistance(0);
    pullStartY.current = null;
  }, [pullDistance, threshold, onRefresh]);

  return {
    pullDistance,
    refreshing,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}