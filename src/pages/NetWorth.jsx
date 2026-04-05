import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit3, TrendingUp, TrendingDown, Camera, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const fmt = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);

const ASSET_TYPES = [
  { value: "cash", label: "💵 Cash / Checking" },
  { value: "savings", label: "🏦 Savings" },
  { value: "investment", label: "📈 Investment / Retirement" },
  { value: "property", label: "🏠 Property" },
  { value: "other", label: "📦 Other" },
];

const TYPE_ICONS = { cash: "💵", savings: "🏦", investment: "📈", property: "🏠", other: "📦" };

const emptyAsset = { name: "", amount: "", type: "cash", notes: "" };

export default function NetWorth() {
  const [assets, setAssets] = useState([]);
  const [loans, setLoans] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);

  const [assetDialog, setAssetDialog] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [assetForm, setAssetForm] = useState(emptyAsset);
  const [saving, setSaving] = useState(false);
  const [snapshotting, setSnapshotting] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [assetData, loanData, goalsData, snapshotData] = await Promise.all([
      base44.entities.Asset.list("-created_date", 100),
      base44.entities.Loan.list("-created_date", 100),
      base44.entities.SavingsGoal.list("-created_date", 100),
      base44.entities.NetWorthSnapshot.list("snapshot_date", 60),
    ]);
    setAssets(assetData);
    setLoans(loanData.filter(l => l.status !== "paid_off"));
    setSavingsGoals(goalsData);
    setSnapshots(snapshotData);
    setLoading(false);
  }

  // Calculations
  const assetTotal = assets.reduce((s, a) => s + (a.amount || 0), 0);
  const savingsTotal = savingsGoals.reduce((s, g) => s + (g.current_saved || 0), 0);
  const totalAssets = assetTotal + savingsTotal;
  const totalLiabilities = loans.reduce((s, l) => s + (l.current_balance || 0), 0);
  const netWorth = totalAssets - totalLiabilities;

  // Chart data: historical snapshots + today
  const chartData = [
    ...snapshots.map(s => ({
      date: s.snapshot_date,
      netWorth: s.net_worth,
      assets: s.total_assets,
      liabilities: s.total_liabilities,
    })),
    {
      date: new Date().toISOString().split("T")[0],
      netWorth,
      assets: totalAssets,
      liabilities: totalLiabilities,
      isToday: true,
    },
  ].sort((a, b) => a.date.localeCompare(b.date));

  // Deduplicate by date, prefer today's live data
  const uniqueChart = Object.values(
    chartData.reduce((acc, item) => {
      acc[item.date] = item;
      return acc;
    }, {})
  ).sort((a, b) => a.date.localeCompare(b.date));

  async function saveSnapshot() {
    setSnapshotting(true);
    const today = new Date().toISOString().split("T")[0];
    // Upsert: delete existing today snapshot if exists
    const existing = snapshots.find(s => s.snapshot_date === today);
    if (existing) await base44.entities.NetWorthSnapshot.delete(existing.id);
    await base44.entities.NetWorthSnapshot.create({
      snapshot_date: today,
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      net_worth: netWorth,
    });
    setSnapshotting(false);
    loadData();
  }

  function openAddAsset() {
    setEditingAsset(null);
    setAssetForm(emptyAsset);
    setAssetDialog(true);
  }

  function openEditAsset(asset) {
    setEditingAsset(asset);
    setAssetForm({ name: asset.name, amount: asset.amount, type: asset.type || "cash", notes: asset.notes || "" });
    setAssetDialog(true);
  }

  async function handleSaveAsset(e) {
    e.preventDefault();
    setSaving(true);
    const data = { ...assetForm, amount: parseFloat(assetForm.amount) || 0 };
    if (editingAsset) {
      await base44.entities.Asset.update(editingAsset.id, data);
    } else {
      await base44.entities.Asset.create(data);
    }
    setSaving(false);
    setAssetDialog(false);
    loadData();
  }

  async function handleDeleteAsset(id) {
    await base44.entities.Asset.delete(id);
    loadData();
  }

  const isPositive = netWorth >= 0;
  const trend = uniqueChart.length >= 2
    ? uniqueChart[uniqueChart.length - 1].netWorth - uniqueChart[uniqueChart.length - 2].netWorth
    : null;

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold font-heading text-foreground">Net Worth</h1>
          <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={saveSnapshot} disabled={snapshotting}>
            <Camera className="w-3.5 h-3.5 mr-1" />
            {snapshotting ? "Saving..." : "Save Snapshot"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-5">Your complete financial picture</p>

        {/* Net Worth Hero */}
        <div className={`rounded-3xl p-5 mb-5 ${isPositive ? "bg-primary/10 border border-primary/20" : "bg-destructive/10 border border-destructive/20"}`}>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Total Net Worth</p>
          <div className="flex items-end gap-3">
            <p className={`text-4xl font-bold font-heading ${isPositive ? "text-primary" : "text-destructive"}`}>
              {fmt(netWorth)}
            </p>
            {trend !== null && (
              <div className={`flex items-center gap-1 mb-1 text-sm font-medium ${trend >= 0 ? "text-primary" : "text-destructive"}`}>
                {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {trend >= 0 ? "+" : ""}{fmt(trend)}
              </div>
            )}
          </div>
          <div className="flex gap-6 mt-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Assets</p>
              <p className="text-base font-semibold font-heading text-foreground">{fmt(totalAssets)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Liabilities</p>
              <p className="text-base font-semibold font-heading text-destructive">{fmt(totalLiabilities)}</p>
            </div>
          </div>
        </div>

        {/* Trend Chart */}
        {uniqueChart.length >= 2 && (
          <div className="bg-card border border-border rounded-3xl p-4 mb-5">
            <h2 className="text-sm font-semibold font-heading text-foreground mb-4">Net Worth Over Time</h2>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={uniqueChart} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={d => {
                    const dt = new Date(d + "T00:00:00");
                    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={v => `$${Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`}
                  width={48}
                />
                <Tooltip
                  formatter={(v) => [fmt(v), "Net Worth"]}
                  labelFormatter={d => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="netWorth"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-muted-foreground text-center mt-2">Click "Save Snapshot" regularly to build your trend history</p>
          </div>
        )}

        {uniqueChart.length < 2 && (
          <div className="bg-card border border-border rounded-2xl p-4 mb-5 text-center">
            <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Save snapshots over time to see your trend chart</p>
          </div>
        )}

        {/* Assets Breakdown */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold font-heading text-foreground">Assets</h2>
            <Button size="sm" className="rounded-xl" onClick={openAddAsset}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Account
            </Button>
          </div>

          <div className="space-y-2">
            {assets.map((asset, i) => (
              <motion.div key={asset.id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-card border border-border rounded-xl p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{TYPE_ICONS[asset.type] || "📦"}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{asset.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{asset.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-primary">{fmt(asset.amount)}</p>
                  <button onClick={() => openEditAsset(asset)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDeleteAsset(asset.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}

            {/* Savings Goals (read-only) */}
            {savingsGoals.filter(g => (g.current_saved || 0) > 0).map((goal) => (
              <div key={goal.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between opacity-75">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🏦</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{goal.name}</p>
                    <p className="text-xs text-muted-foreground">Savings Goal</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-primary">{fmt(goal.current_saved)}</p>
              </div>
            ))}

            {assets.length === 0 && savingsGoals.filter(g => (g.current_saved || 0) > 0).length === 0 && (
              <div className="text-center py-6">
                <Wallet className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Add accounts to track your assets</p>
              </div>
            )}
          </div>
        </div>

        {/* Liabilities */}
        {loans.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold font-heading text-foreground mb-3">Liabilities</h2>
            <div className="space-y-2">
              {loans.map((loan) => (
                <div key={loan.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{loan.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{loan.category || "loan"}</p>
                  </div>
                  <p className="text-sm font-bold text-destructive">-{fmt(loan.current_balance)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Asset Dialog */}
      <Dialog open={assetDialog} onOpenChange={setAssetDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingAsset ? "Edit Account" : "Add Account / Asset"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveAsset} className="space-y-3 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Name *</Label>
              <Input placeholder="e.g. Checking Account" value={assetForm.name}
                onChange={e => setAssetForm(f => ({ ...f, name: e.target.value }))} required className="mt-1 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Amount *</Label>
                <Input type="number" step="0.01" placeholder="$0" value={assetForm.amount}
                  onChange={e => setAssetForm(f => ({ ...f, amount: e.target.value }))} required className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={assetForm.type} onValueChange={v => setAssetForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Input placeholder="Optional" value={assetForm.notes}
                onChange={e => setAssetForm(f => ({ ...f, notes: e.target.value }))} className="mt-1 rounded-xl" />
            </div>
            <Button type="submit" disabled={saving} className="w-full rounded-xl">
              {saving ? "Saving..." : editingAsset ? "Save Changes" : "Add Asset"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}