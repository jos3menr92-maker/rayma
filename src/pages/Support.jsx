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
    const isIOS = /iPhone|iPad|iPod/.test(userAgent) && !/Safari|Chrome/.test(userAgent);
    const isAndroid = /Android/.test(userAgent) && /wv/.test(userAgent);
    
    if (isIOS || isAndroid) {
        setIsNativeApp(true);
    }
  }, []);
  // ------------------------------------------

  const urlParams = new URLSearchParams(window.location.search);
  const successType = urlParams.get("success") === "true" ? urlParams.get("type") : null;
  const cancelled = urlParams.get("cancelled") === "true";

  async function handlePurchase(planId) {
    setLoading(planId);
    setError("");

    // 🚀 THE NATIVE BRIDGE: If user is on the mobile app, trigger Apple/Google Pay
    if (isNativeApp) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          action: 'INITIATE_NATIVE_PURCHASE',
          productId: planId
        }));
        setTimeout(() => setLoading(null), 3000); 
      } else {
        setError("Could not connect to the native app store. Please restart the app.");
        setLoading(null);
      }
      return;
    }

    // 🌐 THE WEB FLOW: If user is on a desktop/mobile web browser, use Stripe
    const res = await base44.functions.invoke("createCheckoutSession", {
      purchaseType: planId,
      successUrl: `${window.location.origin}/support?success=true&type=${planId}`,
      cancelUrl: `${window.location.origin}/support?cancelled=true`,
    });
    
    setLoading(null);
    if (res.data?.url) {
      window.location.href = res.data.url;
    } else {
      setError(res.data?.error || "System offline. Please try again.");
    }
  }

  async function handlePromoCode(e) {
    e.preventDefault();
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setError("");
    setPromoSuccess(null);
    const res = await base44.functions.invoke("redeemPromoCode", {
      code: promoCode.trim(),
    });
    setPromoLoading(false);
    if (res.data?.success) {
      setPromoSuccess(res.data.message);
      setPromoCode("");
      setTimeout(() => setPromoSuccess(null), 5000);
    } else {
      setError(res.data?.error || "Invalid promo code.");
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Battery className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-foreground mb-2">RAYMA Power Station</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Every user gets an <strong>AA Battery (10 Energy Bars)</strong> every day for free. 
            Need more juice to simulate heavy debt payoffs? Upgrade your capacity below.
          </p>
        </div>

        {/* Success banner */}
        {(successType || promoSuccess) && (
          <div className="mb-6 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">Power Up Successful!</p>
              <p className="text-xs text-green-700 dark:text-green-400">Your AI Battery has been recharged and upgraded.</p>
            </div>
          </div>
        )}

        {/* Cancelled & Error banners remain the same */}
        {cancelled && (
          <div className="mb-6 bg-muted border border-border rounded-2xl p-4">
            <p className="text-sm text-muted-foreground">Purchase cancelled. No quarters were taken.</p>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="stripe-checkout-ui">
          {/* Promo Code Section */}
          <div className="mb-6 bg-primary/5 border border-primary/30 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-5 h-5 text-primary" />
              <p className="font-semibold text-foreground text-sm">Have a Cheat Code? (Promo)</p>
            </div>
            <form onSubmit={handlePromoCode} className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter cheat code…"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                disabled={promoLoading}
                className="rounded-xl"
              />
              <Button
                type="submit"
                disabled={promoLoading || !promoCode.trim()}
                className="rounded-xl whitespace-nowrap"
              >
                {promoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unlock"}
              </Button>
            </form>
          </div>

          {/* New Gamified Plans */}
          <div className="space-y-3">
            {PLANS.map((plan) => (
              <div key={plan.id} className={`relative bg-card border-2 rounded-2xl p-5 ${plan.color}`}>
                {plan.badge && (
                  <div className={`absolute -top-3 left-5 text-[10px] font-bold px-3 py-0.5 rounded-full ${plan.highlight ? "bg-blue-500 text-white" : "bg-primary text-primary-foreground"}`}>
                    {plan.badge}
                  </div>
                )}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      {plan.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{plan.label}</p>
                      <p className="text-xs text-muted-foreground">{plan.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xl font-bold font-heading text-foreground">{plan.price}</span>
                    <Button
                      size="sm"
                      onClick={() => handlePurchase(plan.id)}
                      disabled={loading === plan.id}
                      className="rounded-xl"
                    >
                      {loading === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Select"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer note updated for compliance & vibe */}
          <p className="text-center text-xs text-muted-foreground mt-6 leading-relaxed">
            Payments are securely processed. Purchases are tied to your RAYMA account. <br />
            Prices may vary automatically based on your local currency to ensure fair access globally. <br />
            See <a href="/terms" className="underline text-primary">Terms of Service</a> for full details.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
