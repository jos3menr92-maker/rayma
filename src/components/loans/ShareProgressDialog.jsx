import { useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { base44 } from "@/api/base44Client";
import { simulateCascade } from "@/utils/payoffStrategies";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Link2, Copy, Check } from "lucide-react";

/**
 * ShareProgressDialog — lets the owner publish an anonymized snapshot of
 * their debt payoff journey (percent reduced, months remaining, strategy,
 * and optionally amounts) to a public /share/:slug page.
 */
export default function ShareProgressDialog({ open, onOpenChange, loans = [] }) {
  const T = useT();
  const { toast } = useToast();
  const { formatCurrency, currency } = useCurrency();

  const [existingId, setExistingId] = useState(null);
  const [shareSlug, setShareSlug] = useState(null);
  const [strategy, setStrategy] = useState("avalanche");
  const [showAmounts, setShowAmounts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  // Load the owner's existing share record (if any) when the dialog opens
  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      try {
        const me = await base44.auth.me();
        const mine = await base44.entities.DebtProgressShare.filter({ created_by_id: me.id });
        const rec = mine[0];
        if (alive && rec) {
          setExistingId(rec.id);
          setShareSlug(rec.share_slug);
          setStrategy(rec.strategy || "avalanche");
          setShowAmounts(!!rec.show_amounts);
          setLink(`${window.location.origin}/share/${rec.share_slug}`);
        }
      } catch (e) {
        // first-time sharers have no record yet
      }
    })();
    return () => { alive = false; };
  }, [open]);

  // Anonymized snapshot — same math brain as the Debt Payoff Simulator
  const stats = useMemo(() => {
    const activeLoans = loans.filter((l) => l.status !== "paid_off");
    const original = loans.reduce((s, l) => s + (l.original_amount || l.current_balance || 0), 0);
    const current = activeLoans.reduce((s, l) => s + (l.current_balance || l.remaining_balance || 0), 0);
    const percent = original > 0
      ? Math.min(Math.max(Math.round((1 - current / original) * 100), 0), 100)
      : 0;
    let months = activeLoans.length === 0 ? 0 : null;
    if (activeLoans.length > 0) {
      const sim = simulateCascade(activeLoans, { strategy, extraMonthly: 0, cascadeFreed: true });
      months = sim.monthsToDebtFree != null ? Math.ceil(sim.monthsToDebtFree) : null;
    }
    return { percent, months, original, current };
  }, [loans, strategy]);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      const slug =
        shareSlug ||
        (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

      const payload = {
        share_slug: slug,
        percent_reduced: stats.percent,
        months_remaining: stats.months,
        strategy,
        show_amounts: showAmounts,
        original_total: Math.round(stats.original),
        current_total: Math.round(stats.current),
        currency,
      };

      if (existingId) {
        await base44.entities.DebtProgressShare.update(existingId, payload);
      } else {
        const created = await base44.entities.DebtProgressShare.create(payload);
        setExistingId(created.id);
      }
      setShareSlug(slug);

      const url = `${window.location.origin}/share/${slug}`;
      setLink(url);
      setCopied(false);
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast({ title: T("shareLinkCopied", "Share link copied to clipboard") });
      } catch (e) {
        toast({ title: T("shareLinkLabel", "Your shareable link"), description: url });
      }
    } catch (err) {
      toast({ title: T("saveFailed", "Save failed"), description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch (e) {
      toast({ title: T("shareLinkLabel", "Your shareable link"), description: link });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{T("shareProgressTitle", "Share Your Debt Journey")}</DialogTitle>
          <DialogDescription>
            {T("shareProgressDesc", "Create a public, anonymized page with your payoff progress. No names or personal details are shown.")}
          </DialogDescription>
        </DialogHeader>

        {/* Live preview of what the public page will show */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-primary/5 border border-primary/20 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              {T("debtReducedLabel", "Debt Reduced")}
            </p>
            <p className="text-xl font-bold font-heading text-primary">{stats.percent}%</p>
          </div>
          <div className="rounded-2xl bg-card border border-border p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              {T("monthsRemainingLabel", "Months Remaining")}
            </p>
            <p className="text-xl font-bold font-heading text-foreground">
              {stats.months == null ? "—" : stats.months}
            </p>
          </div>
        </div>

        {/* Strategy picker */}
        <div>
          <p className="text-xs font-semibold text-foreground mb-1.5">{T("payoffStrategy", "Payoff Strategy")}</p>
          <div className="grid grid-cols-2 gap-2">
            {["avalanche", "snowball"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStrategy(s)}
                className={`rounded-2xl border p-3 text-left transition-all ${
                  strategy === s
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <p className="text-sm font-semibold text-foreground">{T(s, s === "avalanche" ? "Avalanche" : "Snowball")}</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  {T(s === "avalanche" ? "avalancheShortDesc" : "snowballShortDesc", "")}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Opt-in amounts toggle */}
        <div className="flex items-start justify-between gap-3 rounded-2xl bg-card border border-border p-3">
          <div>
            <p className="text-xs font-semibold text-foreground">{T("showAmountsLabel", "Show debt amounts on my public page")}</p>
            <p className="text-[10px] text-muted-foreground">
              {T("showAmountsHint", "Optional — your page works without amounts.")}
            </p>
          </div>
          <Switch checked={showAmounts} onCheckedChange={setShowAmounts} />
        </div>
        {showAmounts && (
          <p className="text-[11px] text-muted-foreground -mt-1">
            {T("startingDebt", "Starting Debt")}: {formatCurrency(stats.original)} · {T("currentDebt", "Current Debt")}: {formatCurrency(stats.current)}
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-60"
        >
          <Link2 className="w-4 h-4" />
          {saving
            ? T("saving", "Saving...")
            : existingId
              ? T("updateShareLink", "Update Share Link")
              : T("createShareLink", "Create Share Link")}
        </button>

        {link && (
          <div className="flex items-center gap-2">
            <p className="flex-1 truncate text-[11px] text-muted-foreground bg-muted rounded-lg px-2.5 py-2 border border-border">
              {link}
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 p-2 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors"
              aria-label={T("copyLink", "Copy Link")}
            >
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}