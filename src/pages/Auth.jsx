import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Mail, Lock, User, Loader2, ArrowRight, Chrome, Fingerprint } from "lucide-react";
import { Link } from "react-router-dom";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "@/components/ui/use-toast";
import { isNativeMobileApp } from "@/lib/iap";
import { supabase } from "@/lib/supabaseClient";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState(null); 
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ email: "", password: "", fullName: "" });
  
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const navigate = useNavigate();
  const { checkAppState } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        // 1. Authenticate with Base44
        await base44.auth.loginViaEmailPassword(formData.email, formData.password);
        
        // 2. Call backend to sync user and generate the one-time secure token
        const syncResponse = await base44.functions.invoke('syncSupabaseUser', {});
        
        // 3. THE SECURE HANDOFF: Use the temp token to get the real Supabase session
        if (syncResponse.data?.tempToken) {
          const { error: supabaseError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: syncResponse.data.tempToken,
          });
          
          if (supabaseError) {
            console.error("Supabase sync failed:", supabaseError.message);
          }
        }

        await checkAppState();
        try { sessionStorage.setItem("rayma_auto_open", "true"); } catch (err) { /* ignore */ }
        
        navigate("/", { replace: true });
      } else {
        // 1. Registers the user in Base44
        await base44.auth.register({ 
          email: formData.email, 
          password: formData.password 
        });
        
        setShowOtp(true);
      }
    } catch (err) {
      const errMsg = err.message?.toLowerCase() || "";
      if (errMsg.includes("verify") || errMsg.includes("not confirmed") || errMsg.includes("verification")) {
        setShowOtp(true);
      } else {
        setError(err.message || "Authentication failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email: formData.email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
      }

      // 1. Call the backend to sync the user and grab the one-time secure token
      const syncResponse = await base44.functions.invoke('syncSupabaseUser', {});

      // 2. 🚀 THE SECURE HANDOFF: Use the temp token to get the real Supabase session
      if (syncResponse.data?.tempToken) {
        const { error: supabaseError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: syncResponse.data.tempToken,
        });

        if (supabaseError) {
          console.error("Supabase session sync failed:", supabaseError.message);
        }
      }

      await checkAppState();
      
      navigate("/", { replace: true });
      window.location.reload();
    } catch (err) {
      setError(err.message || "Invalid verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(formData.email);
      toast({
        title: "Code sent",
        description: "Check your email for the new code.",
      });
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

const handleProviderSignIn = async (provider) => {
    setActiveProvider(provider);
    setError("");
    try {
      if (provider === "passkey") {
        await base44.auth.signInWithPasskey();
        
        // 1. Trigger backend sync
        const syncResponse = await base44.functions.invoke('syncSupabaseUser', {});
        
        // 2. 🚀 NEW: Actually use the token to log into Supabase!
        if (syncResponse.data?.tempToken) {
          const me = await base44.auth.me(); // Get the email
          if (me?.email) {
            await supabase.auth.signInWithPassword({
              email: me.email,
              password: syncResponse.data.tempToken,
            });
          }
        }
        
        await checkAppState();
        navigate("/", { replace: true });
        window.location.reload(); // Force clean session fetch
      } else {
        await base44.auth.loginWithProvider(provider, "/");
      }
    } catch (err) {
      setError(err.message || `${provider} authentication is not fully configured yet.`);
    } finally {
      setActiveProvider(null);
    }
  };

  if (showOtp) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-sm space-y-8 bg-card p-8 rounded-2xl border border-border shadow-sm">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold font-heading text-foreground mb-2">Verify your email</h1>
            <p className="text-muted-foreground text-sm">We sent a 6-digit code to {formData.email}</p>
          </div>
          {error && <p className="text-sm text-destructive text-center bg-destructive/10 py-2 rounded-lg">{error}</p>}
          <div className="flex justify-center mb-6">
            <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <button onClick={handleVerify} disabled={loading || otpCode.length < 6} className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Code"}
          </button>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Didn't receive the code?{" "}
            <button type="button" onClick={handleResend} className="text-primary font-medium hover:underline">
              Resend
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold font-heading text-foreground mb-2">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isLogin ? "Sign in to continue to Rayma AI" : "Join us to take control of your finances"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
              <input type="text" placeholder="Full Name" className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50" onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} required disabled={loading || activeProvider} />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
            <input type="email" placeholder="Email address" className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50" onChange={(e) => setFormData({ ...formData, email: e.target.value })} required disabled={loading || activeProvider} />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
            <input type="password" placeholder="Password" className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50" onChange={(e) => setFormData({ ...formData, password: e.target.value })} required disabled={loading || activeProvider} />
          </div>

          {/* 🚀 NEW: Forgot Password Link */}
          {isLogin && (
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-primary hover:underline font-medium -mt-2">
                Forgot password?
              </Link>
            </div>
          )}

          {error && <p className="text-sm text-destructive text-center bg-destructive/10 py-2 rounded-lg">{error}</p>}

          <button type="submit" disabled={loading || activeProvider} className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <> {isLogin ? "Sign In" : "Sign Up"} <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or continue with</span></div>
        </div>

        <div className="space-y-3">
          {/* 🛡️ MOBILE GUARD: Only show Passkey on the web */}
          {!isNativeMobileApp() && (
            <button type="button" onClick={() => handleProviderSignIn("passkey")} disabled={loading || activeProvider} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-sm font-medium shadow-sm disabled:opacity-50">
              {activeProvider === "passkey" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-5 h-5" />} Sign in with Passkey / Biometrics
            </button>
          )}
          
          {/* 🚀 TEMPORARILY DISABLED OAUTH FOR MVP LAUNCH
          <div className="grid grid-cols-2 gap-3">
            ... Google and Apple buttons ...
          </div> 
          */}
        </div>

        <div className="text-center space-y-4">
          <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-primary hover:underline font-medium">
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
          <p className="text-[10px] text-muted-foreground">
            By continuing, you agree to our <Link to="/terms" className="underline">Terms of Service</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
