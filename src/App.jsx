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
import ProtectedLayout from './components/ProtectedLayout';
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
const ForgotPassword = lazy(() => import('./pages/ForgotPassword')); // 🚀 NEW: Lazy loaded public route
const Profile = lazy(() => import('./pages/Profile'));
const Reminders = lazy(() => import('./pages/Reminders'));
const Budget = lazy(() => import('./pages/Budget'));
const Store = lazy(() => import('./pages/Store'));
const SecurityAudit = lazy(() => import('./pages/SecurityAudit'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const Admin = lazy(() => import('./pages/Admin'));
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
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const TaxSummary = lazy(() => import('./pages/TaxSummary'));
const Calendar = lazy(() => import('./pages/Calendar'));

const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      window.location.href = '/auth';
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-muted-foreground animate-pulse">
              Redirecting to secure login...
            </p>
          </div>
        </div>
      );
    }
  }

  return (
    <FinancialDataProvider>
      <Routes>
        <Route element={<Layout />}>
          {/* Core App Pages (Immediate Load) - Protected */}
          <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path="/loans" element={<ProtectedLayout><LoansList /></ProtectedLayout>} />
          <Route path="/add-loan" element={<ProtectedLayout><AddLoan /></ProtectedLayout>} />
          <Route path="/loan/:id" element={<ProtectedLayout><LoanDetail /></ProtectedLayout>} />
          <Route path="/bills" element={<ProtectedLayout><Bills /></ProtectedLayout>} />
          <Route path="/onboarding" element={<ProtectedLayout><Onboarding /></ProtectedLayout>} />
          <Route path="/remote-support" element={<ProtectedLayout><RemoteSupport /></ProtectedLayout>} />

          {/* Lazy App Pages (Protected from crashing with Suspense + Authentication) */}
          <Route path="/reminders" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><Reminders /></Suspense></ProtectedLayout>} />
          <Route path="/profile" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><Profile /></Suspense></ProtectedLayout>} />
          <Route path="/budget" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><Budget /></Suspense></ProtectedLayout>} />
          <Route path="/store" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><Store /></Suspense></ProtectedLayout>} />
          <Route path="/security" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><SecurityAudit /></Suspense></ProtectedLayout>} />
          <Route path="/privacy" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><PrivacyPolicy /></Suspense></ProtectedLayout>} />
          <Route path="/terms" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><TermsOfService /></Suspense></ProtectedLayout>} />
          <Route path="/admin" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><Admin /></Suspense></ProtectedLayout>} />
          <Route path="/arcade" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><Arcade /></Suspense></ProtectedLayout>} />
          <Route path="/feedback" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><Feedback /></Suspense></ProtectedLayout>} /> 
          <Route path="/finance" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><Finance /></Suspense></ProtectedLayout>} />
          <Route path="/trend" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><MonthlyTrend /></Suspense></ProtectedLayout>} />
          <Route path="/simulator" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><Simulator /></Suspense></ProtectedLayout>} />
          <Route path="/documents" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><DocumentVault /></Suspense></ProtectedLayout>} />
          <Route path="/bank-accounts" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><BankAccounts /></Suspense></ProtectedLayout>} />
          <Route path="/budget-dashboard" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><BudgetDashboard /></Suspense></ProtectedLayout>} />
          <Route path="/debt-simulator" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><DebtPayoffSimulator /></Suspense></ProtectedLayout>} />
          <Route path="/monthly-recap" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><MonthlyRecap /></Suspense></ProtectedLayout>} />
          <Route path="/assets" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><AssetDashboard /></Suspense></ProtectedLayout>} />
          <Route path="/tax-summary" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><TaxSummary /></Suspense></ProtectedLayout>} />
          <Route path="/calendar" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><Calendar /></Suspense></ProtectedLayout>} />
          
          <Route path="*" element={<PageNotFound />} />
        </Route>
      </Routes>
    </FinancialDataProvider>
  );
};

function App() {
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
            
            {/* 🚀 NEW: Placed in the public router so unauthenticated users can actually reach it! */}
            <Route path="/forgot-password" element={<Suspense fallback={<PageLoader />}><ForgotPassword /></Suspense>} />
            {/* 🚀 NEW: The page the email link actually goes to */}
            <Route path="/reset-password" element={<Suspense fallback={<PageLoader />}><ResetPassword /></Suspense>} />
            
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