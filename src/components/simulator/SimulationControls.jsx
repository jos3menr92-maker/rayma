import { motion } from "framer-motion";
import { useMemo } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { Sliders } from "lucide-react";

const SCENARIOS = [
  { id: "ai_optimize", labelKey: "scenarioAiOptimize", emoji: "🤖", descKey: "aiOptimizeShort" },
  { id: "extra_payment", labelKey: "scenarioExtraPayment", emoji: "💸", descKey: "extraPaymentShort" },
  { id: "cut_bills", labelKey: "scenarioCutBills", emoji: "✂️", descKey: "cutBillsShort" },
  { id: "debt_avalanche", labelKey: "avalanche", emoji: "🏔️", descKey: "avalancheShort" },
  { id: "debt_snowball", labelKey: "snowball", emoji: "⛄", descKey: "snowballShort" },
  { id: "income_boost", labelKey: "scenarioIncomeBoost", emoji: "📈", descKey: "incomeBoostShort" },
];

export default function SimulationControls({
  scenario, setScenario,
  extraPayment, setExtraPayment,
  billCutPercent, setBillCutPercent,
  loans, bills, incomes,
}) {
  const { formatCurrency: fmt } = useCurrency();
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const monthlyBills = bills.reduce((s, b) => s + (b.amount || 0), 0);
  const monthlyLoans = loans.reduce((s, l) => s + (l.monthly_payment || 0), 0);
  const avgWeeklyIncome = incomes.length > 0 ? incomes.reduce((s, i) => s + (i.amount || 0), 0) / incomes.length : 0;
  const monthlyIncome = avgWeeklyIncome * 4.33;

  return (
    <div className="mb-5 space-y-4">
      {/* Current Snapshot */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5" /> {T("currentSnapshot", "Current Snapshot")}
        </p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-base font-bold font-heading text-primary">{fmt(monthlyIncome)}</p>
            <p className="text-[10px] text-muted-foreground">{T("monthlyIncome", "Monthly Income")}</p>
          </div>
          <div>
            <p className="text-base font-bold font-heading text-destructive">{fmt(monthlyLoans + monthlyBills)}</p>
            <p className="text-[10px] text-muted-foreground">{T("monthlyExpensesLabel", "Monthly Expenses")}</p>
          </div>
          <div>
            <p className={`text-base font-bold font-heading ${monthlyIncome - monthlyLoans - monthlyBills >= 0 ? "text-primary" : "text-destructive"}`}>
              {fmt(monthlyIncome - monthlyLoans - monthlyBills)}
            </p>
            <p className="text-[10px] text-muted-foreground">{T("cashFlow", "Cash Flow")}</p>
          </div>
        </div>
      </div>

      {/* Scenario Selector */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{T("chooseScenario", "Choose a Scenario")}</p>
        <div className="grid grid-cols-2 gap-2">
          {SCENARIOS.map((s) => (
            <motion.button
              key={s.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setScenario(s.id)}
              className={`text-left p-3 rounded-xl border transition-all ${
                scenario === s.id
                  ? "bg-primary/10 border-primary text-foreground"
                  : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <span className="text-lg block mb-1">{s.emoji}</span>
              <p className="text-xs font-semibold leading-tight">{T(s.labelKey, s.labelKey)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{T(s.descKey, s.descKey)}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Extra Payment Slider */}
      {scenario === "extra_payment" && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-semibold text-foreground">{T("extraMonthlyPayment", "Extra Monthly Payment")}</p>
            <span className="text-sm font-bold text-primary">{fmt(extraPayment)}</span>
          </div>
          <input
            type="range" min={25} max={1000} step={25}
            value={extraPayment}
            onChange={(e) => setExtraPayment(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>$25</span><span>$1,000</span>
          </div>
        </motion.div>
      )}

      {/* Bill Cut Slider */}
      {scenario === "cut_bills" && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-semibold text-foreground">{T("billReductionTarget", "Bill Reduction Target")}</p>
            <span className="text-sm font-bold text-primary">{billCutPercent}%</span>
          </div>
          <input
            type="range" min={5} max={50} step={5}
            value={billCutPercent}
            onChange={(e) => setBillCutPercent(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>5%</span><span>50%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {T("potentialMonthlySavings", "Potential monthly savings:")} <span className="text-primary font-semibold">{fmt(monthlyBills * billCutPercent / 100)}</span>
          </p>
        </motion.div>
      )}
    </div>
  );
}