import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { isStripeAllowed, getPlatform } from "@/lib/iap";
import { Zap, Star, Sparkles, CheckCircle2, Loader2, ExternalLink, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PLANS = [
  {
    id: "token_pack_10",
    label: "Starter Pack",
    price: "$0.99",
    tokens: 10,
    desc: "10 AI consultations",
    highlight: false,
    color: "border-border",
  },
  {
    id: "token_pack_50",
    label: "Popular Pack",
    price: "$3.99",
    tokens: 50,
    desc: "50 AI consultations",
    highlight: true,
    color: "border-amber-400",
    badge: "POPULAR",
  },
  {
    id: "token_pack_100",
    label: "Best Value Pack",
    price: "$6.99",
    tokens: 100,
    desc: "100 AI consultations",
    highlight: false,
    color: "border-border",
  },
  {
    id: "annual_pass",
    label: "Annual Pass",
    price: "$19.99",
    tokens: null,
    desc: "Unlimited AI for 1 year",
    highlight: false,
    color: "border-primary",
    badge: "BEST VALUE",
  },
];

// Use centralized IAP detection from lib/iap.js
export default function Support() {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoSuccess, setPromoSuccess] = useState(null);

  // --- 🛡️ MOBILE WRAPPER COMPLIANCE STATE ---
  const [isNativeApp, setIsNativeApp] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    // Check for iOS Native Wrapper
    const isIOS = /iPhone|iPad|iPod/.test(userAgent) && !/Safari|Chrome/.test(userAgent);
    // Check for Android Native Wrapper (WebView)
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
    if (!isStripeAllowed()) {
      const platform = getPlatform();
      alert(`Purchases on ${platform === "ios" ? "iOS" : "Android"} use the native app store. Please update to the latest version of RAYMA to make in-app purchases.`);
      return;
    }
    setLoading(planId);
    setError("");
    const res = await base44.functions.invoke("createCheckoutSession", {
      purchaseType: planId,
      successUrl: `${window.location.origin}/support?success=true&type=${planId}`,
      cancelUrl: `${window.location.origin}/support?cancelled=true`,
    });
    setLoading(null);
    if (res.data?.url) {
      window.location.href = res.data.url;
    } else {
      setError(res.data?.error || "Something went wrong. Please try again.");
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
        
        {/* Legal Disclaimer */}
        <div className="mb-6 p-4 bg-destructive/5 border border-destructive/20 rounded-2xl">
          <p className="text-xs font-semibold text-destructive mb-1">⚠️ Financial Disclaimer</p>
          <p className="text-xs text-muted-foreground">
            RAYMA provides tools for personal finance tracking only. Not financial advice. Consult a qualified financial professional before making financial decisions. See <a href="/privacy" className="underline text-primary">Privacy Policy</a> for full terms.
          </p>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-foreground mb-2">RAYMA AI Tokens</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You get <strong>5 free AI consultations every month</strong>. Need more? Pick a token pack or get unlimited access with the Annual Pass.
          </p>
        </div>

        {/* Success banner */}
        {(successType || promoSuccess) && (
          <div className="mb-6 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">{promoSuccess ? "Welcome, Sponsor!" : "Purchase successful!"}</p>
              <p className="text-xs text-green-700 dark:text-green-400">{promoSuccess || "Your tokens have been added to your account."}</p>
            </div>
          </div>
        )}

        {/* Cancelled banner */}
        {cancelled && (
          <div className="mb-6 bg-muted border border-border rounded-2xl p-4">
            <p className="text-sm text-muted-foreground">Purchase cancelled. No charge was made.</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* 🛡️ COMPLIANCE WRAPPER START */}
        {isNativeApp ? (
          <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f8f9fa', borderRadius: '12px', marginTop: '2rem', border: '1px solid #e0e0e0' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#333' }}>
              Available on the Web
            </h3>
            <p style={{ color: '#555', marginBottom: '1rem' }}>
              To comply with app store policies, AI token packs and the Annual Pass cannot be purchased directly within the mobile app.
            </p>
            <p style={{ fontWeight: 'bold', color: '#00c4b4', fontSize: '1.1rem' }}>
              Please log in to Rayma from your mobile or desktop web browser to upgrade!
            </p>
          </div>
        ) : (
          <div className="stripe-checkout-ui">
            {/* Promo Code Section */}
            <div className="mb-6 bg-primary/5 border border-primary/30 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Gift className="w-5 h-5 text-primary" />
                <p className="font-semibold text-foreground text-sm">Have a Sponsor Code?</p>
              </div>
              <form onSubmit={handlePromoCode} className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter promo code…"
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
                  {promoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Redeem"}
                </Button>
              </form>
            </div>

            {/* Plans */}
            <div className="space-y-3">
              {PLANS.map((plan) => (
                <div key={plan.id} className={`relative bg-card border-2 rounded-2xl p-5 ${plan.color}`}>
                  {plan.badge && (
                    <div className={`absolute -top-3 left-5 text-[10px] font-bold px-3 py-0.5 rounded-full ${plan.highlight ? "bg-amber-400 text-white" : "bg-primary text-primary-foreground"}`}>
                      {plan.badge}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        {plan.tokens ? <Zap className="w-5 h-5 text-primary" /> : <Star className="w-5 h-5 text-primary" />}
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
                        {loading === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buy"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer note */}
            <p className="text-center text-xs text-muted-foreground mt-6 leading-relaxed">
              Payments are processed securely by Stripe. All prices in USD. <br />
              Token packs and Annual Pass are one-time purchases. Non-refundable. No subscriptions. <br />
              See <a href="/terms" className="underline text-primary">Terms of Service</a> for full details.
            </p>
          </div>
        )}
        {/* 🛡️ COMPLIANCE WRAPPER END */}

      </motion.div>
    </div>
  );
}
