import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { t } from '@/lib/i18n';

const RemoteAssistanceCard = () => {
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const [pin, setPin] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900);

  useEffect(() => {
    let timer;
    if (pin && timeLeft > 0 && !isConnected) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      endSession();
    }
    return () => clearInterval(timer);
  }, [pin, timeLeft, isConnected]);

  const generatePin = () => {
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    const formattedPin = `${newPin.substring(0, 3)}-${newPin.substring(3, 6)}`;
    setPin(formattedPin);
    setTimeLeft(900);
    setIsConnected(false);
  };

  const copyToClipboard = () => {
    if (pin) navigator.clipboard.writeText(pin.replace('-', ''));
  };

  const endSession = () => {
    setPin(null);
    setIsConnected(false);
    setTimeLeft(900);
  };

  const simulateConnection = () => {
    setIsConnected(true);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-6 max-w-2xl mx-auto mt-6">
      
      <div className="border-b border-border pb-4 mb-4">
        <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <span className="text-primary">🎧</span> {T("remoteAssistanceTitle", "Live Remote Assistance")}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">{T("remoteAssistanceDesc2", "Secure, temporary access for troubleshooting.")}</p>
      </div>

      <div className="flex items-center gap-3 mb-6 bg-muted p-3 rounded-lg">
        <span className="font-medium text-foreground">{T("statusLabel", "Status:")}</span>
        {isConnected ? (
          <span className="flex items-center gap-2 text-green-600 font-semibold animate-pulse">
            <span className="h-3 w-3 bg-green-500 rounded-full"></span>
            {T("connectedActive", "Connected (Session Active)")}
          </span>
        ) : (
          <span className="flex items-center gap-2 text-red-500 font-semibold">
            <span className="h-3 w-3 bg-red-500 rounded-full"></span>
            {T("notConnected", "Not Connected")}
          </span>
        )}
      </div>

      <div className="text-center bg-primary/5 rounded-xl p-6 border border-primary/20 mb-6">
        <h3 className="text-lg font-medium text-foreground mb-2">{T("yourSecurePin", "Your Secure Support PIN")}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          {T("pinInstructions", "Provide this temporary 6-digit code to the support technician.")}
          {pin && !isConnected && (
            <span className="text-destructive font-medium block mt-1">
              {T("expiresIn", "Expires in")} {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          )}
        </p>

        {pin ? (
          <div className="flex flex-col items-center gap-4">
            <div className="text-4xl font-bold tracking-widest text-primary font-mono">
              {pin}
            </div>
            <button 
              onClick={copyToClipboard}
              className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1 transition-colors"
            >
              {T("copyToClipboard", "⧉ Copy to Clipboard")}
            </button>
          </div>
        ) : (
          <button 
            onClick={generatePin}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-6 rounded-lg transition-colors shadow-sm"
          >
            {T("generateNewPin", "Generate New PIN")}
          </button>
        )}
      </div>

      <div className="bg-muted rounded-lg p-5 border border-border">
        <div className="flex gap-3 mb-4">
          <span className="text-xl">🛡️</span>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {T("privacyGuardDesc", "Privacy Guard: The technician will only be able to view your screen and run diagnostic checks. They cannot initiate payments, view unmasked account numbers, or modify your connections. You can terminate this session at any time.")}
          </p>
        </div>
        
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
           <button onClick={simulateConnection} className="text-xs text-muted-foreground/60 hover:text-muted-foreground underline">
            {T("devTestConnect", "[Dev Test: Connect]")}
          </button>

          <button 
            onClick={endSession}
            disabled={!pin}
            className={`font-medium py-2 px-4 rounded-lg transition-colors ${
              pin 
                ? 'bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30' 
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            {T("endSessionRevoke", "🛑 End Session & Revoke Access")}
          </button>
        </div>
      </div>

    </div>
  );
};

export default RemoteAssistanceCard;