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
  
  // 🚀 THE MISSING PIECE: The Supabase User state
  const [supaUser, setSupaUser] = useState(null); 
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    let isMounted = true; 
    setLoading(true);
    
    try {
      // 🚀 Fetch Base44 and Supabase sessions in parallel
      const [me, { data: { session } }] = await Promise.all([
        base44.auth.me().catch(() => null),
        supabase.auth.getSession()
      ]);

      const currentSupaUser = session?.user || null;

      if (isMounted) {
        setUserProfile(me || null);
        setSupaUser(currentSupaUser);
      }

      if (!me?.id || !currentSupaUser?.id) {
        if (isMounted) {
          setLoans([]); setBills([]); setIncomes([]); setPayments([]);
          setLoading(false);
        }
        return;
      }

      const uid = currentSupaUser.id;

      const [loansRes, billsRes, incomesRes, paymentsRes] = await Promise.all([
        supabase.from('loans').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('bills').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('incomes').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('payments').select('*').eq('user_id', uid).order('payment_date', { ascending: false })
      ]);

      if (!isMounted) return;

      setLoans(loansRes.data || []);
      setBills(billsRes.data || []);
      setIncomes(incomesRes.data || []);
      setPayments(paymentsRes.data || []);

    } catch (e) {
      console.error("Failed to load financial data:", e);
      toast({ title: "Connection Error", description: "Could not sync latest data. Check connection.", variant: "destructive" });
    } finally {
      if (isMounted) setLoading(false);
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

  async function payBill(bill, paymentAmount, paymentDate = new Date().toISOString().split('T')[0]) {
    if (!supaUser?.id) return;
    const prevBills = [...bills];
    const prevPayments = [...payments];
    
    setBills(prev => prev.map(b => b.id === bill.id ? { ...b, last_paid_date: paymentDate } : b));

    try {
      const { data, error } = await supabase.from('payments').insert({
        bill_id: bill.id,
        amount: paymentAmount,
        payment_date: paymentDate,
        payment_type: 'bill',
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
    setLoans(prev => prev.map(l => l.id === loanId ? { ...l, ...updates } : l));

    try {
      const { error } = await supabase.from('loans').update(updates).eq('id', loanId).eq('user_id', supaUser.id);
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
      const { data, error } = await supabase.from('payments').insert({
        ...transactionData,
        user_id: supaUser.id
      }).select();
      
      if (error) throw error;
      setPayments(prev => prev.map(p => p.id === tempId ? data[0] : p));
    } catch (e) {
      setPayments(prev => prev.filter(p => p.id !== tempId));
      toast({ title: "Failed to add transaction", description: e.message, variant: "destructive" });
    }
  }

  useEffect(() => {
    loadAll();
    return () => {}; 
  }, []);

  // 🚀 Added supaUser to the exported provider value so the rest of the app can see it
  return (
    <FinancialDataContext.Provider value={{ loans, bills, incomes, payments, userProfile, supaUser, loading, reload: loadAll, refreshUserProfile, payBill, updateLoan, addTransaction }}>
      {children}
    </FinancialDataContext.Provider>
  );
}

export function useFinancialData() {
  const ctx = useContext(FinancialDataContext);
  if (!ctx) throw new Error("useFinancialData must be used within FinancialDataProvider");
  return ctx;
}
