import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClientFrontend";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { useCurrency } from "@/hooks/useCurrency";
import { useT } from "@/lib/LanguageContext";
import { motion } from "framer-motion";
import { Store, TrendingDown, Receipt, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function MerchantAnalytics() {
  const T = useT();
  const { formatCurrency: fmt } = useCurrency();
  const { supaUser } = useFinancialData();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");

  const fetchTransactions = async () => {
    setLoading(true);
    try {
    const uid = supaUser?.id;
    let query = supabase.from('transactions').select('*').eq('user_id', uid).order('date', { ascending: false });

    if (period === "month") {
      const start = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");
      query = query.gte('date', start);
    } else if (period === "3months") {
      const start = format(new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1), "yyyy-MM-dd");
      query = query.gte('date', start);
    }

    const { data, error } = await query;
    if (error) throw error;
    setTransactions(data || []);
    setLoading(false);
  } catch (err) {
    console.error("Error fetching transactions:", err.message);
    toast({ title: T("loadFailed", "Failed to load transactions"), description: err.message, variant: "destructive" });
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    if (!supaUser?.id) return;
    fetchTransactions();
  }, [supaUser?.id, period]);

  // 🔄 Realtime: reload when transactions change
  useSupabaseRealtime(['transactions'], fetchTransactions, [supaUser?.id, period]);

  const merchantData = useMemo(() => {
    const expenses = transactions.filter(t => t.amount < 0);
    const grouped = {};
    expenses.forEach(t => {
      const merchant = t.description?.trim() || T("unknown", "Unknown");
      if (!grouped[merchant]) grouped[merchant] = { name: merchant, total: 0, count: 0, category: t.category };
      grouped[merchant].total += Math.abs(t.amount);
      grouped[merchant].count += 1;
    });
    return Object.values(grouped).sort((a, b) => b.total - a.total);
  }, [transactions, T]);

  const topMerchants = merchantData.slice(0, 10);
  const totalSpending = merchantData.reduce((s, m) => s + m.total, 0);
  const avgPerMerchant = merchantData.length > 0 ? totalSpending / merchantData.length : 0;
  const chartData = topMerchants.map(m => ({
    name: m.name.length > 12 ? m.name.slice(0, 12) + "…" : m.name,
    total: m.total
  }));

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground mb-1">{T("merchantInsights", "Merchant Insights")}</h1>
            <p className="text-sm text-muted-foreground">{T("merchantInsightsDesc", "See where your money goes by merchant")}</p>
          </div>
          <Store className="w-6 h-6 text-primary mt-1" />
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5 p-1 bg-muted/50 rounded-xl border border-border/50">
          {[
            { key: "month", label: T("thisMonth", "This Month") },
            { key: "3months", label: T("last3Months", "Last 3 Months") },
            { key: "all", label: T("allTime", "All Time") },
          ].map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`py-2 rounded-lg text-xs font-medium transition-all ${period === p.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-card border border-border rounded-2xl p-3 text-center">
            <Store className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{T("merchants", "Merchants")}</p>
            <p className="text-base font-bold text-foreground">{merchantData.length}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-3 text-center">
            <TrendingDown className="w-4 h-4 text-destructive mx-auto mb-1" />
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{T("totalSpent", "Total Spent")}</p>
            <p className="text-base font-bold text-foreground">{fmt(totalSpending)}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-3 text-center">
            <Receipt className="w-4 h-4 text-accent mx-auto mb-1" />
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{T("avgPerMerchant", "Avg/Merchant")}</p>
            <p className="text-base font-bold text-foreground">{fmt(avgPerMerchant)}</p>
          </div>
        </div>

        {chartData.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4 mb-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">{T("topMerchants", "Top Merchants")}</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">{T("allMerchants", "All Merchants")}</h2>
          {merchantData.length === 0 ? (
            <div className="text-center py-10 bg-card border border-border rounded-2xl">
              <Receipt className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{T("noMerchantData", "No spending data for this period")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {merchantData.map((m, i) => (
                <div key={i} className="flex items-center justify-between bg-card border border-border rounded-2xl p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.count} {T("transactions", "transactions")} · {m.category}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-foreground shrink-0">{fmt(m.total)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}