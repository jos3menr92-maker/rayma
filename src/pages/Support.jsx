import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Battery, BatteryCharging, Zap, Gamepad2, CheckCircle2, Loader2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// 🔋 THE NEW GAMIFIED POWER TIERS (MERGED BOXES)
const PLANS = [
  {
    id: "power_insert_coin",
    label: "Insert Coin (Instant Charge)",
    desc: "Instantly restores your AI battery to 100%. No subscription.",
    icon: <Zap className="w-5 h-5 text-amber-500" />,
    color: "border-border",
    isSubscription: false,
    price: "$1.99",
    purchaseId: "power_insert_coin"
  },
  {
    id: "power_lithium",
    label: "Lithium Upgrade",
    desc: "Upgrades your daily capacity to 50 Energy Bars.",
    icon: <BatteryCharging className="w-5 h-5 text-blue-500" />,
    color: "border-blue-500",
    badge: "POPULAR",
    isSubscription: true,
    monthlyId: "power_lithium_monthly",
    monthlyPrice: "$5.99 / mo",
    annualId: "power_lithium_annual",
    annualPrice: "$49.99 / yr",
    annualSavings: "Save 30%"
  },
  {
    id: "power_generator",
    label: "Arcade Generator",
    desc: "200 daily Energy Bars + Gold Sponsor Badge.",
    icon: <Gamepad2 className="w-5 h-5 text-primary" />,
    color: "border-primary",
    badge: "SPONSOR TIER",
    isSubscription: true,
    monthlyId: "power_generator_monthly",
    monthlyPrice: "$11.99 / mo",
    annualId: "power_generator_annual",
    annualPrice: "$95.99 / yr",
    annualSavings: "Save 33%"
  },
];

export default function Support() {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoSuccess, setPromoSuccess] = useState(null);

  // --- 📱 MOBILE WRAPPER DETECTION ---
  const [isNativeApp, setIsNativeApp] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isIOS = /iPhone|iPad|iPod/.test(userAgent
