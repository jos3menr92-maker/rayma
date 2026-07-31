import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/lib/supabaseClientFrontend";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Users, Zap, DollarSign, ShieldCheck, Gift, TrendingUp, Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import BugReportViewer from "@/components/admin/BugReportViewer";

export default function Admin() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [promoCodes, setPromoCodes] = useState([]);
  const [recentFeedback, setRecentFeedback] = useState([]);
  const [newCode, setNewCode] = useState("");
  const [rewardType, setRewardType] = useState("tokens");
  const [rewardValue, setRewardValue] = useState(100);
  const [maxUses, setMaxUses] = useState("");
  const [codeMode, setCodeMode] = useState("promo"); // "promo" | "diagnostic"
  const [generatedCode, setGeneratedCode] = useState(null);
  const [grantEmail, setGrantEmail] = useState("");
  const [grantAmount, setGrantAmount] = useState(100);
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantMsg, setGrantMsg] = useState(null);

  function StatCard({ icon: Icon, label, value, sub, color = "primary" }) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className={`w-9 h-9 rounded-xl bg-${color}/10 flex items-center justify-center mb-3`}>
          <Icon className={`w-4 h-4 text-${color}`} />
        </div>
        <p className="text-2xl font-bold font-heading text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-1 opacity-70">{sub}</p>}
      </div>
    );
  }

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const me = await base44.auth.me();
    if (me?.role !== "admin") {
      setUnauthorized(true);
      setLoading(false);
      return;
    }

    const [allUsers, allPromoCodes, allFeedback, loansRes, billsRes, transactionsRes] = await Promise.all([
      base44.entities.User.list(),
      base44.entities.PromoCode.list("-created_date", 50),
      base44.entities.Feedback.list("-created_date", 10),
      supabase.from("loans").select("id"),
      supabase.from("bills").select("id"),
      supabase.from("transactions").select("id").order("created_at", { ascending: false }).limit(500),
    ]);

    const allPromoCodes_data = allPromoCodes || [];
    const allLoans = loansRes.data || [];
    const allBills = billsRes.data || [];
    const allTransactions = transactionsRes.data || [];

    const annualPassUsers = allUsers.filter(u => u.annual_pass_expires_at && new Date(u.annual_pass_expires_at) > new Date());
    const tokenUsers = allUsers.filter(u => (u.ai_tokens || 0) > 0);
    const totalTokensSold = allUsers.reduce((s, u) => s + (u.ai_tokens || 0), 0);

    setStats({
      totalUsers: allUsers.length,
      annualPassUsers: annualPassUsers.length,
      tokenUsers: tokenUsers.length,
      totalTokensSold,
      totalLoans: allLoans.length,
      totalBills: allBills.length,
      totalTransactions: allTransactions.length,
      avgRating: allFeedback.length > 0
        ? (allFeedback.reduce((s, f) => s + (f.rating || 0), 0) / allFeedback.length).toFixed(1)
        : "—",
    });

    setUsers(allUsers.slice(0, 20));
    setPromoCodes(allPromoCodes_data);
    setRecentFeedback(allFeedback.slice(0, 5));
    setLoading(false);
  }

  const generateDiagnosticCode = () => {
    const num = Math.floor(100000 + Math.random() * 900000).toString();
    return `${num.substring(0, 3)}-${num.substring(3, 6)}`;
  };

  const deactivateCode = async (codeId) => {
    try {
      await base44.entities.PromoCode.update(codeId, { is_active: false });
      loadData();
    } catch (error) {
      alert("Error deactivating code: " + (error.message || "Unknown error"));
    }
  };

  const handleCreateCode = async () => {
    // Enforce max 50 active promo codes at a time
    try {
      const activeCodes = await base44.entities.PromoCode.filter({ is_active: true }, '-created_date', 100);
      if (activeCodes.length >= 50) {
        alert(T("maxCodesReached", "Maximum of 50 active codes. Deactivate old ones first."));
        return;
      }
    } catch (e) { /* non-fatal — proceed */ }

    if (codeMode === "diagnostic") {
      // Auto-generate a one-time, 30-minute diagnostic code
      const diagCode = generateDiagnosticCode();
      try {
        await base44.entities.PromoCode.create({
          code: diagCode,
          reward_type: "diagnostic_access",
          reward_value: null,
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          max_uses: 1,
          is_active: true,
          times_used: 0,
          redeemed_by: [],
          notes: `Diagnostic session generated by admin`
        });
        setGeneratedCode(diagCode);
        loadData();
      } catch (error) {
        alert("Error creating diagnostic code: " + (error.message || "Unknown error"));
      }
    } else {
      if (!newCode) return;
      try {
        await base44.entities.PromoCode.create({
          code: newCode.toUpperCase().trim(),
          reward_type: rewardType,
          reward_value: rewardType === "tokens" ? Number(rewardValue) : null,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          max_uses: maxUses ? Number(maxUses) : null,
          is_active: true,
          times_used: 0,
          redeemed_by: []
        });
        setNewCode("");
        setRewardValue(100);
        setMaxUses("");
        loadData();
      } catch (error) {
        alert("Error creating code: " + (error.message || "Unknown error"));
      }
    }
  };

  const handleGrantTokens = async () => {
    setGrantMsg(null);
    if (!grantEmail.trim()) return;
    setGrantLoading(true);
    try {
      const all = await base44.entities.User.list();
      const target = all.find(u => (u.email || "").toLowerCase() === grantEmail.trim().toLowerCase());
      if (!target) {
        setGrantMsg({ type: "error", text: T("userNotFound", "User not found.") });
        setGrantLoading(false);
        return;
      }
      const next = (target.ai_tokens || 0) + Number(grantAmount || 0);
      await base44.entities.User.update(target.id, { ai_tokens: next });
      const msg = T("grantSuccess", "Granted {amount} tokens to {email} (now {total}).")
        .replace("{amount}", grantAmount).replace("{email}", target.email).replace("{total}", next);
      setGrantMsg({ type: "success", text: msg });
      setGrantEmail("");
      loadData();
    } catch (error) {
      setGrantMsg({ type: "error", text: error.message || T("grantFailed", "Failed to grant tokens.") });
    } finally {
      setGrantLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (unauthorized) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
      <ShieldCheck className="w-12 h-12 text-destructive" />
      <h1 className="text-xl font-bold text-foreground">{T("adminAccessOnly", "Admin Access Only")}</h1>
      <p className="text-sm text-muted-foreground">{T("noPermission", "You don't have permission to view this page.")}</p>
      <Button onClick={() => navigate("/")} variant="outline">{T("goHome", "Go Home")}</Button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground">{T("adminPanel", "Admin Panel")}</h1>
            <p className="text-sm text-muted-foreground">{T("raymaAppOversight", "Rayma AI app oversight")}</p>
          </div>
          <Button size="sm" variant="outline" onClick={loadData} className="rounded-xl gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            {T("refresh", "Refresh")}
          </Button>
        </div>

        {/* Unified Code Management Section */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold mb-1">{T("codeManagement", "Code Management")}</h2>
          <p className="text-xs text-muted-foreground mb-4">
            {T("codeManagementDesc", "Create promo codes (tokens, annual pass, 30-day game access) or generate one-time diagnostic codes. Max 50 active codes at a time. Deactivate any code to cancel it.")}
          </p>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-4 p-1 bg-muted/50 rounded-xl">
            <button
              onClick={() => { setCodeMode("promo"); setGeneratedCode(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${codeMode === "promo" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              {T("promoCode", "Promo Code")}
            </button>
            <button
              onClick={() => { setCodeMode("diagnostic"); setGeneratedCode(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${codeMode === "diagnostic" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              {T("diagnosticCode", "Diagnostic Code")}
            </button>
          </div>

          {codeMode === "promo" ? (
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder={T("enterNewCode", "Enter new code...")}
                className="bg-background border border-border rounded-xl px-4 py-3 w-full"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
              />
              <div className="flex gap-2">
                <select
                  className="bg-background border border-border rounded-xl px-3 py-3 text-sm flex-1"
                  value={rewardType}
                  onChange={(e) => setRewardType(e.target.value)}
                >
                  <option value="tokens">Tokens</option>
                  <option value="annual_pass">Annual Pass</option>
                  <option value="game_access">{T("gameAccess30d", "Game Access (30 days)")}</option>
                </select>
                {rewardType === "tokens" && (
                  <input
                    type="number"
                    placeholder="Tokens"
                    className="bg-background border border-border rounded-xl px-3 py-3 text-sm w-28"
                    value={rewardValue}
                    onChange={(e) => setRewardValue(e.target.value)}
                  />
                )}
              </div>
              <input
                type="number"
                placeholder={T("maxUsesOptional", "Max uses (blank = unlimited)")}
                className="bg-background border border-border rounded-xl px-4 py-3 w-full text-sm"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
              />
              <Button onClick={handleCreateCode} className="w-full rounded-xl h-12 font-semibold">
                {T("createCode", "Create Code")}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {T("diagnosticCodeInfo", "Generates a single-use code that expires in 30 minutes. Share it with the user to unlock the Diagnostics & Security Console for one session.")}
              </p>
              <Button onClick={handleCreateCode} className="w-full rounded-xl h-12 font-semibold">
                {T("generateDiagnosticCode", "Generate One-Time Diagnostic Code")}
              </Button>
              {generatedCode && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-2">{T("shareThisCode", "Share this code (expires in 30 min):")}</p>
                  <p className="text-3xl font-bold tracking-widest text-primary font-mono">{generatedCode}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Grant AI Tokens */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold mb-1">{T("grantTokens", "Grant AI Tokens")}</h2>
          <p className="text-xs text-muted-foreground mb-4">
            {T("grantTokensDesc", "Manually add AI tokens to any user's account — useful for fixing a purchase that didn't sync or compensating a tester.")}
          </p>
          <div className="flex flex-col gap-3">
            <input
              type="email"
              placeholder={T("userEmail", "User email")}
              className="bg-background border border-border rounded-xl px-4 py-3 w-full"
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
            />
            <div className="flex gap-2">
              <input
                type="number"
                placeholder={T("amount", "Amount")}
                className="bg-background border border-border rounded-xl px-4 py-3 text-sm flex-1"
                value={grantAmount}
                onChange={(e) => setGrantAmount(e.target.value)}
              />
              <Button onClick={handleGrantTokens} disabled={grantLoading || !grantEmail.trim()} className="rounded-xl px-6 font-semibold">
                {grantLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : T("grant", "Grant")}
              </Button>
            </div>
            {grantMsg && (
              <p className={`text-xs ${grantMsg.type === "success" ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>{grantMsg.text}</p>
            )}
          </div>
        </div>

        {/* Bug Reports */}
        <BugReportViewer />

        {/* Key Stats */}
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">{T("overview", "Overview")}</h2>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard icon={Users} label={T("totalUsers", "Total Users")} value={stats.totalUsers} color="primary" />
          <StatCard icon={Activity} label={T("activeSubscriptions", "Active Subscriptions")} value={stats.annualPassUsers} sub={T("annualPassHolders", "Annual Pass holders")} color="accent" />
          <StatCard icon={Zap} label={T("tokenUsers", "Token Users")} value={stats.tokenUsers} sub={`${stats.totalTokensSold} ${T("tokensHeld", "tokens held")}`} color="primary" />
          <StatCard icon={TrendingUp} label={T("avgAppRating", "Avg App Rating")} value={stats.avgRating} sub={T("fromFeedback", "From feedback submissions")} color="accent" />
          <StatCard icon={DollarSign} label={T("totalLoans", "Total Loans")} value={stats.totalLoans} color="primary" />
          <StatCard icon={DollarSign} label={T("totalBills", "Total Bills")} value={stats.totalBills} color="accent" />
        </div>

        {/* All Codes */}
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">{T("allCodes", "All Codes")}</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
          {promoCodes.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">{T("noCodesYet", "No codes yet.")}</p>
          ) : promoCodes.map((code, i) => (
            <div key={code.id} className={`flex items-center justify-between px-4 py-3 ${i < promoCodes.length - 1 ? "border-b border-border" : ""}`}>
              <div className="flex items-center gap-3">
                <Gift className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground font-mono">{code.code}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {code.reward_type === "annual_pass" ? "Annual Pass" 
                      : code.reward_type === "game_access" ? T("gameAccess30d", "Game Access (30 days)")
                      : code.reward_type === "diagnostic_access" ? "Diagnostic Access" 
                      : `${code.reward_value || 0} tokens`}
                    {code.max_uses ? ` · ${code.times_used || 0}/${code.max_uses} used` : ` · ${code.times_used || 0} used`}
                    {code.reward_type === "diagnostic_access" && ` · ${new Date(code.expires_at) > new Date() ? Math.ceil((new Date(code.expires_at) - new Date()) / 60000) + "m left" : "expired"}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {code.is_active && (
                  <button
                    onClick={() => deactivateCode(code.id)}
                    className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                  >
                    {T("deactivate", "Deactivate")}
                  </button>
                )}
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${code.is_active && new Date(code.expires_at) > new Date() ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                  {code.is_active && new Date(code.expires_at) > new Date() ? T("active", "Active") : T("inactive", "Inactive")}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Feedback */}
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">{T("recentFeedback", "Recent Feedback")}</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
          {recentFeedback.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">{T("noFeedbackYet", "No feedback yet.")}</p>
          ) : recentFeedback.map((fb, i) => (
            <div key={fb.id} className={`px-4 py-3 ${i < recentFeedback.length - 1 ? "border-b border-border" : ""}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-foreground capitalize">{fb.category || "general"}</span>
                <span className="text-xs text-amber-500">{"★".repeat(fb.rating || 0)}{"☆".repeat(5 - (fb.rating || 0))}</span>
              </div>
              {fb.message && <p className="text-xs text-muted-foreground leading-relaxed">{fb.message}</p>}
            </div>
          ))}
        </div>

        {/* Users Table */}
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">{T("recentUsers", "Recent Users (top 20)")}</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
          {users.map((u, i) => (
            <div key={u.id} className={`flex items-center justify-between px-4 py-3 ${i < users.length - 1 ? "border-b border-border" : ""}`}>
              <div>
                <p className="text-sm font-medium text-foreground">{u.full_name || "—"}</p>
                <p className="text-[10px] text-muted-foreground">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${u.role === "admin" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                  {u.role || "user"}
                </span>
              </div>
            </div>
          ))}
        </div>

      </motion.div>
    </div>
  );
}