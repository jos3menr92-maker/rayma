import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { Mail, Lock, User, Loader2, ArrowRight, Chrome, Fingerprint } from "lucide-react";
import { Link } from "react-router-dom";

export default function Auth() {
  const { lang } = useLanguage();

  // 🌍 FIXED: Recreate T() when lang changes so translations update in real-time
  const T = useMemo(() =>
    (key, fallback) => {
      const translated = t(lang, key);
      return translated !== key ? translated : fallback;
    },
    [lang]
  );

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState(null); // Tracks which social button is loading
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ email: "", password: "", fullName: "" });

  const navigate = useNavigate();
  const { checkAppState } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        await base44.auth.signIn(formData.email, formData.password);
        await checkAppState();
        // Set a one-time session flag so RAYMA can auto-open after login
        try { sessionStorage.setItem("rayma_auto_open", "true"); } catch (err) { /* ignore */ }
        navigate("/");
      } else {
        await base44.auth.signUp(formData.email, formData.password, { full_name: formData.fullName });
        await checkAppState();
        navigate("/onboarding");
      }
    } catch (err) {
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  // --- INJECTED: Premium Provider Login Handler ---
  const handleProviderSignIn = async (provider) => {
    setActiveProvider(provider);
    setError("");
    try {
      if (provider === "passkey") {
        // Trigger device Biometrics (FaceID / Fingerprint / Windows Hello)
        await base44.auth.signInWithPasskey(); 
      } else {
        // Trigger Apple or Google OAuth
        await base44.auth.signInWithOAuth({ provider });
      }
      
      await checkAppState();
      try { sessionStorage.setItem("rayma_auto_open", "true"); } catch (err) { /* ignore */ }
      navigate("/");
    } catch (err) {
      setError(err.message || `${provider} authentication is not fully configured yet.`);
    } finally {
      setActiveProvider(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold font-heading text-foreground mb-2">
            {isLogin ? T("welcomeBack", "Welcome Back") : T("createAccount", "Create Account")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isLogin ? T("signInDesc", "Sign in to continue to RAYMA") : T("signUpDesc", "Join us to take control of your finances")}
          </p>
        </div>

        {/* Email/Pass Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder={T("fullName", "Full Name")}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                disabled={loading || activeProvider}
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
            <input
              type="email"
              placeholder={T("emailAddress", "Email address")}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={loading || activeProvider}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
            <input
              type="password"
              placeholder={T("password", "Password")}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              disabled={loading || activeProvider}
            />
          </div>

          {error && <p className="text-sm text-destructive text-center bg-destructive/10 py-2 rounded-lg">{error}</p>}

          <button
            type="submit"
            disabled={loading || activeProvider}
            className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <> {isLogin ? T("signIn", "Sign In") : T("signUp", "Sign Up")} <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">{T("orContinueWith", "Or continue with")}</span></div>
        </div>

        {/* --- UPGRADED: Apple, Google, and Fingerprint Buttons --- */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleProviderSignIn("passkey")}
            disabled={loading || activeProvider}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-sm font-medium shadow-sm disabled:opacity-50"
          >
            {activeProvider === "passkey" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-5 h-5" />}
            {T("signInPasskey", "Sign in with Passkey / Biometrics")}
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleProviderSignIn("google")}
              disabled={loading || activeProvider}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border hover:bg-muted/50 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {activeProvider === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Chrome className="w-4 h-4" />}
              Google
            </button>
            <button
              type="button"
              onClick={() => handleProviderSignIn("apple")}
              disabled={loading || activeProvider}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border hover:bg-muted/50 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {activeProvider === "apple" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 12.58c.07-2.65 2.37-3.91 2.47-3.96-1.34-1.94-3.41-2.2-4.17-2.24-1.78-.18-3.47 1.05-4.38 1.05-.91 0-2.3-1.01-4.04-1.01-1.74 0-3.37 1.15-4.28 2.75-1.85 3.25-.48 8.04 1.33 10.66.89 1.28 1.94 2.7 3.32 2.65 1.33-.05 1.84-.86 3.44-.86 1.6 0 2.07.86 3.46.83 1.41-.03 2.33-1.28 3.22-2.57 1.03-1.49 1.46-2.94 1.48-3.02-.03-.02-2.82-1.08-2.88-4.24zm-2.4-7.23c.75-.92 1.25-2.2 1.11-3.48-1.09.04-2.45.74-3.23 1.68-.69.83-1.29 2.15-1.12 3.4 1.23.1 2.48-.68 3.24-1.6z" /></svg>
              )}
              Apple
            </button>
          </div>
        </div>

        {/* Toggle & Legal */}
        <div className="text-center space-y-4">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-primary hover:underline font-medium"
          >
            {isLogin ? T("noAccount", "Don't have an account? Sign up") : T("hasAccount", "Already have an account? Sign in")}
          </button>

          <p className="text-[10px] text-muted-foreground">
            {T("agreeTerms", "By continuing, you agree to our")} <Link to="/terms" className="underline">{T("termsOfService", "Terms of Service")}</Link> {T("and", "and")} <Link to="/privacy" className="underline">{T("privacyPolicy", "Privacy Policy")}</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
