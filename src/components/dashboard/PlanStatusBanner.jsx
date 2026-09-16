import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useT } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { computeHealthScore } from "@/utils/healthScore";
import { DEEP_REVIEW_COST } from "@/utils/deepReviewFacts";
import ConfirmDialog from "@/components/ConfirmDialog";
import { AlertTriangle, TrendingUp, Sparkles, MessageCircle } from "lucide-react";

/**
 * PlanStatusBanner — a proactive "smart notification" for the Dashboard.
 * The chat only appears when opened, so the plan itself needs a voice on the
 * Dashboard: this banner computes where the user's plan stands with the SAME
 * verified-math brain as the health score (never LLM guesses) and shows either
 * "needs attention — this is where you are (…)" or "You're doing great! (…)",
 * with one tap handing the situation to Rayma AI with a contextual prompt.
 */
export default function PlanStatusBanner() {
  const T = useT();
  const navigate = useNavigate();
  const { formatCurrency: fmt } = useCurrency();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { loans, bills, incomes, savingsGoals, budgetCategories, transactions, transactionSplits, userProfile, loading } = useFinancialData();
  const coins = userProfile?.ai_tokens ?? 0;

  const status = useMemo(() => {
    if (loading) return null;
    const s = computeHealthScore({ loans, bills, incomes, savingsGoals, budgets: budgetCategories, transactions, transactionSplits });
    const dtiPct = s.paceIncome > 0 ? Math.round((s.totalObligation / s.paceIncome) * 100) : null;
    const cashFlow = s.paceIncome - s.totalObligation;

    // Newest active, not-yet-funded savings goal (e.g. created by the down payment plan flow)
    const goal = [...(savingsGoals || [])]
      .filter(g => (g.status || "active") === "active" && (g.target_amount || 0) > (g.current_saved || 0))
      .sort((a, b) => String(b.created_date || "").localeCompare(String(a.created_date || "")))[0];
    let goalInfo = null;
    if (goal && goal.weekly_contribution > 0 && goal.created_date) {
      const created = new Date(String(goal.created_date).slice(0, 10) + "T00:00:00");
      const weeks = Math.max(0, (Date.now() - created.getTime()) / (7 * 24 * 3600 * 1000));
      const expected = goal.weekly_contribution * weeks;
      goalInfo = {
        name: goal.name || T("savingsGoal", "savings goal"),
        saved: goal.current_saved || 0,
        target: goal.target_amount,
        pct: Math.round(((goal.current_saved || 0) / goal.target_amount) * 100),
        gap: Math.max(0, expected - (goal.current_saved || 0)),
        onTrack: (goal.current_saved || 0) >= expected * 0.85,
      };
    }

    // 1. Attention — obligations above the line lenders watch
    if (s.paceIncome > 0 && dtiPct > 43) {
      return {
        tone: "attention", icon: AlertTriangle, premium: true,
        title: T("planNeedsAttention", "Your financial plan needs attention"),
        body: T("planAttentionBody", "This is where you are: obligations take {pct}% of your income — above the ~43% line lenders watch. Ask me and we'll fix it.").replace("{pct}", dtiPct),
        prompt: T("planAttentionPrompt", "My plan needs attention — what should I fix first?"),
      };
    }
    // 2. Attention — savings goal behind the pace the user set
    if (goalInfo && !goalInfo.onTrack && goalInfo.gap > 0) {
      return {
        tone: "attention", icon: AlertTriangle, premium: true,
        title: T("planNeedsAttention", "Your financial plan needs attention"),
        body: T("planGoalBehindBody", "This is where you are: {name} is at {pct}% ({saved}) and {gap} behind the pace you set. A small catch-up this month gets you back on track.")
          .replace("{name}", goalInfo.name)
          .replace("{pct}", goalInfo.pct)
          .replace("{saved}", fmt(goalInfo.saved))
          .replace("{gap}", fmt(goalInfo.gap)),
        prompt: T("planGoalPrompt", "I'm behind on my savings goal — help me catch up with a realistic plan."),
      };
    }
    // 3. Doing great — positive cash flow and on-pace goal
    if (s.paceIncome > 0 && cashFlow > 0) {
      const savingsPct = s.savingsRate > 0 ? Math.round(s.savingsRate * 100) : null;
      const goalPart = goalInfo ? ` · ${fmt(goalInfo.saved)} ${T("towardGoal", "toward")} ${goalInfo.name}` : "";
      return {
        tone: "great", icon: TrendingUp, premium: true,
        title: T("planDoingGreat", "You're doing great!"),
        body: T("planGreatBody", "This is where you are: {cash} left after obligations{savings}{goal} — keep it up!")
          .replace("{cash}", fmt(cashFlow))
          .replace("{savings}", savingsPct != null ? ` · ${savingsPct}% ${T("ofIncomeKept", "of income kept")}` : "")
          .replace("{goal}", goalPart),
        prompt: T("planGreatPrompt", "I'm doing well — what should I do next to keep improving?"),
      };
    }
    // 4. Nudge — not enough real numbers yet to have a plan
    if (dtiPct == null && ((loans || []).length > 0 || (bills || []).length > 0)) {
      return {
        tone: "nudge", icon: Sparkles, premium: false,
        title: T("planNotBuiltYet", "Your plan needs real numbers"),
        body: T("planNudgeBody", "This is where you are: no income logged this month, so your cash flow and plan can't be computed yet. Log income and I'll take it from there."),
        prompt: T("planNudgePrompt", "Help me get started — what should I log first?"),
      };
    }
    return null;
  }, [loans, bills, incomes, savingsGoals, budgetCategories, transactions, transactionSplits, loading, T, fmt]);

  if (!status) return null;
  const Icon = status.icon;
  const tones = {
    attention: "bg-amber-400/10 border-amber-400/30",
    great: "bg-primary/10 border-primary/20",
    nudge: "bg-muted border-border",
  };
  const iconTones = { attention: "text-amber-500", great: "text-primary", nudge: "text-muted-foreground" };

  return (
    <div className={`rounded-2xl border px-4 py-3 mb-4 ${tones[status.tone]}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconTones[status.tone]}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">{status.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{status.body}</p>
        </div>
      </div>
      {status.prompt && (
        <>
          <button
            onClick={() => (status.premium ? setConfirmOpen(true) : window.dispatchEvent(new CustomEvent("rayma:open", { detail: { prefill: status.prompt } })))}
            className="mt-2.5 ml-8 flex items-center gap-1.5 bg-card border border-border rounded-lg px-3 py-1.5 text-[11px] font-semibold text-foreground active:scale-95 transition-transform"
          >
            <MessageCircle className="w-3.5 h-3.5 text-primary" />
            {status.premium ? T("planReviewButton", "Ask Rayma about this · 6 coins") : T("askRaymaPlan", "Ask Rayma about this")}
          </button>
          {status.premium && (
            <ConfirmDialog
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              title={T("planReviewTitle", "Full Plan Re-Review")}
              description={coins < DEEP_REVIEW_COST
                ? T("planReviewInsufficientDialog", "A full re-review costs 6 coins and you have {coins}. Top up in the Store or earn free coins in the Arcade.").replace("{coins}", String(coins))
                : T("planReviewDesc", "Rayma AI re-scans your latest numbers, remembers your last plan, shows what changed, and builds your new Plan of Attack. Costs 6 coins — you have {coins}.").replace("{coins}", String(coins))}
              confirmLabel={coins < DEEP_REVIEW_COST ? T("planReviewGetCoins", "Get coins in the Store") : T("planReviewConfirm", "Run re-review (6 coins)")}
              cancelLabel={T("planReviewNotNow", "Not now")}
              onConfirm={() => {
                setConfirmOpen(false);
                if (coins < DEEP_REVIEW_COST) {
                  navigate("/store");
                } else {
                  window.dispatchEvent(new CustomEvent("rayma:plan-review", { detail: { tone: status.tone } }));
                }
              }}
            />
          )}
        </>
      )}
    </div>
  );
}