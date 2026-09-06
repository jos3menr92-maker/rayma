import { useEffect, useState } from 'react';

/**
 * useAutoRotate — spins an arcade game's fixed container (the .game-landscape
 * class) so a phone held in portrait still shows the game in landscape.
 * Turning the phone back upright returns to normal. The Rotate button in
 * GameTopBar can still override manually via the returned setter; the next
 * physical orientation change takes over again.
 *
 * @param {boolean} enabled — only watch orientation while a game is active
 * @returns {[boolean, Function]} [isRotated, setIsRotated]
 */
export default function useAutoRotate(enabled) {
  const [isRotated, setIsRotated] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const check = () => {
      const portrait = window.innerHeight > window.innerWidth;
      const isPhone = Math.min(window.innerWidth, window.innerHeight) < 927;
      setIsRotated(portrait && isPhone);
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, [enabled]);

  return [isRotated, setIsRotated];
}