import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Zap, Star, Sparkles, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

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

const isInAppBrowser = () => {
  const ua = navigator.userAgent || "";
  return /\bwv\b/.test(ua) || /iPhone.*Mobile.*Safari/.test(ua) === false && /iPhone/.test(ua);
};

export default function Support() {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState("");

  const urlParams = new URLSearchParams(window.location.search);
  const successType = urlParams.get("success") === "true" ? urlParams.get("type") : null;
  const cancelled = urlParams.get("cancelled") === "true";

  async function handlePurchase(planId) {
    if (isInAppBrowser()) {
      alert("Purchases are available on the web version. Please open RAYMA in your browser (Safari or Chrome) to complete your purchase.");
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

  return (
    <div className="max-w-xl mx-auto px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

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
        {successType && (
          <div className="mb-6 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">Purchase successful!</p>
              <p className="text-xs text-green-700 dark:text-green-400">Your tokens have been added to your account.</p>
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

        {/* Plans */}
        <div className="space-y-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-card border-2 rounded-2xl p-5 ${plan.color}`}
            >
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
          Payments are processed securely by Stripe. All prices in USD.
          <br />Token packs never expire. Annual pass renews yearly.
        </p>

      </motion.div>
    </div>
  );
}