import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/lib/supabaseClientFrontend';
import { ensureSupabaseSession } from '@/lib/supabaseHelpers';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }
  const [deletionCancelled, setDeletionCancelled] = useState(false);
  const refreshIntervalRef = useRef(null);
  const isAuthedRef = useRef(false);

  useEffect(() => {
    checkAppState();

    // Listen for Supabase auth state changes (token refresh, sign-in, sign-out)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('[AuthContext] Supabase token refreshed successfully.');
      } else if (event === 'SIGNED_OUT') {
        // Supabase session ended — clear state
        setUser(null);
        setIsAuthenticated(false);
        isAuthedRef.current = false;
      } else if (event === 'SIGNED_IN' && !isAuthedRef.current) {
        // Re-check Base44 auth when Supabase session is restored (guard against re-entrancy)
        checkUserAuth();
      }
    });

    // Proactive session refresh every 10 minutes to prevent silent expiry
    refreshIntervalRef.current = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.auth.refreshSession();
        }
      } catch (e) {
        console.warn('[AuthContext] Periodic refresh failed:', e.message);
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => {
      authListener.subscription.unsubscribe();
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, []);

  const checkAppState = async () => {
    setIsLoadingPublicSettings(false);
    setAuthError(null);
    await checkUserAuth();
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      // Timeout guard — prevents infinite blank spinner if the auth API hangs
      const me = await Promise.race([
        base44.auth.me(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Authentication timed out')), 15000)
        ),
      ]);

      // Grace-period check: if the user scheduled deletion and logs back in
      // within 30 days, cancel it. If the grace period has expired, block login.
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('deletion_scheduled_at')
            .eq('id', session.user.id)
            .single();
          if (profile?.deletion_scheduled_at) {
            const deletionDate = new Date(profile.deletion_scheduled_at);
            if (deletionDate > new Date()) {
              await supabase.from('profiles').update({ deletion_scheduled_at: null }).eq('id', session.user.id);
              setDeletionCancelled(true);
            } else {
              await supabase.auth.signOut();
              setAuthError({ type: 'auth_required', message: 'Account permanently deleted' });
              setIsLoadingAuth(false);
              return;
            }
          }
        }
      } catch (e) {
        console.warn('[AuthContext] Deletion-schedule check failed (non-fatal):', e?.message);
      }

      setUser(me);
      setIsAuthenticated(true);
      isAuthedRef.current = true;

      // Proactively recover the Supabase session so all reads/writes use the
      // free frontend path. Costs 1 credit once per session, not per save.
      ensureSupabaseSession().catch((e) =>
        console.warn('[AuthContext] Proactive session sync failed:', e?.message)
      );
    } catch (error) {
      console.error('Auth Error caught:', error);

      // Surface the actual error to the UI instead of swallowing it
      if (error.status === 429 || error.message?.toLowerCase().includes('rate limit')) {
        setAuthError({
          type: 'rate_limited',
          message: 'Too many login attempts. Please wait a few minutes before trying again.'
        });
      } else if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      } else {
        setAuthError({
          type: 'connection_error',
          message: error.message || 'Authentication failed to connect to the database.'
        });
      }

      setUser(null);
      setIsAuthenticated(false);
      isAuthedRef.current = false;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = async (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    isAuthedRef.current = false;

    // Clear the Supabase session so no orphaned token remains
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Supabase sign-out failed:', e);
    }

    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      deletionCancelled,
      clearDeletionCancelled: () => setDeletionCancelled(false),
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};