import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Heart, Zap, CheckCircle2, AlertCircle, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const PRICES = {
  donation: {
    id: "price_1TcayzCbNKxnD0iTUrFheDMQ",
    label: "6-Month Donation",
    amount: "$3.99",
    description: "Keep RAYMA alive for 6 months",
    emoji: "☕",
    color: "border-amber-300 bg-amber-50 dark:bg-amber-950/20",
    btnColor: "bg-amber-500 hover:bg-amber-600 text-white",
    perks: [
      "Keep the app free for everyone",
      "Support financial tools for people in need",
      "Our eternal gratitude 🙏",
    ],
  },
  lifetime: {
    id: "price_1TcayzCbNKxnD0iTPIc5KYvu",
    label: "Lifetime Supporter",
    amount: "$9.99",
    description: "One-time payment, forever access",
    emoji: "⭐",
    color: "border-primary bg-primary/5",
    btnColor: "bg-primary hover:bg-primary/90 text-primary-foreground",
    perks: [
      "Pay once, use RAYMA forever",
      "All future features included",
      "Supporter badge on your profile",
      "You're a hero for the community 💚",
    ],
  },
};

export default function Support() {
  const urlParams = new URLSearchParams(window.location.search);
  const success = urlParams.get("success") === "true";
  const cancelled = urlParams.get("cancelled") === "true";

  const [loading, setLoading] = useState(null);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }
  }, []);

  const handleCheckout = async (priceKey) => {
    if (isInIframe) {
      alert("Payments can only be completed from the published app, not the preview. Please open the app in a full browser tab.");
      return;
    }

    setLoading(priceKey);
    const currentUrl = window.location.href.split("?")[0];
    const response = await base44.functions.invoke("createCheckoutSession", {
      priceId: PRICES[priceKey].id,
      successUrl: `${currentUrl}?success=true`,
      cancelUrl: `${currentUrl}?cancelled=true`,
    });

    setLoading(null);
    if (response.data?.url) {
      window.location.href = response.data.url;
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

        {/* Success / Cancel banners */}
        {success && (
          <div className="flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-2xl p-4 mb-5">
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Thank you so much! 💚</p>
              <p className="text-xs text-muted-foreground">Your support keeps RAYMA free for everyone who needs it.</p>
            </div>
          </div>
        )}
        {cancelled && (
          <div className="flex items-center gap-3 bg-muted border border-border rounded-2xl p-4 mb-5">
            <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">Payment cancelled — no worries, RAYMA is still free for you!</p>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-foreground mb-2">Support RAYMA</h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            RAYMA is built to help real people manage debt and take control of their finances —
            completely free. Your support keeps it that way.
          </p>
        </div>

        {/* Mission statement */}
        <div className="bg-secondary/10 border border-secondary/20 rounded-2xl p-4 mb-6 flex gap-3 items-start">
          <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Our mission:</span> No one should be locked out of smart financial tools because they can't afford a subscription.
            RAYMA will always be free — supporters like you make that possible.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="space-y-4 mb-8">
          {Object.entries(PRICES).map(([key, plan]) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`border-2 rounded-3xl p-5 ${plan.color}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{plan.emoji}</span>
                  <div>
                    <p className="font-semibold font-heading text-foreground text-sm">{plan.label}</p>
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                  </div>
                </div>
                <p className="text-xl font-bold font-heading text-foreground">{plan.amount}</p>
              </div>

              <ul className="space-y-1.5 mb-4">
                {plan.perks.map((perk, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    {perk}
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full rounded-xl font-semibold ${plan.btnColor}`}
                onClick={() => handleCheckout(key)}
                disabled={loading === key}
              >
                {loading === key ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Redirecting...
                  </span>
                ) : key === "lifetime" ? (
                  <span className="flex items-center gap-2"><Star className="w-4 h-4" /> Get Lifetime Access — {plan.amount}</span>
                ) : (
                  <span className="flex items-center gap-2"><Heart className="w-4 h-4" /> Donate {plan.amount}</span>
                )}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Always Free note */}
        <div className="text-center">
          <div className="flex items-center gap-2 justify-center mb-2">
            <Zap className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Always Free</p>
          </div>
          <p className="text-xs text-muted-foreground">
            RAYMA will never be paywalled. Every feature stays free forever.
            Support is 100% optional and appreciated from the heart.
          </p>
        </div>

      </motion.div>
    </div>
  );
}