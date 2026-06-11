import { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { supabase } from "./supabaseClient"; // 🔌 CONNECTED: Our new database bridge!

const FinancialDataContext = createContext(null);

export function FinancialDataProvider({ children }) {
  const [loans, setLoans] = useState([]);
  const [bills, setBills] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      // 1. Authenticate the user via Base44 first
      const me = await base44.auth.me();
      setUserProfile(me || null);

      // If nobody is logged in, clear the data and stop here
      if (!me?.id) {
        setLoans([]);
        setBills([]);
        setIncomes([]);
        setLoading(false);
        return;
      }

      // 2. 🚀 THE REAL BACKEND: Fetch only this user's data from Supabase
      const [loansRes, billsRes, incomesRes] = await Promise.all([
        supabase.from('loans').select('*').eq('user_id', me.id).order('created_at', { ascending: false }),
        supabase.from('bills').select('*').eq('user_id', me.id).order('created_at', { ascending: false }),
        supabase.from('incomes').select('*').eq('user_id', me.id).order('created_at', { ascending: false })
      ]);

      if (loansRes.error) console.error("Supabase Loans Error:", loansRes.error);
      if (billsRes.error) console.error("Supabase Bills Error:", billsRes.error);
      if (incomesRes.error) console.error("Supabase Incomes Error:", incomesRes.error);

      // 3. Save the real database rows into the app's state
      setLoans(loansRes.data || []);
      setBills(billsRes.data || []);
      setIncomes(incomesRes.data || []);

    } catch (e) {
      console.error("Failed to load financial data from Supabase:", e);
      setLoans([]);
      setBills([]);
      setIncomes([]);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  }

  // Refresh just the user profile (Kept exactly as you had it for the Avatar fixes)
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
    <FinancialDataContext.Provider value={{ loans, bills, incomes, userProfile, loading, reload: loadAll, refreshUserProfile }}>
      {children}
    </FinancialDataContext.Provider>
  );
}

export function useFinancialData() {
  const ctx = useContext(FinancialDataContext);
  if (!ctx) throw new Error("useFinancialData must be used within FinancialDataProvider");
  return ctx;
}
