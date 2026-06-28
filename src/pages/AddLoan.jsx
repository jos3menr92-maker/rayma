import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { ChevronLeft, Save, AlertTriangle, Sparkles } from "lucide-react";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { supabase } from "@/lib/supabaseClient";

export default function AddLoan() {
  const navigate = useNavigate();
  const { userProfile, reload } = useFinancialData();
  const { lang } = useLanguage();

  // 🌍 FIXED: Recreate T() when lang changes so translations update in real-time
  const T = useMemo(() =>
    (key, fallback) => {
      const translated = t(lang, key);
      return translated !== key ? translated : fallback;
    },
    [lang]
  );

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(""); 

  const [formData, setFormData] = useState({
    name: "",
    original_amount: "", 
    current_balance: "", 
    interest_rate: "",
    monthly_payment: "", 
    payment_frequency: "monthly",
    total_payments: "", 
    due_date: ""
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      if (!userProfile?.id) throw new Error("Missing User ID: The app doesn't know who is logged in.");
      if (!supabase) throw new Error("Missing Supabase: The database client didn't load.");

      // 🧠 RAYMA INTERCEPT: Auto-filling the missing blanks
      let finalDueDate = formData.due_date;
      
      if (!finalDueDate) {
        const today = new Date();
        if (formData.payment_frequency === "weekly") today.setDate(today.getDate() + 7);
        else if (formData.payment_frequency === "bi-weekly") today.setDate(today.getDate() + 14);
        else today.setMonth(today.getMonth() + 1); // Default to exactly 1 month from today
        
        finalDueDate = today.toISOString().split('T')[0];
      }

      const { error } = await supabase.from('loans').insert([{
        user_id: userProfile.id,
        name: formData.name || "Unnamed Loan", // RAYMA fallback
        original_amount: parseFloat(formData.original_amount) || parseFloat(formData.current_balance) || 0, 
        current_balance: parseFloat(formData.current_balance) || 0,
        remaining_balance: parseFloat(formData.current_balance) || 0, 
        interest_rate: parseFloat(formData.interest_rate) || 0,
        monthly_payment: parseFloat(formData.monthly_payment) || 0,
        payment_frequency: formData.payment_frequency,
        total_payments: parseInt(formData.total_payments) || null,
        due_date: finalDueDate, // 🚀 Sending RAYMA's calculated date!
        status: 'active'
      }]);

      if (error) {
        console.error("Supabase Insert Error:", error);
        throw new Error(error.message); 
      }

      await reload();
      navigate("/");

    } catch (error) {
      console.error("Failed to add loan:", error);
      setErrorMsg(error.message || "Failed to save the loan."); 
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold font-heading text-foreground">{T("addNewLoan", "Add New Loan")}</h1>
      </motion.div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive font-medium">{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">{T("loanName", "Loan Name")}</label>
          {/* Removed required */}
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder={T("loanNameEx", "e.g. Chase Auto Loan")}
            className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">{T("originalAmount", "Original Amount")}</label>
            <input
              type="number"
              step="0.01"
              name="original_amount"
              value={formData.original_amount}
              onChange={handleChange}
              placeholder="$0.00"
              className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-sm focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">{T("currentAmountOwed", "Current Amount Owed")}</label>
            <input
              type="number"
              step="0.01"
              name="current_balance"
              value={formData.current_balance}
              onChange={handleChange}
              placeholder="$0.00"
              className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-sm focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">{T("paymentAmount", "Payment Amount")}</label>
            <input
              type="number"
              step="0.01"
              name="monthly_payment"
              value={formData.monthly_payment}
              onChange={handleChange}
              placeholder="$0.00"
              className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-sm focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground">{T("interestRate", "Interest Rate (%)")}</label>
              <Sparkles className="w-3 h-3 text-primary/50" />
            </div>
            <input
              type="number"
              step="0.01"
              name="interest_rate"
              value={formData.interest_rate}
              onChange={handleChange}
              placeholder={T("raymaWillCalculate", "RAYMA will calculate")}
              className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-sm focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-primary/40"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">{T("frequency", "Frequency")}</label>
            <select
              name="payment_frequency"
              value={formData.payment_frequency}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-sm focus:ring-2 focus:ring-primary/30 transition-all"
            >
              <option value="weekly">{T("weekly", "Weekly")}</option>
              <option value="bi-weekly">{T("biweekly", "Bi-Weekly")}</option>
              <option value="semi-monthly">{T("semiMonthly", "Semi-Monthly")}</option>
              <option value="monthly">{T("monthly", "Monthly")}</option>
              <option value="annually">{T("annually", "Annually")}</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground">{T("totalPayments", "Total # of Payments")}</label>
              <Sparkles className="w-3 h-3 text-primary/50" />
            </div>
            <input
              type="number"
              name="total_payments"
              value={formData.total_payments}
              onChange={handleChange}
              placeholder={T("raymaWillCalculate", "RAYMA will calculate")}
              className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-sm focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-primary/40"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-foreground">{T("nextDueDate", "Next Due Date")}</label>
            <Sparkles className="w-3 h-3 text-primary/50" />
          </div>
          {/* Removed required so RAYMA can fill it */}
          <input
            type="date"
            name="due_date"
            value={formData.due_date}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-sm text-muted-foreground focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-5 h-5" /> {T("saveLoan", "Save Loan")}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
