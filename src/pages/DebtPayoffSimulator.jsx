import { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { t } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingDown, DollarSign, Zap, AlertTriangle } from "lucide-react";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { simulateWithExtra, monthlyObligation, periodsToMonths } from "@/utils/loanEngine";
import StrategyTab from "@/components/simulator/StrategyTab";

export default function DebtPayoffSimulator() {
  const { lang } = useLanguage();
  const { formatCurrency: fmt, formatCurrencyValue: fmtFull, formatCurrencyNoDecimal } = useCurrency();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const { loans: allLoans } = useFinancialData();
  const [loans, setLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [extraPayment, setExtraPayment] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const active = allLoans.filter(l => l.status !== "paid_off");
    setLoans(active);
    if (active.length > 0) setSelectedLoan(active[0].id);
    setLoading(false);
  }, [allLoans]);

  // Chart series names must match the Line dataKeys exactly (i18n-safe)
  const seriesWithExtra = T("withExtraLabel", "With Extra");
  const seriesBaseline = T("baselineLabel", "Baseline");

  const loan = loans.find(l => l.id === selectedLoan);
  const loanFreq = loan?.payment_frequency || "monthly";
  const base = loan ? simulateWithExtra(loan, 0) : null;
  const boosted = loan ? simulateWithExtra(loan, extraPayment) : null;

  // Marketing KPI — 'debt_simulator_run': fires once when the first
  // simulation result is computed on the page (once per visit with loans).
  const trackedInitialRun = useRef(false);
  useEffect(() => {
    if (base && boosted && !trackedInitialRun.current) {
      trackedInitialRun.current = true;
      base44.analytics.track({ eventName: "debt_simulator_run" });
    }
  }, [base, boosted]);

  const monthsSaved = base && boosted && base.months && boosted.months
    ? Math.max(0, Math.round(periodsToMonths(base.months - boosted.months, loanFreq)))
    : 0;
  const interestSaved = base && boosted ? Math.max(0, (base.totalInterest || 0) - (boosted.totalInterest || 0)) : 0;

  // Chart series keyed by calendar MONTH (never by array index) — the two sims
  // sample every 12 periods but end at different times, so index pairing
  // misaligned the baseline's final point. Carry-forward keeps each line
  // honest until its own end.
  const chartData = (() => {
    if (!boosted?.schedule?.length || !base?.schedule?.length) return [];
    const toMonth = (p) => Math.round(periodsToMonths(p, loanFreq));
    const baseByMonth = new Map(base.schedule.map((s) => [toMonth(s.period), s.balance]));
    const boostByMonth = new Map(boosted.schedule.map((s) => [toMonth(s.period), s.balance]));
    const months = [...new Set([...baseByMonth.keys(), ...boostByMonth.keys()])].sort((a, b) => a - b);
    let lastBase = null;
    let lastBoost = null;
    return months.map((m) => {
      if (baseByMonth.has(m)) lastBase = baseByMonth.get(m);
      if (boostByMonth.has(m)) lastBoost = boostByMonth.get(m);
      return { month: m, [seriesWithExtra]: lastBoost, [seriesBaseline]: lastBase };
    });
  })();

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">{T("debtPayoffSimulator", "Debt Payoff Simulator")}</h1>
        <p className="text-sm text-muted-foreground">{T("simulatorSubtitle", "Visualize how extra payments accelerate your debt freedom")}</p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">{T("loadingLoans", "Loading loans...")}</div>
      ) : loans.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <TrendingDown className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">{T("noActiveLoans", "No active loans found. Add loans to use the simulator.")}</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="single">
          <TabsList className="grid w-full grid-cols-2 bg-secondary">
            <TabsTrigger value="single">{T("singleLoan", "Single Loan")}</TabsTrigger>
            <TabsTrigger value="strategy">{T("payoffStrategy", "Payoff Strategy")}</TabsTrigger>
          </TabsList>

          {/* Single Loan Simulator */}
          <TabsContent value="single" className="space-y-4 mt-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label>{T("selectLoan", "Select Loan")}</Label>
                  <Select value={selectedLoan} onValueChange={(v) => { setSelectedLoan(v); base44.analytics.track({ eventName: "debt_simulator_run" }); }}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {loans.map(l => <SelectItem key={l.id} value={l.id}>{l.name} — {fmtFull(l.current_balance)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {loan && (
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="bg-secondary rounded-lg p-2 text-center"><p className="text-muted-foreground text-xs">{T("balance", "Balance")}</p><p className="font-bold text-foreground">{fmt(loan.current_balance)}</p></div>
                    <div className="bg-secondary rounded-lg p-2 text-center"><p className="text-muted-foreground text-xs">{T("rate", "Rate")}</p><p className="font-bold text-foreground">{loan.interest_rate || 0}%</p></div>
                    <div className="bg-secondary rounded-lg p-2 text-center"><p className="text-muted-foreground text-xs">{T("payment", "Payment")}</p><p className="font-bold text-foreground">{fmt(monthlyObligation(loan))}/mo</p></div>
                  </div>
                )}
                <div>
                  <Label>{T("extraMonthlyPayment", "Extra Monthly Payment")}: <span className="text-primary font-bold">{fmt(extraPayment)}</span></Label>
                  <Slider className="mt-2" min={0} max={1000} step={25} value={[extraPayment]} onValueChange={([v]) => setExtraPayment(v)} onValueCommit={() => base44.analytics.track({ eventName: "debt_simulator_run" })} />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>{fmt(0)}</span><span>{fmt(1000)}</span></div>
                </div>
              </CardContent>
            </Card>

            {(base?.warning || boosted?.warning) && (
              <Card className="bg-card border-destructive/40 border">
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-destructive text-sm">{T("paymentTooLowTitle", "This payment can't cover the interest")}</p>
                    <p className="text-xs text-muted-foreground mt-1">{T("paymentTooLowSimDesc", "Interest is growing faster than the balance is coming down. Raise the extra payment — or the loan's regular payment — to see a payoff path.")}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {base && boosted && !base.warning && !boosted.warning && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Card className="bg-card border-primary/30 border">
                    <CardContent className="p-4 text-center">
                      <Zap className="w-5 h-5 text-primary mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">{T("monthsSaved", "Months Saved")}</p>
                      <p className="text-2xl font-bold text-primary">{monthsSaved}</p>
                      <p className="text-xs text-muted-foreground">{T("monthsEarlier", "months earlier")}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-green-500/30 border">
                    <CardContent className="p-4 text-center">
                      <DollarSign className="w-5 h-5 text-green-400 mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">{T("interestSaved", "Interest Saved")}</p>
                      <p className="text-2xl font-bold text-green-400">{fmt(interestSaved)}</p>
                      <p className="text-xs text-muted-foreground">{T("totalSavings", "total savings")}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Card className="bg-card border-border">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">{T("withoutExtraPayment", "Without Extra Payment")}</p>
                      <p className="font-semibold text-foreground">{base.months ? Math.round(periodsToMonths(base.months, loanFreq)) : T("never", "Never")} {base.months ? T("months", "months") : ""}</p>
                      <p className="text-muted-foreground text-xs">{fmt(base.totalInterest || 0)} {T("inInterest", "in interest")}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-primary/30 border">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">{T("withExtra", "With")} +{fmt(extraPayment)}/mo</p>
                      <p className="font-semibold text-primary">{boosted.months ? Math.round(periodsToMonths(boosted.months, loanFreq)) : T("never", "Never")} {boosted.months ? T("months", "months") : ""}</p>
                      <p className="text-primary text-xs">{fmt(boosted.totalInterest || 0)} {T("inInterest", "in interest")}</p>
                    </CardContent>
                  </Card>
                </div>

                {chartData.length > 1 && (
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm text-muted-foreground">{T("balanceOverTime", "Balance Over Time")}</CardTitle></CardHeader>
                    <CardContent className="px-2 pb-4">
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} label={{ value: T("monthsAxisLabel", "Months"), position: "insideBottom", offset: -2, fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => formatCurrencyNoDecimal(v)} width={48} />
                          <Tooltip formatter={(v) => fmt(v)} contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                          <Line type="monotone" dataKey={seriesBaseline} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" dot={false} />
                          <Line type="monotone" dataKey={seriesWithExtra} stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Strategy Tab */}
          <TabsContent value="strategy" className="space-y-4 mt-4">
            <StrategyTab loans={loans} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}