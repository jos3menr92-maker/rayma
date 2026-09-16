import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useT } from "@/lib/LanguageContext";
import { DEEP_REVIEW_COST } from "@/utils/deepReviewFacts";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";

/**
 * DeepReviewButton — the premium consultation entry point, rendered on the
 * Financial Health card. Flat 6 coins for everyone. Insufficient balance
 * routes to the Store instead of starting the review.
 */
export default function DeepReviewButton() {
  const T = useT();
  const navigate = useNavigate();
  const { userProfile } = useFinancialData();
  const [open, setOpen] = useState(false);
  const coins = userProfile?.ai_tokens ?? 0;
  const enough = coins >= DEEP_REVIEW_COST;

  const bullets = [
    T("deepReviewB1", "Your exact debt-free date and interest saved — avalanche vs snowball, computed by the app's official simulator"),
    T("deepReviewB2", "A budget blueprint built from your real spending"),
    T("deepReviewB3", "3 concrete steps to start this week — hope first, no shame"),
  ];

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground px-4 py-3 shadow-lg shadow-primary/30 ring-1 ring-primary/40 flex items-center gap-3 active:scale-[0.98] transition-transform"
      >
        <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4" />
        </span>
        <span className="flex-1 min-w-0 text-left">
          <span className="block text-sm font-bold font-heading leading-tight">{T("deepReviewTitle", "Deep Financial Review")}</span>
          <span className="block text-[10px] opacity-90">{T("deepReviewSubtitle", "Payoff plan · Budget blueprint · Action steps")}</span>
        </span>
        <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold">
          {DEEP_REVIEW_COST} 🪙
        </span>
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {T("deepReviewTitle", "Deep Financial Review")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-left space-y-2">
                <p>{T("deepReviewIntro", "A premium consultation with Rayma AI built on your verified numbers — not guesses:")}</p>
                <ul className="list-disc pl-4 space-y-1">
                  {bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
                <p className="font-semibold text-foreground">
                  {enough
                    ? T("deepReviewCostLine", "Cost: 6 coins · Your balance: {n} coins").replace("{n}", coins)
                    : T("deepReviewTopUpLine", "You have {n} coins — you need 6.").replace("{n}", coins)}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{T("cancel", "Cancel")}</AlertDialogCancel>
            {enough ? (
              <AlertDialogAction onClick={() => window.dispatchEvent(new CustomEvent("rayma:deep-review"))}>
                {T("deepReviewStart", "Start Review — 6 coins")}
              </AlertDialogAction>
            ) : (
              <AlertDialogAction onClick={() => navigate("/store")}>
                {T("deepReviewGetCoins", "Get Coins")}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}