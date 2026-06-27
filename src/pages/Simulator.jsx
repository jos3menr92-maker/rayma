import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Play, TrendingDown, TrendingUp, DollarSign, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import SimulationResults from "../components/simulator/SimulationResults";
import SimulationControls from "../components/simulator/SimulationControls";

const fmt = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);

export default function Simulator() {
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const [loans, setLoans] = useState([]);
  const [bills, setBills] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState(null);
  const [scenario, setScenario] = useState("ai_optimize");
  const [extraPayment, setExtraPayment] = useState(100);
  const [billCutPercent, setBillCutPercent] = useState(20);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [l, b, i] = await Promise.all([
      base44.entities.Loan.list("-created_date", 100),
      base44.entities.Bill.list("-created_date", 100),
      base44.entities.WeeklyIncome.list("-week_start", 52),
    ]);
    setLoans(l.filter(x => x.status !== "paid_off"));
    setBills(b.filter(x => x.is_active !== false));
    setIncomes(i);
    setLoading(false);
  }

  async function runSimulation() {
    setSimulating(true);
    setResult(null);

    const monthlyBills = bills.reduce((s, b) => s + (b.amount || 0), 0);
    const monthlyLoans = loans.reduce((s, l) => s + (l.monthly_payment || 0), 0);
    const avgWeeklyIncome = incomes.length > 0 ? incomes.reduce((s, i) => s + (i.amount || 0), 0) / incomes.length : 0;
    const monthlyIncome = avgWeeklyIncome * 4.33;
    const totalDebt = loans.reduce((s, l) => s + (l.current_balance || 0), 0);
    const highestInterestLoan = [...loans].sort((a, b) => (b.interest_rate || 0) - (a.interest_rate || 0))[0];
    const subscriptions = bills.filter(b => b.category === "subscriptions");

    const scenarioDescriptions = {
      ai_optimize: T("aiOptimizeDesc", "AI-optimized strategy: find cheaper bills, extra debt payments, and best payoff order"),
      extra_payment: T("extraPaymentDesc", `Adding $${extraPayment}/month extra to highest-interest loan`),
      cut_bills: T("cutBillsDesc", `Reducing all bills by ${billCutPercent}% (finding cheaper alternatives)`),
      debt_avalanche: T("avalancheDesc", "Debt avalanche method: pay minimums on all, maximum extra on highest interest"),
      debt_snowball: T("snowballDesc", "Debt snowball method: pay minimums on all, maximum extra on smallest balance"),
      income_boost: T("incomeBoostDesc", "Increasing income by 10% (side income / raise scenario)"),
    };

    const prompt = `You are a financial simulation engine. Analyze this user's finances and run the requested simulation scenario. Be specific with numbers.

CURRENT FINANCIAL DATA:
- Monthly income: ${fmt(monthlyIncome)} (from weekly average)
- Monthly loan payments: ${fmt(monthlyLoans)}
- Monthly bills: ${fmt(monthlyBills)}
- Total remaining debt: ${fmt(totalDebt)}
- Monthly cash flow: ${fmt(monthlyIncome - monthlyLoans - monthlyBills)}
- Highest interest loan: ${highestInterestLoan ? `${highestInterestLoan.name} at ${highestInterestLoan.interest_rate || 0}% APR, balance ${fmt(highestInterestLoan.current_balance)}` : "none"}
- Active subscriptions: ${subscriptions.length > 0 ? subscriptions.map(s => `${s.name} $${s.amount}/mo`).join(", ") : "none"}
- All loans: ${loans.map(l => `${l.name}: balance ${fmt(l.current_balance)}, ${l.interest_rate || 0}% APR, ${fmt(l.monthly_payment)}/mo`).join(" | ")}
- All bills: ${bills.map(b => `${b.name}: $${b.amount}/mo (${b.category})`).join(" | ")}

SIMULATION SCENARIO: ${scenarioDescriptions[scenario]}
Extra monthly payment (if relevant): $${extraPayment}
Bill cut percentage (if relevant): ${billCutPercent}%

Run the simulation and return a detailed analysis. Calculate:
1. New monthly cash flow after the scenario
2. Total interest saved over the life of loans
3. How many months faster loans are paid off
4. Specific actionable recommendations (e.g., which specific subscriptions could be replaced and with what cheaper alternatives, exact dollar savings)
5. Year 1 savings, Year 3 savings, Year 5 savings projections
6. A "simulation timeline" showing key milestones (e.g., "Month 8: Car loan paid off", "Month 14: Student loan paid off")

Be specific, reference the user's actual loan names and bill names. Make it feel personalized.`;

    const simResult = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: "claude_sonnet_4_6",
      response_json_schema: {
        type: "object",
        properties: {
          scenario_name: { type: "string" },
          summary: { type: "string" },
          current_monthly_cashflow: { type: "number" },
          new_monthly_cashflow: { type: "number" },
          monthly_savings: { type: "number" },
          total_interest_saved: { type: "number" },
          months_saved: { type: "number" },
          year1_savings: { type: "number" },
          year3_savings: { type: "number" },
          year5_savings: { type: "number" },
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                monthly_impact: { type: "number" },
                emoji: { type: "string" },
              }
            }
          },
          timeline: {
            type: "array",
            items: {
              type: "object",
              properties: {
                month: { type: "number" },
                milestone: { type: "string" },
                amount_saved: { type: "number" },
              }
            }
          },
          risk_level: { type: "string", enum: ["low", "medium", "high"] },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        }
      }
    });

    setResult(simResult);
    setSimulating(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-foreground">{T("financialSimulator", "Financial Simulator")}</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6 ml-12">{T("simulatorSubtitle", "See how different scenarios could change your future")}</p>

        <SimulationControls
          scenario={scenario}
          setScenario={setScenario}
          extraPayment={extraPayment}
          setExtraPayment={setExtraPayment}
          billCutPercent={billCutPercent}
          setBillCutPercent={setBillCutPercent}
          loans={loans}
          bills={bills}
          incomes={incomes}
        />

        <Button
          onClick={runSimulation}
          disabled={simulating || loans.length === 0}
          className="w-full rounded-2xl h-12 text-base font-semibold shadow-lg shadow-primary/20 mb-6"
        >
          {simulating ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              {T("runningSimulation", "Running simulation...")}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Play className="w-4 h-4" /> {T("runSimulation", "Run Simulation")}
            </span>
          )}
        </Button>

        {simulating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Zap className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <p className="text-sm font-medium text-foreground">{T("aiAnalyzing", "AI is analyzing your finances…")}</p>
            <p className="text-xs text-muted-foreground mt-1">{T("calculatingProjections", "Calculating projections and recommendations")}</p>
          </motion.div>
        )}

        <AnimatePresence>
          {result && <SimulationResults result={result} onRerun={() => { setResult(null); runSimulation(); }} />}
        </AnimatePresence>

        {loans.length === 0 && (
          <div className="text-center py-8 bg-card border border-border rounded-2xl">
            <p className="text-sm text-muted-foreground">{T("addLoansFirst", "Add some loans first to run simulations.")}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}