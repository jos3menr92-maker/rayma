import { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

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
      const [loansData, billsData, me, incomesData] = await Promise.all([
        base44.entities.Loan.list("-created_date", 200),
        base44.entities.Bill.list("-created_date", 200),
        base44.auth.me(),
        base44.entities.WeeklyIncome.list("-week_start", 52),
      ]);
      setLoans(loansData || []);
      setBills((billsData || []).filter((b) => b.is_active !== false));
      setIncomes(incomesData || []);
      setUserProfile(me || null);
    } catch (e) {
      console.error("Failed to load financial data:", e);
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
