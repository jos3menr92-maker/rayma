import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Battery, BatteryCharging, Zap, Gamepad2, CheckCircle2, Loader2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/LanguageContext";
import { isNativeMobileApp, getPlatform, triggerNativeIAP, APPLE_PRODUCT_IDS, GOOGLE_PRODUCT_IDS } from "@/lib/iap";
import { useAuth } from "@/lib/AuthContext";

export default function Store() {
  const T = useT();
  const { user } = useAuth();

  const [loading, setLoading] = useState(null);
  const [error, setError] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoSuccess, setPromoSuccess] = useState(null);

  const nativeApp = isNativeMobileApp();
  const platform = getPlatform();

  const urlParams = new URLSearchParams(window.location.search);
  const successType = urlParams.get("success") === "true" ? urlParams.get("type") : null;
  const cancelled = urlParams.get("cancelled") === "true";

  const PLANS = [
    {
      id: "power_insert_coin",
      label: T("insertCoin", "Insert Coin (Instant Charge)"),
      desc: T("insertCoinDesc", "Instantly restores your AI battery to 100%. No subscription."),
      icon: <Zap className="w-5 h-5 text-amber-500" />,
      color: "border-border",
      isSubscription: false,
      price: "$1.99",
      purchaseId: "power_insert_coin",
    },
    {
      id: "power_lithium",
      label: T("lithiumUpgrade", "Lithium Upgrade"),
      desc: T("lithiumDesc", "Upgrades your daily capacity to 50 Energy Bars."),
      icon: <BatteryCharging className="w-5 h-5 text-blue-500" />,
      color: "border-blue-500",
      badge: T("popular", "POPULAR"),
      isSubscription: true,
      monthlyId: "power_lithium_monthly",
      monthlyPrice: "$5.99 / mo",
      annualId: "power_lithium_annual",
      annualPrice: "$49.99 / yr",
      annualSavings: T("save30", "Save 30%"),
    },
    {
      id: "power_generator",
      label: T("arcadeGenerator", "Arcade Generator"),
      desc: T("generatorDesc", "200 daily Energy Bars + Gold Sponsor Badge."),
      icon: <Gamepad2 className="w-5 h-5 text-primary" />,
      color: "border-primary",
      badge: T("sponsorTier", "SPONSOR TIER"),
      isSubscription: true,
      monthlyId: "power_generator_monthly",
      monthlyPrice: "$11.99 / mo",
      annualId: "power_generator_annual",
      annualPrice: "$95.99 / yr",
      annualSavings: T("save33", "Save 33%"),
    },
  ];

  async function handlePurchase(planId) {
    setLoading(planId);
    setError("");

    // 🍎 Native app (iOS/Android) — use native in-app purchase
    if (nativeApp) {
      const productIds = platform === "ios" ? APPLE_PRODUCT_IDS : GOOGLE_PRODUCT_IDS;
      const nativeProductId = productIds[planId];
      if (!nativeProductId) {
        setError(T("purchaseUnavailable", "This purchase is not available in the app store."));
        setLoading(null);
        return;
      }
      const result = await triggerNativeIAP(nativeProductId);
      setLoading(null);
      if (result?.success) {
        setPromoSuccess(T("purchaseSuccess", "Purchase successful! Your battery has been recharged."));
        setTimeout(() => setPromoSuccess(null), 5000);
      } else {
        setError(result?.error || T("purchaseFailed", "Purchase failed. Please try again."));
      }
      return;
    }

    // 🌐 Web — block checkout inside an iframe (Stripe requirement)
    let inIframe = false;
    try { inIframe = window.self !== window.top; } catch (e) { inIframe = true; }
    if (inIframe) {
      setError(T("iframeBlocked", "Checkout works only from the published app. Please open Rayma AI in a new tab."));
      setLoading(null);
      return;
    }

    // Stripe checkout
    try {
      const res = await base44.functions.invoke("createCheckoutSession", {
        purchaseType: planId,
        customerEmail: user?.email,
        userId: user?.id,
        successUrl: `${window.location.origin}/store?success=true&type=${planId}`,
        cancelUrl: `${window.location.origin}/store?cancelled=true`,
      });
      setLoading(null);
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setError(res.data?.error || T("systemOffline", "System offline. Please try again."));
      }
    } catch (err) {
      setLoading(null);
      setError(err.message || T("systemOffline", "System offline. Please try again."));
    }
  }

  async function handlePromoCode(e) {
    e.preventDefault();
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setError("");
    setPromoSuccess(null);
    try {
      const res = await base44.functions.invoke("redeemPromoCode", { code: promoCode.trim() });
      if (res.data?.success) {
        setPromoSuccess(res.data.message || T("promoSuccess", "Promo code redeemed!"));
        setPromoCode("");
        setTimeout(() => setPromoSuccess(null), 5000);
      } else {
        setError(res.data?.error || T("invalidPromo", "Invalid promo code."));
      }
    } catch (err) {
      setError(err.message || T("promoFailed", "Failed to connect to the server."));
    } finally {
      setPromoLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Battery className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-foreground mb-2">{T("powerStation", "Rayma AI Power Station")}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {T("powerStationDesc", "Every user gets an AA Battery (10 Energy Bars) every day for free. Need more juice to simulate heavy debt payoffs? Upgrade your capacity below.")}
          </p>
        </div>

        {(successType || promoSuccess) && (
          <div className="mb-6 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">{T("powerUpSuccess", "Power Up Successful!")}</p>
              <p className="text-xs text-green-700 dark:text-green-400">
                {typeof promoSuccess === "string" ? promoSuccess : T("batteryRecharged", "Your AI Battery has been recharged and upgraded.")}
              </p>
            </div>
          </div>
        )}

        {cancelled && (
          <div className="mb-6 bg-muted border border-border rounded-2xl p-4">
            <p className="text-sm text-muted-foreground">{T("purchaseCancelled", "Purchase cancelled. No quarters were taken.")}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {nativeApp && (
          <div className="mb-4 bg-primary/5 border border-primary/30 rounded-xl p-3 text-xs text-muted-foreground text-center">
            {T("nativeStoreNote", "Purchases are processed by the App Store.")}
          </div>
        )}

        <div className="mb-6 bg-primary/5 border border-primary/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-5 h-5 text-primary" />
            <p className="font-semibold text-foreground text-sm">{T("haveCheatCode", "Have a Cheat Code? (Promo)")}</p>
          </div>
          <form onSubmit={handlePromoCode} className="flex gap-2">
            <Input
              type="text"
              placeholder={T("enterCheatCode", "Enter cheat code…")}
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
              {promoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : T("unlock", "Unlock")}
            </Button>
          </form>
        </div>

        <div className="space-y-4">
          {PLANS.map((plan) => (
            <div key={plan.id} className={`relative bg-card border-2 rounded-2xl p-5 ${plan.color}`}>
              {plan.badge && (
                <div className={`absolute -top-3 left-5 text-[10px] font-bold px-3 py-0.5 rounded-full ${plan.color === "border-primary" ? "bg-primary text-primary-foreground" : "bg-blue-500 text-white"}`}>
                  {plan.badge}
                </div>
              )}

              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                  {plan.icon}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-base">{plan.label}</p>
                  <p className="text-sm text-muted-foreground">{plan.desc}</p>
                </div>
              </div>

              {plan.isSubscription ? (
                <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-4 border-t border-border/50">
                  <div className="flex-1 flex items-center justify-between bg-muted/30 p-3 rounded-xl border border-border">
                    <span className="font-medium text-sm">{plan.monthlyPrice}</span>
                    <Button size="sm" variant="secondary" onClick={() => handlePurchase(plan.monthlyId)} disabled={loading === plan.monthlyId} className="rounded-lg">
                      {loading === plan.monthlyId ? <Loader2 className="w-4 h-4 animate-spin" /> : T("monthly", "Monthly")}
                    </Button>
                  </div>
                  <div className="flex-1 flex items-center justify-between bg-primary/5 p-3 rounded-xl border border-primary/30 relative">
                    <div className="absolute -top-2.5 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-500 text-white">
                      {plan.annualSavings}
                    </div>
                    <span className="font-bold text-sm text-primary">{plan.annualPrice}</span>
                    <Button size="sm" onClick={() => handlePurchase(plan.annualId)} disabled={loading === plan.annualId} className="rounded-lg shadow-sm">
                      {loading === plan.annualId ? <Loader2 className="w-4 h-4 animate-spin" /> : T("yearly", "Yearly")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                  <span className="text-xl font-bold font-heading text-foreground">{plan.price}</span>
                  <Button onClick={() => handlePurchase(plan.purchaseId)} disabled={loading === plan.purchaseId} className="rounded-xl w-32">
                    {loading === plan.purchaseId ? <Loader2 className="w-4 h-4 animate-spin" /> : T("buyNow", "Buy Now")}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6 leading-relaxed">
          {T("paymentsSecure", "Payments are securely processed. Purchases are tied to your Rayma AI account.")}<br />
          {T("currencyNote", "Prices may vary automatically based on your local currency to ensure fair access globally.")}<br />
          {T("seeTerms", "See")} <a href="/terms" className="underline text-primary">{T("termsOfService", "Terms of Service")}</a> {T("forFullDetails", "for full details.")}
        </p>
      </motion.div>
    </div>
  );
}