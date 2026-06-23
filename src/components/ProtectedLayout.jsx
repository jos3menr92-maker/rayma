import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

/**
 * ProtectedLayout Component
 * ========================
 * 
 * Purpose:
 *   - Wrap private/protected pages to prevent unauthorized access
 *   - Redirect unauthenticated users to /auth login page
 *   - Show loading state while checking authentication
 *   - Provide consistent protection across all dashboard pages
 * 
 * Usage:
 *   <Route path="/dashboard" element={
 *     <ProtectedLayout>
 *       <Dashboard />
 *     </ProtectedLayout>
 *   } />
 * 
 * Features:
 *   - Checks if user is authenticated via AuthContext
 *   - Waits for auth state to load before rendering content
 *   - Shows loading spinner during auth verification
 *   - Redirects to login if user becomes unauthenticated
 *   - Maintains clean, reusable code pattern
 */

const ProtectedLayout = ({ children }) => {
  // Access authentication state from context
  const { isAuthenticated, isLoadingAuth, authError } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          {/* Loading Spinner */}
          <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-700 border-t-slate-800 dark:border-t-slate-100 rounded-full animate-spin" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  // If there's an authentication error, redirect to auth page
  if (authError && authError.type === 'auth_required') {
    return <Navigate to="/auth" replace />;
  }

  // If user is not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // User is authenticated - render protected content
  return <>{children}</>;
};

export default ProtectedLayout;
