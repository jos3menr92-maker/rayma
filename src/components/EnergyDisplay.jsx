/**
 * Energy Display Component - RAYMA
 *
 * Displays user's current energy bars with:
 * - Visual bar progression
 * - Time until next reset
 * - "Buy Energy" button for premium packs
 * - Mobile-responsive and touch-friendly (no hover states)
 *
 * Usage:
 *   <EnergyDisplay userId={user.id} isPremium={hasActivePremium} onPurchaseClick={() => {}} />
 */

import React, { useEffect, useState } from 'react';
import { Zap, AlertCircle } from 'lucide-react';
import { useEnergyBars, calculateTimeUntilReset } from '@/utils/energyBarsUtil';
import { motion } from 'framer-motion';

export default function EnergyDisplay({ userId, isPremium = false, onPurchaseClick }) {
  const { energy_bars, purchased_energy, total_energy, isLoading, error, refetch } =
    useEnergyBars(userId);

  const [timeUntilReset, setTimeUntilReset] = useState(null);
  const maxBars = isPremium ? total_energy : 10 + purchased_energy; // Free users max at 10 (+ purchased energy)
  const percentage = (energy_bars / maxBars) * 100;

  // Update countdown timer
  useEffect(() => {
    const updateTimer = () => {
      setTimeUntilReset(calculateTimeUntilReset());
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

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
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap
            className={`w-5 h-5 ${
              isPremium ? 'text-purple-400' : isLowEnergy ? 'text-orange-400' : 'text-amber-400'
            }`}
          />
          <span className="font-bold text-sm text-gray-100">
            {isPremium ? '⚡ Premium Energy' : '🔋 AI Energy'}
          </span>
        </div>
        <span className="text-lg font-bold text-amber-300">{energy_bars}</span>
      </div>

      {/* Energy Bar */}
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

      {/* Status Text */}
      <div className="text-xs text-gray-300 mb-3">
        {isPremium ? (
          <div className="flex items-center gap-1">
            <span className="text-purple-300">♾️ Unlimited • Premium Active</span>
          </div>
        ) : isOutOfEnergy ? (
          <div className="flex items-center gap-1 text-red-300">
            <AlertCircle className="w-4 h-4" />
            <span>Out of energy — resets at midnight UTC</span>
          </div>
        ) : isLowEnergy ? (
          <div className="flex items-center gap-1 text-orange-300">
            <AlertCircle className="w-4 h-4" />
            <span>Low energy — {timeUntilReset?.displayText}</span>
          </div>
        ) : (
          <span className="text-gray-400">{timeUntilReset?.displayText}</span>
        )}
      </div>

      {/* Breakdown (if purchased energy exists) */}
      {purchased_energy > 0 && (
        <div className="text-xs text-gray-400 mb-3 p-2 bg-black/20 rounded">
          <div>Base daily: 10 bars</div>
          <div>Purchased: +{purchased_energy} bars</div>
        </div>
      )}

      {/* Action Button */}
      {!isPremium && (
        <button
          onClick={onPurchaseClick}
          className={`w-full py-2 px-3 rounded font-medium text-sm transition-all active:scale-95 ${
            isOutOfEnergy || isLowEnergy
              ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg'
              : 'bg-gray-600/50 text-gray-200'
          }`}
          aria-label="Buy energy bars"
        >
          {isOutOfEnergy ? '⚡ Buy Energy Now' : '✨ Get More Energy'}
        </button>
      )}

      {/* Error State */}
      {error && (
        <div className="text-xs text-red-400 mt-2 p-2 bg-red-900/20 rounded">
          Error: {error}
        </div>
      )}

      {/* Refresh Button (for testing) */}
      <button
        onClick={refetch}
        className="text-xs text-gray-400 hover:text-gray-300 mt-2 underline"
      >
        Refresh
      </button>
    </motion.div>
  );
}
