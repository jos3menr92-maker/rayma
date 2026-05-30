import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import LoansList from './pages/LoansList';
import AddLoan from './pages/AddLoan';
import LoanDetail from './pages/LoanDetail';
import Bills from './pages/Bills';
import BillCalendar from './pages/BillCalendar';
import Reminders from './pages/Reminders';
import Profile from './pages/Profile';
import Budget from './pages/Budget';
import Support from './pages/Support';
import SecurityAudit from './pages/SecurityAudit';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import DeleteAccount from './pages/DeleteAccount';

// Lazy load less-visited pages
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
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

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
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/loans" element={<LoansList />} />
        <Route path="/add-loan" element={<AddLoan />} />
        <Route path="/loan/:id" element={<LoanDetail />} />
        <Route path="/bills" element={<Bills />} />
        <Route path="/calendar" element={<BillCalendar />} />
        <Route path="/reminders" element={<Reminders />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/support" element={<Support />} />
        <Route path="/security" element={<SecurityAudit />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/delete-account" element={<DeleteAccount />} />

        <Route path="/finance" element={<Suspense fallback={<PageLoader />}><Finance /></Suspense>} />
        <Route path="/trend" element={<Suspense fallback={<PageLoader />}><MonthlyTrend /></Suspense>} />
        <Route path="/simulator" element={<Suspense fallback={<PageLoader />}><Simulator /></Suspense>} />
        <Route path="/documents" element={<Suspense fallback={<PageLoader />}><DocumentVault /></Suspense>} />
        <Route path="/bank-accounts" element={<Suspense fallback={<PageLoader />}><BankAccounts /></Suspense>} />
        <Route path="/budget" element={<Suspense fallback={<PageLoader />}><BudgetDashboard /></Suspense>} />
        <Route path="/debt-simulator" element={<Suspense fallback={<PageLoader />}><DebtPayoffSimulator /></Suspense>} />
        <Route path="/monthly-recap" element={<Suspense fallback={<PageLoader />}><MonthlyRecap /></Suspense>} />
        <Route path="/assets" element={<Suspense fallback={<PageLoader />}><AssetDashboard /></Suspense>} />
        <Route path="/tax-summary" element={<Suspense fallback={<PageLoader />}><TaxSummary /></Suspense>} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App