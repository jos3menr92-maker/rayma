import { useEffect, useRef } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const isDarkRef = useRef(false);
  const buttonRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    isDarkRef.current = dark;
    applyTheme(dark);
    updateIcon(dark);
  }, []);

  function applyTheme(dark) {
    const html = document.documentElement;
    if (dark) {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
    localStorage.setItem("theme", dark ? "dark" : "light");
  }

  function updateIcon(dark) {
    if (!buttonRef.current) return;
    const icon = buttonRef.current.querySelector("svg");
    if (!icon) return;
    if (dark) {
      icon.replaceWith(new DOMParser().parseFromString('<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v6m0 6v6M23 12h-6m-6 0H1M20.485 3.515l-4.243 4.243M7.758 17.485l-4.243 4.243M20.485 20.485l-4.243-4.243M7.758 6.757l-4.243-4.243"/></svg>', 'image/svg+xml').documentElement);
    } else {
      icon.replaceWith(new DOMParser().parseFromString('<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>', 'image/svg+xml').documentElement);
    }
  }

  function toggle() {
    const newDark = !isDarkRef.current;
    isDarkRef.current = newDark;
    applyTheme(newDark);
    updateIcon(newDark);
  }

  return (
    <button
      ref={buttonRef}
      onClick={toggle}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 transition-colors text-foreground text-xs font-medium"
      aria-label="Toggle theme"
    >
      <Moon className="w-4 h-4" />
      <span>Theme</span>
    </button>
  );
}