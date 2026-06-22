/**
 * Energy Bars Utility for RAYMA Frontend
 *
 * Provides React hooks and helpers to manage user energy bars
 * Usage in components for AI consultations, special features, etc.
 */

import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook to fetch and track user energy bars
 * @param userId - Optional: specific user ID to fetch. If null, uses current user
 * @returns { energy_bars, purchased_energy, total_energy, isLoading, error, refetch }
 */
export function useEnergyBars(userId = null) {
  const [energyData, setEnergyData] = useState({
    energy_bars: 10,
    purchased_energy: 0,
    total_energy: 10,
    isLoading: true,
    error: null,
  });

  const fetchEnergyData = async () => {
    try {
      setEnergyData((prev) => ({ ...prev, isLoading: true, error: null }));

      // If no userId provided, fetch current user
      const targetUserId = userId;

      const users = await base44.entities.User.filter({ id: targetUserId });
      const user = users[0];

      if (!user) {
        throw new Error('User not found');
      }

      const currentEnergyBars = user.energy_bars || 10;
      const purchasedEnergy = user.purchased_energy || 0;
      const totalEnergy = currentEnergyBars + purchasedEnergy;

      setEnergyData({
        energy_bars: currentEnergyBars,
        purchased_energy: purchasedEnergy,
        total_energy: totalEnergy,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('Failed to fetch energy bars:', err);
      setEnergyData((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message,
      }));
    }
  };

  useEffect(() => {
    fetchEnergyData();
  }, [userId]);

  return {
    ...energyData,
    refetch: fetchEnergyData,
  };
}

/**
 * Deduct energy bars when user uses an AI consultation
 * @param userId - User's ID
 * @param amount - How many bars to deduct (default: 1)
 * @returns Success/failure result
 */
export async function deductEnergyBars(userId, amount = 1) {
  try {
    const users = await base44.entities.User.filter({ id: userId });
    const user = users[0];

    if (!user) {
      throw new Error('User not found');
    }

    const currentBars = user.energy_bars || 10;
    const newBars = Math.max(0, currentBars - amount);

    await base44.entities.User.update(userId, {
      energy_bars: newBars,
    });

    console.log(`✓ Deducted ${amount} energy bars for user ${userId}. Remaining: ${newBars}`);

    return {
      success: true,
      remainingBars: newBars,
      message: `You have ${newBars} energy bars left`,
    };
  } catch (err) {
    console.error('Failed to deduct energy bars:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Add purchased energy (when user buys energy pack)
 * @param userId - User's ID
 * @param amountToPurchase - How many bars to add to purchased_energy (50, 100, etc.)
 * @returns Success/failure result
 */
export async function addPurchasedEnergy(userId, amountToPurchase) {
  try {
    const users = await base44.entities.User.filter({ id: userId });
    const user = users[0];

    if (!user) {
      throw new Error('User not found');
    }

    const currentPurchased = user.purchased_energy || 0;
    const newPurchasedTotal = currentPurchased + amountToPurchase;
    const newEnergyBars = (user.energy_bars || 10) + amountToPurchase;

    await base44.entities.User.update(userId, {
      purchased_energy: newPurchasedTotal,
      energy_bars: newEnergyBars,
    });

    console.log(
      `✓ Added ${amountToPurchase} purchased energy bars for user ${userId}. ` +
      `Purchased total: ${newPurchasedTotal}, Current bars: ${newEnergyBars}`
    );

    return {
      success: true,
      purchasedEnergy: newPurchasedTotal,
      totalBars: newEnergyBars,
      message: `You now have ${newEnergyBars} energy bars!`,
    };
  } catch (err) {
    console.error('Failed to add purchased energy:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Check if user has enough energy bars for an action
 * @param currentBars - User's current energy_bars value
 * @param requiredBars - How many bars the action costs
 * @returns boolean
 */
export function hasEnoughEnergy(currentBars, requiredBars = 1) {
  return currentBars >= requiredBars;
}

/**
 * Format energy bars display (e.g., "5/10" or "15/∞")
 * @param currentBars - Current energy_bars
 * @param isPremium - Whether user has active annual_pass
 * @returns formatted string
 */
export function formatEnergyDisplay(currentBars, isPremium = false) {
  if (isPremium) {
    return `${currentBars}/∞`;
  }
  return `${currentBars}/10`;
}

/**
 * Calculate time until next daily reset
 * @param lastResetDate - last_energy_reset date (YYYY-MM-DD)
 * @returns { hoursUntilReset, minutesUntilReset, displayText }
 */
export function calculateTimeUntilReset(lastResetDate) {
  if (!lastResetDate) {
    return { hoursUntilReset: 0, minutesUntilReset: 0, displayText: 'Resetting soon...' };
  }

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const now = new Date();
  const timeUntilReset = tomorrow - now;
  const hoursUntilReset = Math.floor(timeUntilReset / (1000 * 60 * 60));
  const minutesUntilReset = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));

  return {
    hoursUntilReset,
    minutesUntilReset,
    displayText: `Resets in ${hoursUntilReset}h ${minutesUntilReset}m`,
  };
}

export default {
  useEnergyBars,
  deductEnergyBars,
  addPurchasedEnergy,
  hasEnoughEnergy,
  formatEnergyDisplay,
  calculateTimeUntilReset,
};
