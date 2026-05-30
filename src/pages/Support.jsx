import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Heart, CheckCircle2, AlertCircle, Sparkles, Star, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const QUICK_AMOUNTS = [1, 3, 5, 10, 20];

export default function Support() {
  const urlParams = new URLSearchParams(window.location.search);
  const success = urlParams.get("success") === "true";
  const cancelled = urlParams.get("cancelled") === "true";

  const [loading, setLoading] = useState(null);
  const [isInIframe, setIsInIframe] = useState(false);

  // Donation section
  const [donationAmount, setDonationAmount] = useState("");
  const [donationCustom, setDonationCustom] = useState(false);
  const [donationError, setDonationError] = useState("");

  // Lifetime section
  const [lifetimeAmount, setLifetimeAmount] = useState("");
  const [lifetimeCustom, setLifetimeCustom] = useState(false);
  const [lifetimeError, setLifetimeError] = useState("");

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }
  }, []);

  const handleCheckout = async (type) => {
    if (isInIframe) {
      alert("Payments can only be completed from the published app, not the preview. Please open the app in a full browser tab.");
      return;
    }

    const amountStr = type === "donation" ? donationAmount : lifetimeAmount;
    const amount = parseFloat(amountStr);

    if (!amountStr || isNaN(amount) || amount < 1) {
      const msg = "Please enter an amount of at least $1.00";
      if (type === "donation") setDonationError(msg);
      else setLifetimeError(msg);
      return;
    }

    if (type === "donation") setDonationError("");
    else setLifetimeError("");

    setLoading(type);
    const currentUrl = window.location.href.split("?")[0];

    const response = await base44.functions.invoke("createCheckoutSession", {
      customAmount: amount,
      donationType: type,
      successUrl: `${currentUrl}?success=true`,
      cancelUrl: `${currentUrl}?cancelled=true`,
    });

    setLoading(null);
    if (response.data?.url) {
      window.location.href = response.data.url;
    } else if (response.data?.error) {
      if (type === "donation") setDonationError(response.data.error);
      else setLifetimeError(response.data.error);
    }
  };

  const selectQuickAmount = (type, val) => {
    if (type === "donation") {
      setDonationAmount(String(val));
      setDonationCustom(false);
      setDonationError("");
    } else {
      setLifetimeAmount(String(val));
      setLifetimeCustom(false);
      setLifetimeError("");
    }
  };

  const handleCustomInput = (type, val) => {
    if (type === "donation") {
      setDonationAmount(val);
      setDonationError("");
    } else {
      setLifetimeAmount(val);
      setLifetimeError("");
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
              <p className="text-xs text-muted-foreground">Your support keeps RAYMA running for everyone who needs it.</p>
            </div>
          </div>
        )}
        {cancelled && (
          <div className="flex items-center gap-3 bg-muted border border-border rounded-2xl p-4 mb-5">
            <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">Payment cancelled — RAYMA will remain off until a donation is made.</p>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-foreground mb-2">Support RAYMA</h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Every user gets 6 months free. After that, a small donation keeps RAYMA active. All other features stay free forever.
          </p>
        </div>

        {/* Important notice */}
        <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 mb-6 flex gap-3 items-start">
          <Info className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-foreground mb-1">Free for 6 months, then donation-supported</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every new user gets RAYMA free for 6 months. After that, a donation of any amount (min $1) extends
              access for another 6 months. Or pay $20 once for lifetime access.
              All other app features stay free forever.
            </p>
          </div>
        </div>

        {/* === 6-MONTH DONATION CARD === */}
        <div className="border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/20 rounded-3xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">☕</span>
            <div>
              <p className="font-semibold font-heading text-foreground text-sm">6-Month Donation</p>
              <p className="text-xs text-muted-foreground">Any amount ≥ $1 · extends RAYMA for 6 months</p>
            </div>
          </div>

          <ul className="space-y-1 my-3">
            {["RAYMA AI advisor stays active", "Keeps the app free for everyone", "Renew anytime after 6 months"].map((p, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                {p}
              </li>
            ))}
          </ul>

          {/* Quick amounts */}
          <div className="flex gap-2 flex-wrap mb-3">
            {QUICK_AMOUNTS.map((v) => (
              <button
                key={v}
                onClick={() => selectQuickAmount("donation", v)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                  donationAmount === String(v) && !donationCustom
                    ? "bg-amber-500 border-amber-500 text-white"
                    : "bg-background border-border text-foreground hover:border-amber-400"
                }`}
              >
                ${v}
              </button>
            ))}
            <button
              onClick={() => { setDonationCustom(true); setDonationAmount(""); }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                donationCustom
                  ? "bg-amber-500 border-amber-500 text-white"
                  : "bg-background border-border text-foreground hover:border-amber-400"
              }`}
            >
              Custom
            </button>
          </div>

          {/* Custom or selected amount input */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">$</span>
              <Input
                type="number"
                min="1"
                step="0.01"
                placeholder="Enter amount"
                value={donationAmount}
                onChange={(e) => handleCustomInput("donation", e.target.value)}
                className="pl-7 rounded-xl"
              />
            </div>
          </div>

          {donationError && <p className="text-xs text-destructive mb-2">{donationError}</p>}

          <Button
            className="w-full rounded-xl font-semibold bg-amber-500 hover:bg-amber-600 text-white"
            onClick={() => handleCheckout("donation")}
            disabled={loading === "donation"}
          >
            {loading === "donation" ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Redirecting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Donate {donationAmount ? `$${parseFloat(donationAmount || 0).toFixed(2)}` : ""}
              </span>
            )}
          </Button>
        </div>

        {/* === LIFETIME CARD === */}
        <div className="border-2 border-primary bg-primary/5 rounded-3xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">⭐</span>
            <div>
              <p className="font-semibold font-heading text-foreground text-sm">Lifetime Supporter</p>
              <p className="text-xs text-muted-foreground">$20 one-time · RAYMA never expires for you</p>
            </div>
          </div>

          <ul className="space-y-1 my-3">
            {["Pay once, RAYMA active forever", "All future features included", "Supporter badge on your profile", "You're a hero for the community 💚"].map((p, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                {p}
              </li>
            ))}
          </ul>

          {/* Quick amounts */}
          <div className="flex gap-2 flex-wrap mb-3">
            {[20, 25, 50].map((v) => (
              <button
                key={v}
                onClick={() => selectQuickAmount("lifetime", v)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                  lifetimeAmount === String(v) && !lifetimeCustom
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-background border-border text-foreground hover:border-primary/50"
                }`}
              >
                ${v}
              </button>
            ))}
            <button
              onClick={() => { setLifetimeCustom(true); setLifetimeAmount(""); }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                lifetimeCustom
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-background border-border text-foreground hover:border-primary/50"
              }`}
            >
              Custom
            </button>
          </div>

          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">$</span>
              <Input
                type="number"
                min="1"
                step="0.01"
                placeholder="Enter amount"
                value={lifetimeAmount}
                onChange={(e) => handleCustomInput("lifetime", e.target.value)}
                className="pl-7 rounded-xl"
              />
            </div>
          </div>

          {lifetimeError && <p className="text-xs text-destructive mb-2">{lifetimeError}</p>}

          <Button
            className="w-full rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => handleCheckout("lifetime")}
            disabled={loading === "lifetime"}
          >
            {loading === "lifetime" ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Redirecting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                Get Lifetime Access {lifetimeAmount ? `— $${parseFloat(lifetimeAmount || 0).toFixed(2)}` : ""}
              </span>
            )}
          </Button>
        </div>

        {/* Footer note */}
        <div className="text-center space-y-1">
          <div className="flex items-center gap-2 justify-center mb-1">
            <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">All Other Features — Free Forever</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Loans, bills, budget, and all tracking tools will always be free.
            Only RAYMA AI requires a donation due to operating costs.
          </p>
        </div>

      </motion.div>
    </div>
  );
}