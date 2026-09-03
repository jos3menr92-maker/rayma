import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage, useT } from '@/lib/LanguageContext';
import { isNativeMobileApp } from '@/lib/iap';

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const T = useT();

  useEffect(() => {
    // Native app store builds must never prompt to "install" the PWA (App Store guidelines)
    if (isNativeMobileApp()) return;

    // 1. Check if it's an iOS device (Safari doesn't support the auto-prompt)
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIosDevice);

    // 2. Catch the Android/Chrome install event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault(); // Stop the browser from showing the default mini-infobar
      setDeferredPrompt(e); // Save the event so we can trigger it later
      setShowBanner(true); // Show our custom banner
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 3. For iOS, we can show a manual instruction banner if they aren't in standalone mode yet
    if (isIosDevice && !window.navigator.standalone) {
        // We delay it slightly so it doesn't aggressively pop up the millisecond they load the page
        setTimeout(() => setShowBanner(true), 3000); 
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the native Android/Chrome install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 bg-primary text-primary-foreground p-4 rounded-2xl shadow-2xl flex justify-between items-center z-50 animate-in slide-in-from-bottom-5">
      <div className="flex-1 mr-4">
        <p className="font-bold text-sm">{T("installAppTitle", "Install Rayma AI")}</p>
        <p className="text-xs opacity-90">
          {isIOS 
            ? T("installAppIOS", "Tap 'Share' below, then 'Add to Home Screen'") 
            : T("installAppDesc", "Add to your home screen for faster access")}
        </p>
      </div>
      
      {!isIOS && (
        <Button variant="secondary" size="sm" onClick={handleInstallClick} className="rounded-xl shrink-0 mr-2 text-primary hover:bg-secondary/90">
          <Download className="w-4 h-4 mr-1" /> {T("install", "Install")}
        </Button>
      )}
      
      <button onClick={() => setShowBanner(false)} className="p-1 opacity-70 hover:opacity-100 shrink-0 transition-opacity">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}