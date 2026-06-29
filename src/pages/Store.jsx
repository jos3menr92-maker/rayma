import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Zap, BatteryCharging, Sparkles, Crown, Gift, CheckCircle2, Loader2, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { isNativeMobileApp, getPlatform, triggerNativeIAP, APPLE_PRODUCT_IDS, GOOGLE_PRODUCT_IDS } from "@/lib/iap";

export default function Store() {
  const { lang } = useLanguage();
  const T = (key, fallback) => t(lang, key) !== key ? t(lang, key) : fallback;

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
      id: "token_pack_10",
      label: T("starterPack", "Starter Pack"),
      desc: T("starterPackDesc", "10 AI consultations"),
      price: "$0.99",
      tokens: 10,
      icon: <Zap className="w-5 h-5 text-amber-500" />,
      color: "border-border",
    },
    {
      id: "token_pack_50",
      label: T("popularPack", "Popular Pack"),
      desc: T("popularPackDesc", "50 AI consultations"),
      price: "$3.99",
      tokens: 50,
      icon: <BatteryCharging className="w-5 h-5 text-blue-500" />,
      color: "border-blue-500",
      badge: T("popular", "POPULAR"),
    },
    {
      id: "token_pack_100",
      label: T("bestValuePack", "Best Value Pack"),
      desc: T("bestValuePackDesc", "100 AI consultations"),
      price: "$6.99",
      tokens: 100,
      icon: <Sparkles className="w-5 h-5 text-primary" />,
      color: "border-primary",
      badge: T("bestValue", "BEST VALUE"),
    },
    {
      id: "annual_pass",
      label: T("annualPass", "Annual Pass"),
      desc: T("unlimited", "Unlimited AI for 1 year"),
      price: "$19.99",
      icon: <Crown className="w-5 h-5 text-amber-500" />,
      color: "border-amber-500",
      badge: T("bestValue", "BEST VALUE"),
      isAnnualPass: true,
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
        setPromoSuccess(T("purchaseSuccess", "Purchase successful! Your tokens have been added."));
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
            <Coins className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-foreground mb-2">{T("store", "Rayma AI Store")}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {T("storeDesc", "Get AI consultation tokens or unlock a full year of unlimited access. Tokens never expire.")}
          </p>
        </div>

        {(successType || promoSuccess) && (
          <div className="mb-6 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">{T("purchaseSuccess", "Purchase Successful!")}</p>
              <p className="text-xs text-green-700 dark:text-green-400">
                {typeof promoSuccess === "string" ? promoSuccess : T("tokensAdded", "Your tokens have been added to your account.")}
              </p>
            </div>
          </div>
        )}

        {cancelled && (
          <div className="mb-6 bg-muted border border-border rounded-2xl p-4">
            <p className="text-sm text-muted-foreground">{T("purchaseCancelled", "Purchase cancelled. No charge was made.")}</p>
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
            <p className="font-semibold text-foreground text-sm">{T("havePromoCode", "Have a Promo Code?")}</p>
          </div>
          <form onSubmit={handlePromoCode} className="flex gap-2">
            <Input
              type="text"
              placeholder={T("enterPromoCode", "Enter promo code…")}
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
                <div className={`absolute -top-3 left-5 text-[10px] font-bold px-3 py-0.5 rounded-full ${plan.color === "border-primary" ? "bg-primary text-primary-foreground" : plan.color === "border-amber-500" ? "bg-amber-500 text-white" : "bg-blue-500 text-white"}`}>
                  {plan.badge}
                </div>
              )}

              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                  {plan.icon}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-base">{plan.label}</p>
                  <p className="text-sm text-muted-foreground">{plan.desc}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                <div>
                  <span className="text-xl font-bold font-heading text-foreground">{plan.price}</span>
                  {!plan.isAnnualPass && (
                    <span className="text-xs text-muted-foreground ml-2">· {plan.tokens} {T("tokens", "tokens")}</span>
                  )}
                </div>
                <Button onClick={() => handlePurchase(plan.id)} disabled={loading === plan.id} className="rounded-xl w-32">
                  {loading === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : T("buyNow", "Buy Now")}
                </Button>
              </div>
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