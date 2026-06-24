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

      // 2. 🚀 THE REAL BACKEND: Fetch this user's data from Supabase
      // NOTE: user_id filter removed — Base44 me.id does not match the
      // user_id stored in existing Supabase rows (ID mismatch from migration).
      const [loansRes, billsRes, incomesRes] = await Promise.all([
        supabase.from('loans').select('*').order('created_at', { ascending: false }),
        supabase.from('bills').select('*').order('created_at', { ascending: false }),
        supabase.from('incomes').select('*').order('created_at', { ascending: false })
      ]);

      if (loansRes.error) console.error("Supabase Loans Error:", loansRes.error);
      if (billsRes.error) console.error("Supabase Bills Error:", billsRes.error);
      if (incomesRes.error) console.error("Supabase Incomes Error:", incomesRes.error);

      // 3. Save the real database rows into the app's state
      console.log("Supabase Data Received:", { 
        loans: loansRes.data, 
        bills: billsRes.data, 
        incomes: incomesRes.data 
      });

      // 🚀 THE MISSING LINK: Actually saving the data to React!
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

  // Refresh just the user profile
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
