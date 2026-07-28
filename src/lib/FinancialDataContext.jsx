import { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { supabase } from "./supabaseClientFrontend";
import { toast } from "@/components/ui/use-toast";

const FinancialDataContext = createContext(null);

export function FinancialDataProvider({ children }) {
  const [loans, setLoans] = useState([]);
  const [bills, setBills] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [payments, setPayments] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // 🚀 Existing global containers
  const [assets, setAssets] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);

  // ✅ NEW: Global split transaction container
  const [transactionSplits, setTransactionSplits] = useState([]);

  const [userProfile, setUserProfile] = useState(null);
  const [supaUser, setSupaUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    let isMounted = true;
    setLoading(true);

    try {
      const [me, { data: { session } }] = await Promise.all([
        base44.auth.me().catch(() => null),
        supabase.auth.getSession()
      ]);

      const currentSupaUser = session?.user || null;

      if (isMounted) {
        setUserProfile(me || null);
        setSupaUser(currentSupaUser);
      }

      if (!currentSupaUser?.id) {
        if (isMounted) {
          setLoans([]);
          setBills([]);
          setIncomes([]);
          setPayments([]);
          setTransactions([]);
          setAssets([]);
          setSavingsGoals([]);
          setTransactionSplits([]);
          setLoading(false);
        }
        return;
      }

      const uid = currentSupaUser.id;

      // ✅ NEW: Include transaction_splits in global fetch pipeline
      const [
        loansRes,
        billsRes,
        incomesRes,
        paymentsRes,
        transactionsRes,
        assetsRes,
        savingsRes,
        splitsRes,
        profileRes
      ] = await Promise.all([
        supabase.from("loans").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
        supabase.from("bills").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
        supabase.from("incomes").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
        supabase.from("payments").select("*").eq("user_id", uid).order("payment_date", { ascending: false }),
        supabase.from("transactions").select("*").eq("user_id", uid).order("date", { ascending: false }),
        supabase.from("assets").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
        supabase.from("savings_goals").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
        supabase.from("transaction_splits").select("*").eq("user_id", uid).order("date", { ascending: false }),
        supabase.from("profiles").select("*").eq("id", uid).single()
      ]);

      if (!isMounted) return;

      setLoans(loansRes.data || []);
      setBills(billsRes.data || []);
      setIncomes(incomesRes.data || []);
      setPayments(paymentsRes.data || []);
      setTransactions(transactionsRes.data || []);
      setAssets(assetsRes.data || []);
      setSavingsGoals(savingsRes.data || []);
      setTransactionSplits(splitsRes.data || []);

      // ✅ Unify profile: merge Supabase profile (tokens, energy_bars) with Base44 user
      // Only override with non-null Supabase values — prevents null columns from
      // hiding token updates made on the Base44 User (e.g. after promo redemption)
      const supaProfile = profileRes.data || {};
      const mergedLoad = { ...me };
      for (const [key, value] of Object.entries(supaProfile)) {
        if (value !== null && value !== undefined) mergedLoad[key] = value;
      }
      setUserProfile(mergedLoad);
    } catch (e) {
      console.error("Failed to load financial data:", e);
      toast({
        title: "Connection Error",
        description: "Could not sync latest data. Check connection.",
        variant: "destructive"
      });
    } finally {
      if (isMounted) setLoading(false);
    }
  }

  async function refreshUserProfile() {
    try {
      const [me, { data: { session } }] = await Promise.all([
        base44.auth.me().catch(() => null),
        supabase.auth.getSession()
      ]);
      const uid = session?.user?.id;
      let supaProfile = {};
      if (uid) {
        const { data } = await supabase.from("profiles").select("*").eq("id", uid).single();
        supaProfile = data || {};
      }
      const merged = { ...me };
      for (const [key, value] of Object.entries(supaProfile)) {
        if (value !== null && value !== undefined) merged[key] = value;
      }
      setUserProfile(merged);
      setSupaUser(session?.user || null);
      return merged;
    } catch (e) {
      console.error("Failed to refresh user profile:", e);
      return null;
    }
  }

  async function payBill(bill, paymentAmount, paymentDate = new Date().toISOString().split("T")[0]) {
    if (!supaUser?.id) return;
    const prevBills = [...bills];
    const prevPayments = [...payments];

    setBills(prev => prev.map(b => (b.id === bill.id ? { ...b, last_paid_date: paymentDate } : b)));

    try {
      const { data, error } = await supabase.from("payments").insert({
        bill_id: bill.id,
        amount: paymentAmount,
        payment_date: paymentDate,
        payment_type: "bill",
        user_id: supaUser.id
      }).select();

      if (error) throw error;
      if (data?.[0]) setPayments(prev => [data[0], ...prev]);
    } catch (e) {
      setBills(prevBills);
      setPayments(prevPayments);
      toast({ title: "Payment failed", description: e.message, variant: "destructive" });
    }
  }

  async function updateLoan(loanId, updates) {
    if (!supaUser?.id) return;
    const prevLoans = [...loans];
    setLoans(prev => prev.map(l => (l.id === loanId ? { ...l, ...updates } : l)));

    try {
      const { error } = await supabase.from("loans").update(updates).eq("id", loanId).eq("user_id", supaUser.id);
      if (error) throw error;
    } catch (e) {
      setLoans(prevLoans);
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  }

  async function addTransaction(transactionData) {
    if (!supaUser?.id) return;
    const tempId = `temp_${Date.now()}`;
    const optimisticRecord = { ...transactionData, id: tempId, created_at: new Date().toISOString(), user_id: supaUser.id };

    setPayments(prev => [optimisticRecord, ...prev]);

    try {
      const { data, error } = await supabase.from("payments").insert({
        ...transactionData,
        user_id: supaUser.id
      }).select();

      if (error) throw error;
      setPayments(prev => prev.map(p => (p.id === tempId ? data[0] : p)));
    } catch (e) {
      setPayments(prev => prev.filter(p => p.id !== tempId));
      toast({ title: "Failed to add transaction", description: e.message, variant: "destructive" });
    }
  }

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setSupaUser(session?.user || null);
        loadAll();
      } else if (event === "SIGNED_OUT") {
        setSupaUser(null);
        setLoans([]);
        setBills([]);
        setIncomes([]);
        setPayments([]);
        setTransactions([]);
        setAssets([]);
        setSavingsGoals([]);
        setTransactionSplits([]);
      }
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 📡 Supabase Realtime — reload when any financial table changes (multi-device sync, agent writes, webhook updates)
  useEffect(() => {
    const tables = ["loans", "bills", "incomes", "payments", "transactions", "assets", "savings_goals", "transaction_splits", "profiles"];
    const channel = supabase
      .channel("financial-data-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "loans" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "bills" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "incomes" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "assets" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "savings_goals" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "transaction_splits" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "bank_accounts" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "budget_categories" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "arcade_scores" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "net_worth_snapshots" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => refreshUserProfile())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <FinancialDataContext.Provider
      value={{
        loans,
        bills,
        incomes,
        payments,
        transactions,
        assets,
        savingsGoals,
        transactionSplits,
        userProfile,
        supaUser,
        loading,
        reload: loadAll,
        refreshUserProfile,
        payBill,
        updateLoan,
        addTransaction
      }}
    >
      {children}
    </FinancialDataContext.Provider>
  );
}

export function useFinancialData() {
  const ctx = useContext(FinancialDataContext);
  if (!ctx) throw new Error("useFinancialData must be used within FinancialDataProvider");
  return ctx;
}