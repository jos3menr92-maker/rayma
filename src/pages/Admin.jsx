import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Users, Zap, DollarSign, ShieldCheck, Gift, AlertTriangle, TrendingUp, Activity, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Admin() {

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
<div className="bg-card border border-border rounded-2xl p-6 mt-6">
  <h2 className="text-lg font-bold mb-4">Sponsor Code Management</h2>
  <div className="flex gap-4">
    <input
      type="text"
      placeholder="Enter new sponsor code..."
      className="bg-background border border-border rounded-lg px-4 py-2 flex-grow"
      value={newCode}
      onChange={(e) => setNewCode(e.target.value)}
    />
    <Button onClick={async () => {
      await base44.entities.PromoCode.create({ 
        code: newCode, 
        is_active: true, 
        created_by_role: "admin" 
      });
      setNewCode("");
      alert("Code created!");
    }}>
      Create Code
    </Button>
  </div>
</div>

  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [promoCodes, setPromoCodes] = useState([]);
  const [recentFeedback, setRecentFeedback] = useState([]);
  const [newCode, setNewCode] = useState("");


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

    const [allUsers, allPromoCodes, allFeedback, allLoans, allBills, allTransactions] = await Promise.all([
      base44.entities.User.list(),
      base44.entities.PromoCode.list(),
      base44.entities.Feedback.list("-created_date", 10),
      base44.entities.Loan.list(),
      base44.entities.Bill.list(),
      base44.entities.Transaction.list("-created_date", 500),
    ]);

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
    setPromoCodes(allPromoCodes);
    setRecentFeedback(allFeedback.slice(0, 5));
    setLoading(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (unauthorized) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
      <ShieldCheck className="w-12 h-12 text-destructive" />
      <h1 className="text-xl font-bold text-foreground">Admin Access Only</h1>
      <p className="text-sm text-muted-foreground">You don't have permission to view this page.</p>
      <Button onClick={() => navigate("/")} variant="outline">Go Home</Button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">RAYMA app oversight</p>
          </div>
          <Button size="sm" variant="outline" onClick={loadData} className="rounded-xl gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>

        {/* Key Stats */}
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Overview</h2>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="primary" />
          <StatCard icon={Activity} label="Active Subscriptions" value={stats.annualPassUsers} sub="Annual Pass holders" color="accent" />
          <StatCard icon={Zap} label="Token Users" value={stats.tokenUsers} sub={`${stats.totalTokensSold} tokens held`} color="primary" />
          <StatCard icon={TrendingUp} label="Avg App Rating" value={stats.avgRating} sub="From feedback submissions" color="accent" />
          <StatCard icon={DollarSign} label="Total Loans" value={stats.totalLoans} color="primary" />
          <StatCard icon={DollarSign} label="Total Bills" value={stats.totalBills} color="accent" />
        </div>

        {/* Promo Codes */}
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Promo Codes</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
          {promoCodes.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No promo codes yet.</p>
          ) : promoCodes.map((code, i) => (
            <div key={code.id} className={`flex items-center justify-between px-4 py-3 ${i < promoCodes.length - 1 ? "border-b border-border" : ""}`}>
              <div className="flex items-center gap-3">
                <Gift className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground font-mono">{code.code}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {code.reward_type === "annual_pass" ? "Annual Pass" : `${code.reward_value} tokens`}
                    {" · "}{code.times_used || 0}{code.max_uses ? `/${code.max_uses}` : ""} uses
                  </p>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${code.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                {code.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
        </div>

        {/* Recent Feedback */}
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Recent Feedback</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
          {recentFeedback.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No feedback yet.</p>
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
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Recent Users (top 20)</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
          {users.map((u, i) => (
            <div key={u.id} className={`flex items-center justify-between px-4 py-3 ${i < users.length - 1 ? "border-b border-border" : ""}`}>
              <div>
                <p className="text-sm font-medium text-foreground">{u.full_name || "—"}</p>
                <p className="text-[10px] text-muted-foreground">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {u.annual_pass_expires_at && new Date(u.annual_pass_expires_at) > new Date() && (
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">Pass</span>
                )}
                {(u.ai_tokens || 0) > 0 && (
                  <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-semibold">{u.ai_tokens}T</span>
                )}
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${u.role === "admin" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                  {u.role || "user"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* App Store Readiness */}
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">App Store Readiness</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {[
            { label: "Privacy Policy", status: true, note: "Live at /privacy" },
            { label: "Terms of Service", status: true, note: "Live at /terms" },
            { label: "Financial Disclaimer", status: true, note: "On Support & Profile pages" },
            { label: "Account Deletion", status: true, note: "GDPR-compliant at /delete-account" },
            { label: "10 Languages Supported", status: true, note: "incl. RTL Arabic" },
            { label: "Apple IAP (iOS billing)", status: false, note: "Required before App Store submission" },
            { label: "Google Play Billing", status: false, note: "Required before Play Store submission" },
            { label: "Privacy Nutrition Label", status: false, note: "File in App Store Connect" },
            { label: "Push Notifications", status: true, note: "Permission prompt shown after 5s" },
            { label: "Onboarding Flow", status: true, note: "First-run wizard active" },
            { label: "GDPR Data Export", status: true, note: "Available at /data-export" },
          ].map((item, i, arr) => (
            <div key={item.label} className={`flex items-center gap-3 px-4 py-3 ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
              <span className={`text-base shrink-0 ${item.status ? "text-green-500" : "text-amber-400"}`}>
                {item.status ? "✅" : "⚠️"}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.note}</p>
              </div>
            </div>
          ))}
        </div>

      </motion.div>
    </div>
  );
}