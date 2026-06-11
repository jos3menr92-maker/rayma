import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, Save } from "lucide-react";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { supabase } from "@/lib/supabaseClient";

export default function AddLoan() {
  const navigate = useNavigate();
  const { userProfile, reload } = useFinancialData(); 
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    current_balance: "",
    interest_rate: "",
    monthly_payment: "", // We keep the DB column name, but treat it as "Amount per period"
    payment_frequency: "monthly", // 🚀 NEW: Our frequency selector
    due_day: ""
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      if (!userProfile?.id) throw new Error("You must be logged in to add a loan.");

      const { error } = await supabase.from('loans').insert([{
        user_id: userProfile.id,
        name: formData.name,
        current_balance: parseFloat(formData.current_balance) || 0,
        original_amount: parseFloat(formData.current_balance) || 0,
        interest_rate: parseFloat(formData.interest_rate) || 0,
        monthly_payment: parseFloat(formData.monthly_payment) || 0,
        payment_frequency: formData.payment_frequency, // 🚀 NEW: Saving the frequency
        due_day: parseInt(formData.due_day) || null,
        status: 'active'
      }]);

      if (error) {
        console.error("Supabase Insert Error:", error);
        throw error;
      }

      await reload();
      navigate("/");

    } catch (error) {
      console.error("Failed to add loan:", error);
      alert("Failed to save the loan. Please try again.");
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
        <h1 className="text-2xl font-bold font-heading text-foreground">Add New Loan</h1>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">Loan Name</label>
          <input 
            required 
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Chase Auto Loan" 
            className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Current Balance</label>
            <input 
              required 
              type="number"
              step="0.01"
              name="current_balance"
              value={formData.current_balance}
              onChange={handleChange}
              placeholder="$0.00" 
              className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-sm focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Interest Rate (%)</label>
            <input 
              type="number"
              step="0.01"
              name="interest_rate"
              value={formData.interest_rate}
              onChange={handleChange}
              placeholder="e.g. 5.5" 
              className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-sm focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
        </div>

        {/* 🚀 THE NEW FREQUENCY ROW */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Payment Amount</label>
            <input 
              required 
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
            <label className="text-sm font-semibold text-foreground">Frequency</label>
            <select 
              name="payment_frequency"
              value={formData.payment_frequency}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-sm focus:ring-2 focus:ring-primary/30 transition-all"
            >
              <option value="weekly">Weekly</option>
              <option value="bi-weekly">Bi-Weekly</option>
              <option value="semi-monthly">Semi-Monthly</option>
              <option value="monthly">Monthly</option>
              <option value="annually">Annually</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">Due Day (1-31)</label>
          <input 
            required 
            type="number"
            min="1"
            max="31"
            name="due_day"
            value={formData.due_day}
            onChange={handleChange}
            placeholder="e.g. 15" 
            className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-sm focus:ring-2 focus:ring-primary/30 transition-all"
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
              <Save className="w-5 h-5" /> Save Loan
            </>
          )}
        </button>
      </form>
    </div>
  );
}
