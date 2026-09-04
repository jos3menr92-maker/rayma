import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { LanguageProvider } from '@/lib/LanguageContext';
import { FinancialDataProvider } from '@/lib/FinancialDataContext'; // ⬅️ Restored!
import { Toaster } from "@/components/ui/toaster";

import InstallBanner from './components/InstallBanner';
import UpdateChecker from './components/UpdateChecker';
import PageNotFound from './lib/PageNotFound';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import ProtectedLayout from './components/ProtectedLayout';
import PageTransition from './components/PageTransition';
import RootGate from './components/RootGate';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';

// Lazy app pages — keeps the initial bundle (and first paint) small
const LoansList = lazy(() => import('./pages/LoansList'));
const AddLoan = lazy(() => import('./pages/AddLoan'));
const LoanDetail = lazy(() => import('./pages/LoanDetail'));
const Bills = lazy(() => import('./pages/Bills'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const RemoteSupport = lazy(() => import('./pages/RemoteSupport'));

// 🛋️ THE LAZY LOUNGE: Lightning fast boot times!
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Profile = lazy(() => import('./pages/Profile'));
const Reminders = lazy(() => import('./pages/Reminders'));
const Budget = lazy(() => import('./pages/Budget'));
const Store = lazy(() => import('./pages/Store'));
const SecurityAudit = lazy(() => import('./pages/SecurityAudit'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const Admin = lazy(() => import('./pages/Admin'));
const BugReportDetail = lazy(() => import('./pages/BugReportDetail'));
const BugReportsArchive = lazy(() => import('./pages/BugReportsArchive'));
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
const MerchantAnalytics = lazy(() => import('./pages/MerchantAnalytics'));
const Support = lazy(() => import('./pages/Support'));
const BusinessInfo = lazy(() => import('./pages/BusinessInfo'));

const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <FinancialDataProvider> {/* ⬅️ Restored! */}
      <Routes>
        {/* Public front page for guests; authed users go to the dashboard */}
        <Route path="/" element={<RootGate />} />
        <Route element={<Layout />}>
          {/* Core App Pages (Immediate Load) - Protected */}
          <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path="/loans" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><LoansList /></Suspense></ProtectedLayout>} />
          <Route path="/add-loan" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><AddLoan /></Suspense></ProtectedLayout>} />
          <Route path="/loan/:id" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><LoanDetail /></Suspense></ProtectedLayout>} />
          <Route path="/bills" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><Bills /></Suspense></ProtectedLayout>} />
          <Route path="/onboarding" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><Onboarding /></Suspense></ProtectedLayout>} />
          <Route path="/remote-support" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><RemoteSupport /></Suspense></ProtectedLayout>} />

          {/* Lazy App Pages (Protected from crashing with Suspense + Authentication) */}
          <Route path="/reminders" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><Reminders /></Suspense></ProtectedLayout>} />
          <Route path="/profile" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><Profile /></Suspense></ProtectedLayout>} />
          <Route path="/budget" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><Budget /></Suspense></ProtectedLayout>} />
          <Route path="/store" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><Store /></Suspense></ProtectedLayout>} />
          <Route path="/security" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><SecurityAudit /></Suspense></ProtectedLayout>} />

          <Route path="/admin" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><Admin /></Suspense></ProtectedLayout>} />
          <Route path="/admin/bug-report/:id" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><BugReportDetail /></Suspense></ProtectedLayout>} />
          <Route path="/admin/bug-reports/resolved" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><BugReportsArchive /></Suspense></ProtectedLayout>} />
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
          <Route path="/merchants" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><MerchantAnalytics /></Suspense></ProtectedLayout>} />
          <Route path="/support" element={<ProtectedLayout><Suspense fallback={<PageLoader />}><Support /></Suspense></ProtectedLayout>} />
          
          <Route path="*" element={<PageNotFound />} />
        </Route>
      </Routes>
    </FinancialDataProvider>
  );
};

export default function App() {
  // 1. Theme Initialization
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const defaultTheme = systemDark ? "dark" : "light";
      if (defaultTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      localStorage.setItem("theme", defaultTheme);
    }
  }, []);

  return (
    <AuthProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <Routes>
              <Route path="/home" element={<PageTransition><Landing /></PageTransition>} />
              <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
              <Route path="/forgot-password" element={<Suspense fallback={<PageLoader />}><PageTransition><ForgotPassword /></PageTransition></Suspense>} />
              <Route path="/reset-password" element={<Suspense fallback={<PageLoader />}><PageTransition><ResetPassword /></PageTransition></Suspense>} />
              <Route path="/privacy" element={<Suspense fallback={<PageLoader />}><PageTransition><PrivacyPolicy /></PageTransition></Suspense>} />
              <Route path="/terms" element={<Suspense fallback={<PageLoader />}><PageTransition><TermsOfService /></PageTransition></Suspense>} />
              <Route path="/business-info" element={<Suspense fallback={<PageLoader />}><PageTransition><BusinessInfo /></PageTransition></Suspense>} />
              <Route path="/*" element={<AuthenticatedApp />} />
            </Routes>
          </Router>
          <Toaster />
          <InstallBanner />
          <UpdateChecker />
        </QueryClientProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}