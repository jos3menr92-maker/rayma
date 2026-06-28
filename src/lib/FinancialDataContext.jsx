import { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { supabase } from "./supabaseClient"; 

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

      console.log("Supabase Data Received:", { 
        loans: loansRes.data, 
        bills: billsRes.data, 
        incomes: incomesRes.data,
        payments: paymentsRes.data
      });

      setLoans(loansRes.data || []);
      setBills(billsRes.data || []);
      setIncomes(incomesRes.data || []);
      setPayments(paymentsRes.data || []);

    } catch (e) {
      console.error("Failed to load financial data from Supabase:", e);
      // We clear the financial data arrays on error, 
      // but we DO NOT wipe out the userProfile!
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

  useEffect(() => {
    loadAll();
  }, []);

  return (
    <FinancialDataContext.Provider value={{ loans, bills, incomes, payments, userProfile, loading, reload: loadAll, refreshUserProfile }}>
      {children}
    </FinancialDataContext.Provider>
  );
}

export function useFinancialData() {
  const ctx = useContext(FinancialDataContext);
  if (!ctx) throw new Error("useFinancialData must be used within FinancialDataProvider");
  return ctx;
}
