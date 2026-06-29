import React, { useEffect, useState, useMemo } from 'react';
import { Zap, AlertCircle } from 'lucide-react';
import { useEnergyBars, calculateTimeUntilReset } from '@/utils/energyBarsUtil';
import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/LanguageContext';
import { t } from '@/lib/i18n';

export default function EnergyDisplay({ userId, isPremium = false, onPurchaseClick }) {
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const { energy_bars, purchased_energy, total_energy, isLoading, error, refetch } =
    useEnergyBars(userId);

  const [timeUntilReset, setTimeUntilReset] = useState(null);
  const maxBars = isPremium ? total_energy : 10 + purchased_energy;
  const percentage = (energy_bars / maxBars) * 100;

  useEffect(() => {
    const updateTimer = () => {
      setTimeUntilReset(calculateTimeUntilReset());
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);

    return () => clearInterval(interval);
  }, []);

  const isLowEnergy = energy_bars <= 2;
  const isOutOfEnergy = energy_bars === 0;

  if (isLoading) {
    return (
      <div className="p-4 bg-gradient-to-br from-amber-900/20 to-orange-900/20 rounded-lg border border-amber-600/30 animate-pulse">
        <div className="h-6 bg-amber-600/20 rounded w-3/4 mb-2" />
        <div className="h-4 bg-amber-600/20 rounded w-1/2" />
      </div>
    );
  }

  return (
    <motion.div
      className={`p-4 rounded-lg border transition-all ${
        isPremium
          ? 'bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border-purple-600/40'
          : isOutOfEnergy
          ? 'bg-gradient-to-br from-red-900/20 to-red-800/20 border-red-600/40'
          : isLowEnergy
          ? 'bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border-yellow-600/40'
          : 'bg-gradient-to-br from-amber-900/20 to-orange-900/20 border-amber-600/30'
      }`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap
            className={`w-5 h-5 ${
              isPremium ? 'text-purple-400' : isLowEnergy ? 'text-orange-400' : 'text-amber-400'
            }`}
          />
          <span className="font-bold text-sm text-gray-100">
            {isPremium ? T("premiumEnergy", "⚡ Premium Energy") : T("aiEnergy", "🔋 AI Energy")}
          </span>
        </div>
        <span className="text-lg font-bold text-amber-300">{energy_bars}</span>
      </div>

      <div className="w-full bg-gray-700/50 rounded-full h-3 mb-3 overflow-hidden">
        <motion.div
          className={`h-full rounded-full transition-all ${
            isPremium
              ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
              : isOutOfEnergy
              ? 'bg-red-600'
              : isLowEnergy
              ? 'bg-gradient-to-r from-orange-500 to-red-500'
              : 'bg-gradient-to-r from-amber-500 to-orange-500'
          }`}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="text-xs text-gray-300 mb-3">
        {isPremium ? (
          <div className="flex items-center gap-1">
            <span className="text-purple-300">{T("unlimitedPremium", "♾️ Unlimited • Premium Active")}</span>
          </div>
        ) : isOutOfEnergy ? (
          <div className="flex items-center gap-1 text-red-300">
            <AlertCircle className="w-4 h-4" />
            <span>{T("outOfEnergy", "Out of energy — resets at midnight UTC")}</span>
          </div>
        ) : isLowEnergy ? (
          <div className="flex items-center gap-1 text-orange-300">
            <AlertCircle className="w-4 h-4" />
            <span>{T("lowEnergy", "Low energy — {time}").replace("{time}", timeUntilReset?.displayText || "")}</span>
          </div>
        ) : (
          <span className="text-gray-400">{timeUntilReset?.displayText}</span>
        )}
      </div>

      {purchased_energy > 0 && (
        <div className="text-xs text-gray-400 mb-3 p-2 bg-black/20 rounded">
          <div>{T("baseDailyBars", "Base daily: 10 bars")}</div>
          <div>{T("purchasedBars", "Purchased: +{n} bars").replace("{n}", purchased_energy)}</div>
        </div>
      )}

      {!isPremium && (
        <button
          onClick={onPurchaseClick}
          className={`w-full py-2 px-3 rounded font-medium text-sm transition-all active:scale-95 ${
            isOutOfEnergy || isLowEnergy
              ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg'
              : 'bg-gray-600/50 text-gray-200'
          }`}
          aria-label={T("buyEnergyBars", "Buy energy bars")}
        >
          {isOutOfEnergy ? T("buyEnergyNow", "⚡ Buy Energy Now") : T("getMoreEnergy", "✨ Get More Energy")}
        </button>
      )}

      {error && (
        <div className="text-xs text-red-400 mt-2 p-2 bg-red-900/20 rounded">
          {T("errorLabel", "Error:")} {error}
        </div>
      )}

      <button
        onClick={refetch}
        className="text-xs text-gray-400 hover:text-gray-300 mt-2 underline"
      >
        {T("refresh", "Refresh")}
      </button>
    </motion.div>
  );
}