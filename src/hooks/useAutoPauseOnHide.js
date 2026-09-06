import { useEffect } from 'react';

/**
 * useAutoPauseOnHide — auto-pauses an arcade game when the app goes to the
 * background (phone call, app switch, screen lock). Prevents unfair deaths
 * on phones: the player comes back to a paused game, not a game-over screen.
 *
 * @param {boolean} isActive - whether a run is currently in progress
 * @param {() => void} pause - callback that pauses the game
 */
export default function useAutoPauseOnHide(isActive, pause) {
  useEffect(() => {
    if (!isActive) return undefined;
    const onVisibility = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [isActive, pause]);
}