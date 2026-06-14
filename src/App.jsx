import { useEffect } from 'react';
import RemoteSupport from './pages/RemoteSupport';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import LoansList from './pages/LoansList';
import AddLoan from './pages/AddLoan';
import LoanDetail from './pages/LoanDetail';
import Bills from './pages/Bills';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import { LanguageProvider } from '@/lib/LanguageContext';
import { FinancialDataProvider } from '@/lib/FinancialDataContext';

// 🛋️ THE LAZY LOUNGE: Lightning fast boot times!
const Profile = lazy(() => import('./pages/Profile'));
const Reminders = lazy(() => import('./pages/Reminders'));
const Budget = lazy(() => import('./pages/Budget'));
const Support = lazy(() => import('./pages/Support'));
const SecurityAudit = lazy(() => import('./pages/SecurityAudit'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const DeleteAccount = lazy(() => import('./pages/DeleteAccount'));
const Admin = lazy(() => import('./pages/Admin'));
const DataExport = lazy(() => import('./pages/DataExport'));
const Arcade = lazy(() => import('./arcade')); 
const Feedback = lazy(() => import('./pages/Feedback'));
const Finance = lazy(() => import('./pages/Finance'));
const MonthlyTrend = lazy(() => import('./pages/MonthlyTrend'));
const Simulator = lazy(() => import('./pages/Simulator'));
const DocumentVault = lazy(() => import('./pages/DocumentVault'));
const BankAccounts = lazy(() => import('./pages/BankAccounts'));
const BudgetDashboard = lazy(() => import('./pages/BudgetDashboard'));
const DebtPayoffSimulator = lazy(() => import('./pages/DebtPayoffSimulator'));
const MonthlyRecap = lazy(() => import('./pages/MonthlyRecap'));
const AssetDashboard = lazy(() => import('./pages/AssetDashboard'));
const TaxSummary = lazy(() => import('./pages/TaxSummary'));

const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to custom Auth page automatically
      window.location.href = '/auth';
      return null;
    }
  }

  // Render the main app wrapped with FinancialDataProvider so consumers can use useFinancialData()
  return (
    <FinancialDataProvider>
      <Routes>
        <Route element={<Layout />}>
          {/* Core App Pages (Immediate Load) */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/loans" element={<LoansList />} />
          <Route path="/add-loan" element={<AddLoan />} />
          <Route path="/loan/:id" element={<LoanDetail />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/remote-support" element={<RemoteSupport />} />

          {/* Lazy App Pages (Protected from crashing with Suspense) */}
          <Route path="/reminders" element={<Suspense fallback={<PageLoader />}><Reminders /></Suspense>} />
          <Route path="/profile" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
          <Route path="/budget" element={<Suspense fallback={<PageLoader />}><Budget /></Suspense>} />
          <Route path="/support" element={<Suspense fallback={<PageLoader />}><Support /></Suspense>} />
          <Route path="/security" element={<Suspense fallback={<PageLoader />}><SecurityAudit /></Suspense>} />
          <Route path="/privacy" element={<Suspense fallback={<PageLoader />}><PrivacyPolicy /></Suspense>} />
          <Route path="/terms" element={<Suspense fallback={<PageLoader />}><TermsOfService /></Suspense>} />
          <Route path="/delete-account" element={<Suspense fallback={<PageLoader />}><DeleteAccount /></Suspense>} />
          <Route path="/admin" element={<Suspense fallback={<PageLoader />}><Admin /></Suspense>} />
          <Route path="/data-export" element={<Suspense fallback={<PageLoader />}><DataExport /></Suspense>} />
          <Route path="/arcade" element={<Suspense fallback={<PageLoader />}><Arcade /></Suspense>} />
          <Route path="/feedback" element={<Suspense fallback={<PageLoader />}><Feedback /></Suspense>} /> 
          <Route path="/finance" element={<Suspense fallback={<PageLoader />}><Finance /></Suspense>} />
          <Route path="/trend" element={<Suspense fallback={<PageLoader />}><MonthlyTrend /></Suspense>} />
          <Route path="/simulator" element={<Suspense fallback={<PageLoader />}><Simulator /></Suspense>} />
          <Route path="/documents" element={<Suspense fallback={<PageLoader />}><DocumentVault /></Suspense>} />
          <Route path="/bank-accounts" element={<Suspense fallback={<PageLoader />}><BankAccounts /></Suspense>} />
          <Route path="/budget-dashboard" element={<Suspense fallback={<PageLoader />}><BudgetDashboard /></Suspense>} />
          <Route path="/debt-simulator" element={<Suspense fallback={<PageLoader />}><DebtPayoffSimulator /></Suspense>} />
          <Route path="/monthly-recap" element={<Suspense fallback={<PageLoader />}><MonthlyRecap /></Suspense>} />
          <Route path="/assets" element={<Suspense fallback={<PageLoader />}><AssetDashboard /></Suspense>} />
          <Route path="/tax-summary" element={<Suspense fallback={<PageLoader />}><TaxSummary /></Suspense>} />
          
          <Route path="*" element={<PageNotFound />} />
        </Route>
      </Routes>
    </FinancialDataProvider>
  );
};


function App() {
  // --- Theme Persistence Logic ---
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  }, []);

  return (
    <AuthProvider>
      <LanguageProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route path="/home" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/*" element={<AuthenticatedApp />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}

export default App
