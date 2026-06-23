import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingDown, DollarSign, Calendar, Zap, ArrowDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
const fmtFull = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

function simulateLoan(balance, annualRate, monthlyPayment, extraPayment = 0) {
  const rate = annualRate / 100 / 12;
  let remaining = balance;
  let months = 0;
  let totalInterest = 0;
  const schedule = [];

  while (remaining > 0 && months < 600) {
    const interest = remaining * rate;
    const payment = Math.min(monthlyPayment + extraPayment, remaining + interest);
    const principal = payment - interest;
    remaining = Math.max(remaining - principal, 0);
    totalInterest += interest;
    months++;
    if (months <= 60 || months % 12 === 0) {
      schedule.push({ month: months, balance: Math.round(remaining), interest: Math.round(totalInterest) });
    }
    if (remaining <= 0) break;
  }
  return { months, totalInterest, schedule };
}

function calcAvalanche(loans) {
  return [...loans].sort((a, b) => (b.interest_rate || 0) - (a.interest_rate || 0));
}

function calcSnowball(loans) {
  return [...loans].sort((a, b) => (a.current_balance || 0) - (b.current_balance || 0));
}

export default function DebtPayoffSimulator() {
  const [loans, setLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [extraPayment, setExtraPayment] = useState(0);
  const [strategy, setStrategy] = useState("avalanche");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Loan.filter({ status: "active" }).then(data => {
      setLoans(data);
      if (data.length > 0) setSelectedLoan(data[0].id);
      setLoading(false);
    });
  }, []);

  const loan = loans.find(l => l.id === selectedLoan);
  const base = loan ? simulateLoan(loan.current_balance, loan.interest_rate || 0, loan.monthly_payment || 0, 0) : null;
  const boosted = loan ? simulateLoan(loan.current_balance, loan.interest_rate || 0, loan.monthly_payment || 0, extraPayment) : null;

  const monthsSaved = base && boosted ? Math.max(0, base.months - boosted.months) : 0;
  const interestSaved = base && boosted ? Math.max(0, base.totalInterest - boosted.totalInterest) : 0;

  const orderedLoans = strategy === "avalanche" ? calcAvalanche(loans) : calcSnowball(loans);

  const totalDebt = loans.reduce((s, l) => s + (l.current_balance || 0), 0);
  const totalMonthly = loans.reduce((s, l) => s + (l.monthly_payment || 0), 0);

  const chartData = boosted?.schedule.map((s, i) => ({
    month: s.month,
    "With Extra": s.balance,
    "Baseline": base?.schedule[i]?.balance ?? s.balance,
  })) || [];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Debt Payoff Simulator</h1>
        <p className="text-sm text-muted-foreground">Visualize how extra payments accelerate your debt freedom</p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading loans...</div>
      ) : loans.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <TrendingDown className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">No active loans found. Add loans to use the simulator.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="single">
          <TabsList className="grid w-full grid-cols-2 bg-secondary">
            <TabsTrigger value="single">Single Loan</TabsTrigger>
            <TabsTrigger value="strategy">Payoff Strategy</TabsTrigger>
          </TabsList>

          {/* Single Loan Simulator */}
          <TabsContent value="single" className="space-y-4 mt-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label>Select Loan</Label>
                  <Select value={selectedLoan} onValueChange={setSelectedLoan}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {loans.map(l => <SelectItem key={l.id} value={l.id}>{l.name} — {fmtFull(l.current_balance)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {loan && (
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="bg-secondary rounded-lg p-2 text-center"><p className="text-muted-foreground text-xs">Balance</p><p className="font-bold text-foreground">{fmt(loan.current_balance)}</p></div>
                    <div className="bg-secondary rounded-lg p-2 text-center"><p className="text-muted-foreground text-xs">Rate</p><p className="font-bold text-foreground">{loan.interest_rate || 0}%</p></div>
                    <div className="bg-secondary rounded-lg p-2 text-center"><p className="text-muted-foreground text-xs">Payment</p><p className="font-bold text-foreground">{fmt(loan.monthly_payment)}/mo</p></div>
                  </div>
                )}
                <div>
                  <Label>Extra Monthly Payment: <span className="text-primary font-bold">{fmt(extraPayment)}</span></Label>
                  <Slider className="mt-2" min={0} max={1000} step={25} value={[extraPayment]} onValueChange={([v]) => setExtraPayment(v)} />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>$0</span><span>$1,000</span></div>
                </div>
              </CardContent>
            </Card>

            {base && boosted && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Card className="bg-card border-primary/30 border">
                    <CardContent className="p-4 text-center">
                      <Zap className="w-5 h-5 text-primary mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Months Saved</p>
                      <p className="text-2xl font-bold text-primary">{monthsSaved}</p>
                      <p className="text-xs text-muted-foreground">months earlier</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-green-500/30 border">
                    <CardContent className="p-4 text-center">
                      <DollarSign className="w-5 h-5 text-green-400 mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Interest Saved</p>
                      <p className="text-2xl font-bold text-green-400">{fmt(interestSaved)}</p>
                      <p className="text-xs text-muted-foreground">total savings</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Card className="bg-card border-border">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">Without Extra Payment</p>
                      <p className="font-semibold text-foreground">{base.months} months</p>
                      <p className="text-muted-foreground text-xs">{fmt(base.totalInterest)} in interest</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-primary/30 border">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">With +{fmt(extraPayment)}/mo</p>
                      <p className="font-semibold text-primary">{boosted.months} months</p>
                      <p className="text-primary text-xs">{fmt(boosted.totalInterest)} in interest</p>
                    </CardContent>
                  </Card>
                </div>

                {chartData.length > 1 && (
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm text-muted-foreground">Balance Over Time</CardTitle></CardHeader>
                    <CardContent className="px-2 pb-4">
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} label={{ value: "Months", position: "insideBottom", offset: -2, fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(v) => fmt(v)} contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                          <Line type="monotone" dataKey="Baseline" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" dot={false} />
                          <Line type="monotone" dataKey="With Extra" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
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
            <Card className="bg-card border-border">
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">Total Debt</p><p className="font-bold text-foreground">{fmt(totalDebt)}</p></div>
                  <div className="bg-secondary rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">Monthly Payments</p><p className="font-bold text-foreground">{fmt(totalMonthly)}</p></div>
                </div>
                <div>
                  <Label>Strategy</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button onClick={() => setStrategy("avalanche")} className={`p-3 rounded-lg border text-left text-sm transition-colors ${strategy === "avalanche" ? "border-primary bg-primary/10" : "border-border bg-secondary"}`}>
                      <p className="font-semibold text-foreground">Avalanche</p>
                      <p className="text-xs text-muted-foreground">Pay highest interest first — saves most money</p>
                    </button>
                    <button onClick={() => setStrategy("snowball")} className={`p-3 rounded-lg border text-left text-sm transition-colors ${strategy === "snowball" ? "border-primary bg-primary/10" : "border-border bg-secondary"}`}>
                      <p className="font-semibold text-foreground">Snowball</p>
                      <p className="text-xs text-muted-foreground">Pay smallest balance first — builds momentum</p>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recommended Order</h3>
              {orderedLoans.map((l, i) => {
                const sim = simulateLoan(l.current_balance, l.interest_rate || 0, l.monthly_payment || 0);
                return (
                  <Card key={l.id} className={`bg-card border-border ${i === 0 ? "border-primary/40" : ""}`}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{i + 1}</div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground text-sm">{l.name}</p>
                        <p className="text-xs text-muted-foreground">{fmt(l.current_balance)} · {l.interest_rate || 0}% APR · {sim.months}mo to payoff</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Interest</p>
                        <p className="text-sm font-semibold text-destructive">{fmt(sim.totalInterest)}</p>
                      </div>
                      {i === 0 && <Badge className="bg-primary/20 text-primary border-0 text-xs">Focus Here</Badge>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}