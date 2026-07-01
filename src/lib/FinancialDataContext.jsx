import { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { supabase } from "./supabaseClient";
import { toast } from "@/components/ui/use-toast";

const FinancialDataContext = createContext(null);

export function FinancialDataProvider({ children }) {
  const [loans, setLoans] = useState([]);
  const [bills, setBills] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [payments, setPayments] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      // 1. Fetch the user first
      const me = await base44.auth.me();
      setUserProfile(me || null);

      if (!me?.id) {
        setLoans([]);
        setBills([]);
        setIncomes([]);
        setPayments([]);
        setLoading(false);
        return;
      }

      // 2. Fetch all Supabase data now that we have a session
      const [loansRes, billsRes, incomesRes, paymentsRes] = await Promise.all([
        supabase.from('loans').select('*').order('created_at', { ascending: false }),
        supabase.from('bills').select('*').order('created_at', { ascending: false }),
        supabase.from('incomes').select('*').order('created_at', { ascending: false }),
        supabase.from('payments').select('*').order('payment_date', { ascending: false })
      ]);

      if (loansRes.error) console.error("Supabase Loans Error:", loansRes.error);
      if (billsRes.error) console.error("Supabase Bills Error:", billsRes.error);
      if (incomesRes.error) console.error("Supabase Incomes Error:", incomesRes.error);
      if (paymentsRes.error) console.error("Supabase Payments Error:", paymentsRes.error);

      setLoans(loansRes.data || []);
      setBills(billsRes.data || []);
      setIncomes(incomesRes.data || []);
      setPayments(paymentsRes.data || []);

    } catch (e) {
      console.error("Failed to load financial data from Supabase:", e);
      setLoans([]);
      setBills([]);
      setIncomes([]);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }

  async function refreshUserProfile() {
    try {
      const me = await base44.auth.me();
      setUserProfile(me || null);
      return me;
    } catch (e) {
      console.error("Failed to refresh user profile:", e);
      return null;
    }
  }

  // ─── Optimistic UI Mutation Functions ───

  // Pay a bill: instantly marks bill as paid, syncs in background
  async function payBill(bill, paymentAmount, paymentDate = new Date().toISOString().split('T')[0]) {
    if (!userProfile?.id) return; // Guard clause
    const prevBills = [...bills];
    setBills(prev => prev.map(b => b.id === bill.id ? { ...b, last_paid_date: paymentDate } : b));

    try {
      const { data, error } = await supabase.from('payments').insert({
        bill_id: bill.id,
        amount: paymentAmount,
        payment_date: paymentDate,
        payment_type: 'bill',
        user_id: userProfile.id // 🚀 FIXED: Explicitly attach the user ID
      }).select();
      if (error) throw error;
      if (data?.[0]) setPayments(prev => [data[0], ...prev]);
    } catch (e) {
      setBills(prevBills);
      toast({ title: "Payment failed", description: e.message, variant: "destructive" });
    }
  }

  // Update a loan: instantly updates local state, syncs in background
  async function updateLoan(loanId, updates) {
    const prevLoans = [...loans];
    setLoans(prev => prev.map(l => l.id === loanId ? { ...l, ...updates } : l));

    try {
      const { error } = await supabase.from('loans').update(updates).eq('id', loanId);
      if (error) throw error;
    } catch (e) {
      setLoans(prevLoans);
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  }

  // Add a transaction: instantly adds to list, syncs in background
  async function addTransaction(transactionData) {
    if (!userProfile?.id) return; // Guard clause
    const tempId = `temp_${Date.now()}`;
    
    // 🚀 FIXED: Attach user ID to the local optimistic record
    const optimisticRecord = { ...transactionData, id: tempId, created_at: new Date().toISOString(), user_id: userProfile.id };
    setPayments(prev => [optimisticRecord, ...prev]);

    try {
      const { data, error } = await supabase.from('payments').insert({
        ...transactionData,
        user_id: userProfile.id // 🚀 FIXED: Explicitly attach the user ID to Supabase
      }).select();
      if (error) throw error;
      setPayments(prev => prev.map(p => p.id === tempId ? data[0] : p));
    } catch (e) {
      setPayments(prev => prev.filter(p => p.id !== tempId));
      toast({ title: "Failed to add transaction", description: e.message, variant: "destructive" });
    }
  }

  // This safely runs exactly once when the app opens, preventing the infinite loading loop
  useEffect(() => {
    loadAll();
  }, []);

  return (
    <FinancialDataContext.Provider value={{ loans, bills, incomes, payments, userProfile, loading, reload: loadAll, refreshUserProfile, payBill, updateLoan, addTransaction }}>
      {children}
    </FinancialDataContext.Provider>
  );
}

export function useFinancialData() {
  const ctx = useContext(FinancialDataContext);
  if (!ctx) throw new Error("useFinancialData must be used within FinancialDataProvider");
  return ctx;
}
