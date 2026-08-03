import { createContext, useContext, useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { supabase } from "./supabaseClientFrontend";
import { createRecord, updateRecord } from "@/lib/supabaseHelpers";
import { toast } from "@/components/ui/use-toast";

const FinancialDataContext = createContext(null);

// 🪙 One-time coin grant — brand-new accounts start with 15 coins (5 questions).
// No daily/weekly refill here; the weekly cron tops up free users to 15. Purchased
// and earned coins carry over, so we only ever initialize a null balance once.
async function ensureInitialCoins(me) {
  if (!me) return null;
  if (me.ai_tokens == null) {
    try {
      await base44.auth.updateMe({ ai_tokens: 15 });
      return { ai_tokens: 15 };
    } catch (e) {
      console.warn('Initial coin grant failed:', e.message);
      return null;
    }
  }
  return null;
}

export function FinancialDataProvider({ children }) {
  const [loans, setLoans] = useState([]);
  const [bills, setBills] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [payments, setPayments] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // 🚀 Existing global containers
  const [assets, setAssets] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [documents, setDocuments] = useState([]);

  // ✅ NEW: Global split transaction container
  const [transactionSplits, setTransactionSplits] = useState([]);
  const [budgetCategories, setBudgetCategories] = useState([]);

  const [userProfile, setUserProfile] = useState(null);
  const [supaUser, setSupaUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const inFlightPromise = useRef(null);
  const mountedRef = useRef(true);
  const pendingReload = useRef(false);
  const meRef = useRef(null);          // cached Base44 user — avoids base44.auth.me() on every background refresh
  const hasLoadedRef = useRef(false);  // true after first load — background refreshes skip the loading spinner
  const reloadTimerRef = useRef(null);
  const profileTimerRef = useRef(null);

  function loadAll({ fresh = false } = {}) {
    if (inFlightPromise.current) {
      pendingReload.current = true;
      return inFlightPromise.current;
    }

    const doFetch = async () => {
      // Only the very first load flashes the full-screen spinner. Every later
      // refresh (realtime, token-refresh, explicit reload) updates the data
      // silently so pages re-render without a jarring loader flash.
      if (!hasLoadedRef.current) setLoading(true);

      try {
      const [meRaw, { data: { session } }] = await Promise.all([
        // Reuse the cached Base44 user on background/realtime refreshes —
        // base44.auth.me() is a network round-trip we don't need on every tick.
        // An explicit reload (fresh=true, e.g. after a profile save) re-fetches
        // so the freshly-saved fields show up immediately instead of on hard refresh.
        hasLoadedRef.current && meRef.current && !fresh
          ? Promise.resolve(meRef.current)
          : base44.auth.me().catch(() => null),
        supabase.auth.getSession()
      ]);

      const isFirstLoad = !hasLoadedRef.current;
      // 🪙 One-time initial coin grant for brand-new accounts (see ensureInitialCoins)
      const tokenHeal = isFirstLoad ? await ensureInitialCoins(meRaw) : null;
      const me = tokenHeal ? { ...meRaw, ...tokenHeal } : meRaw;
      if (me) meRef.current = me;

      const currentSupaUser = session?.user || null;

      if (mountedRef.current) {
        setSupaUser(currentSupaUser);
        if (isFirstLoad) setUserProfile(me || null);
      }

      if (!currentSupaUser?.id) {
        // Fallback: Base44 user is authenticated but Supabase browser session is
        // missing/expired. Use the getFinancialData backend function which resolves
        // the Supabase user via the admin API (bypasses RLS, always works).
        if (me?.email) {
          try {
            const res = await base44.functions.invoke("getFinancialData", {});
            const d = res.data || {};
            if (!mountedRef.current) return;
            setLoans(d.loans || []);
            setBills(d.bills || []);
            setIncomes(d.incomes || []);
            setPayments(d.payments || []);
            setTransactions(d.transactions || []);
            setAssets(d.assets || []);
            setSavingsGoals(d.savings_goals || []);
            setBankAccounts(d.bank_accounts || []);
            setDocuments(d.documents || []);
            setBudgetCategories(d.budget_categories || []);
            setTransactionSplits(d.transaction_splits || []);
            setUserProfile(me);
          } catch (fallbackErr) {
            console.error("Fallback data load failed:", fallbackErr);
            if (mountedRef.current) {
              setLoans([]);
              setBills([]);
              setIncomes([]);
              setPayments([]);
              setTransactions([]);
              setAssets([]);
              setSavingsGoals([]);
              setBankAccounts([]);
              setDocuments([]);
              setBudgetCategories([]);
              setTransactionSplits([]);
            }
          } finally {
            hasLoadedRef.current = true;
            if (mountedRef.current) setLoading(false);
            inFlightPromise.current = null;
            if (pendingReload.current) {
              pendingReload.current = false;
              loadAll();
            }
          }
          return;
        }
        // No Base44 user either — show empty state
        if (mountedRef.current) {
          setLoans([]);
          setBills([]);
          setIncomes([]);
          setPayments([]);
          setTransactions([]);
          setAssets([]);
          setSavingsGoals([]);
          setBankAccounts([]);
          setDocuments([]);
          setBudgetCategories([]);
          setTransactionSplits([]);
          hasLoadedRef.current = true;
          setLoading(false);
        }
        inFlightPromise.current = null;
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
        bankAccountsRes,
        documentsRes,
        budgetCategoriesRes,
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
        supabase.from("bank_accounts").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
        supabase.from("documents").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
        supabase.from("budget_categories").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
        supabase.from("transaction_splits").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").eq("id", uid).single()
      ]);

      if (!mountedRef.current) return;

      setLoans(loansRes.data || []);
      setBills(billsRes.data || []);
      setIncomes(incomesRes.data || []);
      setPayments(paymentsRes.data || []);
      setTransactions(transactionsRes.data || []);
      setAssets(assetsRes.data || []);
      setSavingsGoals(savingsRes.data || []);
      setBankAccounts(bankAccountsRes.data || []);
      setDocuments(documentsRes.data || []);
      setBudgetCategories(budgetCategoriesRes.data || []);
      setTransactionSplits(splitsRes.data || []);

      // ✅ Unify profile: merge Supabase profile (tokens, energy_bars) with Base44 user
      // Only override with non-null Supabase values — prevents null columns from
      // hiding token updates made on the Base44 User (e.g. after promo redemption)
      const supaProfile = profileRes.data || {};
      const mergedLoad = { ...me };
      for (const [key, value] of Object.entries(supaProfile)) {
        if (value !== null && value !== undefined) mergedLoad[key] = value;
      }
      // Base44 User is authoritative for energy/entitlement fields (the Stripe
      // webhook + daily reset write there). Prevent stale Supabase profile copies
      // (e.g. ai_tokens: 0) from clobbering fresh Base44 values after a purchase,
      // which was causing "purchased but shows empty" in the AI chat.
      const ENERGY_FIELDS = ['ai_tokens', 'ai_tokens_daily_limit', 'energy_bars', 'purchased_energy', 'subscription_type', 'subscription_tier', 'annual_pass_expires_at', 'game_access_expires_at'];
      for (const f of ENERGY_FIELDS) {
        if (me?.[f] !== undefined && me?.[f] !== null) mergedLoad[f] = me[f];
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
      hasLoadedRef.current = true;
      if (mountedRef.current) setLoading(false);
      inFlightPromise.current = null;
      if (pendingReload.current) {
        pendingReload.current = false;
        loadAll();
      }
    }
  };

  inFlightPromise.current = doFetch();
  return inFlightPromise.current;
}

  async function refreshUserProfile() {
    try {
      const [meRaw, { data: { session } }] = await Promise.all([
        base44.auth.me().catch(() => null),
        supabase.auth.getSession()
      ]);
      const tokenHeal = await ensureInitialCoins(meRaw);
      const me = tokenHeal ? { ...meRaw, ...tokenHeal } : meRaw;
      if (me) meRef.current = me;
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
      const ENERGY_FIELDS = ['ai_tokens', 'ai_tokens_daily_limit', 'energy_bars', 'purchased_energy', 'subscription_type', 'subscription_tier', 'annual_pass_expires_at', 'game_access_expires_at'];
      for (const f of ENERGY_FIELDS) {
        if (me?.[f] !== undefined && me?.[f] !== null) merged[f] = me[f];
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
    const prevBills = [...bills];
    const prevPayments = [...payments];

    setBills(prev => prev.map(b => (b.id === bill.id ? { ...b, last_paid_date: paymentDate } : b)));

    try {
      const data = await createRecord('payments', {
        bill_id: bill.id,
        amount: paymentAmount,
        payment_date: paymentDate,
        payment_type: "bill",
      });

      setPayments(prev => [data, ...prev]);
    } catch (e) {
      setBills(prevBills);
      setPayments(prevPayments);
      toast({ title: "Payment failed", description: e.message, variant: "destructive" });
    }
  }

  async function updateLoan(loanId, updates) {
    const prevLoans = [...loans];
    setLoans(prev => prev.map(l => (l.id === loanId ? { ...l, ...updates } : l)));

    try {
      await updateRecord('loans', loanId, updates);
    } catch (e) {
      setLoans(prevLoans);
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  }

  async function addTransaction(transactionData) {
    const tempId = `temp_${Date.now()}`;
    const optimisticRecord = { ...transactionData, id: tempId, created_at: new Date().toISOString() };

    setPayments(prev => [optimisticRecord, ...prev]);

    try {
      const data = await createRecord('payments', transactionData);
      setPayments(prev => prev.map(p => (p.id === tempId ? data : p)));
    } catch (e) {
      setPayments(prev => prev.filter(p => p.id !== tempId));
      toast({ title: "Failed to add transaction", description: e.message, variant: "destructive" });
    }
  }

  // ⏱️ Debounce realtime bursts — a single save can emit multiple row events;
  // coalesce them into one reload instead of hammering Supabase with 12 queries N times.
  function scheduleReload() {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => {
      reloadTimerRef.current = null;
      loadAll();
    }, 350);
  }
  function scheduleProfileRefresh() {
    if (profileTimerRef.current) clearTimeout(profileTimerRef.current);
    profileTimerRef.current = setTimeout(() => {
      profileTimerRef.current = null;
      refreshUserProfile();
    }, 350);
  }

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setSupaUser(session?.user || null);
        loadAll({ fresh: true });
      } else if (event === "SIGNED_OUT") {
        setSupaUser(null);
        // Clear cached identity so a different user signing in next gets a fresh fetch,
        // not the previous user's Base44 profile.
        meRef.current = null;
        hasLoadedRef.current = false;
        setLoans([]);
        setBills([]);
        setIncomes([]);
        setPayments([]);
        setTransactions([]);
        setAssets([]);
        setSavingsGoals([]);
        setBankAccounts([]);
        setDocuments([]);
        setBudgetCategories([]);
        setTransactionSplits([]);
      }
    });
    return () => {
      mountedRef.current = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 📡 Supabase Realtime — debounced so a burst of row changes triggers ONE reload,
  // not 12 queries × N events. Background refreshes skip the loading spinner.
  useEffect(() => {
    const channel = supabase
      .channel("financial-data-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "loans" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "bills" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "incomes" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "assets" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "savings_goals" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "bank_accounts" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "transaction_splits" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, scheduleProfileRefresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
      if (profileTimerRef.current) clearTimeout(profileTimerRef.current);
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
        bankAccounts,
        documents,
        transactionSplits,
        budgetCategories,
        userProfile,
        supaUser,
        loading,
        reload: () => loadAll({ fresh: true }),
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