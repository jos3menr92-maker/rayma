import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { t } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit3, TrendingUp, PieChart as PieIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const TYPE_ICONS = { cash: "💵", investment: "📈", property: "🏠", savings: "🏦", other: "📦" };
const TYPE_COLORS = {
  cash: "hsl(var(--primary))",
  investment: "hsl(var(--chart-2))",
  property: "hsl(var(--chart-3))",
  savings: "hsl(var(--chart-4))",
  other: "hsl(var(--muted-foreground))",
};

const emptyForm = { name: "", amount: "", type: "cash", notes: "" };

export default function AssetDashboard() {
  const { loans, userProfile, loading: contextLoading } = useFinancialData();
  const { lang } = useLanguage();
  const { formatCurrency: fmt } = useCurrency();

  const T = useMemo(() =>
    (key, fallback) => {
      const translated = t(lang, key);
      return translated !== key ? translated : fallback;
    },
    [lang]
  );
  const [assets, setAssets] = useState([]);
  const [localLoading, setLocalLoading] = useState(true);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { 
    if (userProfile?.id) loadAssets(); 
  }, [userProfile]);

  async function loadAssets() {
    setLocalLoading(true);
    const { data } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', userProfile.id) // 🔒 Security lock!
      .order('created_at', { ascending: false });
      
    setAssets(data || []);
    setLocalLoading(false);
  }

  // 🧮 Net Worth Math
  const activeLoans = loans.filter(x => x.status !== "paid_off");
  const totalAssets = assets.reduce((s, a) => s + (a.amount || 0), 0);
  const totalLiabilities = activeLoans.reduce((s, l) => s + (l.current_balance || 0), 0);
  const netWorth = totalAssets - totalLiabilities;

  const pieData = assets.map(a => ({ name: a.name, value: a.amount || 0, type: a.type }));
  const byType = assets.reduce((acc, a) => {
    const t = a.type || "other";
    acc[t] = (acc[t] || 0) + (a.amount || 0);
    return acc;
  }, {});

  function openAdd() { setEditing(null); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(a) { setEditing(a); setForm({ name: a.name, amount: a.amount, type: a.type || "cash", notes: a.notes || "" }); setDialogOpen(true); }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    
    const payload = { 
      ...form, 
      amount: parseFloat(form.amount) || 0,
      user_id: userProfile.id 
    };

    if (editing) {
      await supabase.from('assets').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('assets').insert([payload]);
    }
    
    setSaving(false);
    setDialogOpen(false);
    loadAssets();
  }

  async function handleDelete(id) {
    await supabase.from('assets').delete().eq('id', id);
    loadAssets();
  }

  if (contextLoading || localLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold font-heading text-foreground">{T("assets", "Assets")}</h1>
          <Button size="sm" className="rounded-xl" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> {T("add", "Add")}</Button>
        </div>
        <p className="text-sm text-muted-foreground mb-6">{T("trackOwnedAssets", "Track what you own")}</p>

        {/* Net Worth Summary */}
        <div className="bg-card border border-border rounded-3xl p-5 mb-6 text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{T("netWorth", "Net Worth")}</p>
          <p className={`text-3xl font-bold font-heading mb-1 ${netWorth >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(netWorth)}</p>
          <div className="flex justify-center gap-6 mt-3">
            <div>
              <p className="text-xs text-muted-foreground">{T("assets2", "Assets")}</p>
              <p className="text-sm font-semibold text-foreground">{fmt(totalAssets)}</p>
            </div>
            <div className="w-px bg-border" />
            <div>
              <p className="text-xs text-muted-foreground">{T("liabilities", "Liabilities")}</p>
              <p className="text-sm font-semibold text-destructive">{fmt(totalLiabilities)}</p>
            </div>
          </div>
        </div>

        {/* Pie Chart */}
        {assets.length > 0 && (
          <div className="bg-card border border-border rounded-3xl p-4 mb-6">
            <h2 className="text-sm font-semibold font-heading text-foreground mb-2">{T("assetBreakdown", "Asset Breakdown")}</h2>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={TYPE_COLORS[entry.type] || TYPE_COLORS.other} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.entries(byType).map(([type, amount]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: TYPE_COLORS[type] || TYPE_COLORS.other }} />
                  <span className="text-xs text-muted-foreground capitalize">{type}</span>
                  <span className="text-xs font-semibold text-foreground ml-auto">{fmt(amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Asset List */}
        <div className="space-y-3">
          <AnimatePresence>
            {assets.map((asset, i) => (
              <motion.div key={asset.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                    {TYPE_ICONS[asset.type] || "📦"}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{asset.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{asset.type}{asset.notes ? ` · ${asset.notes}` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-foreground text-sm">{fmt(asset.amount)}</p>
                  <button onClick={() => openEdit(asset)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(asset.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {assets.length === 0 && (
            <div className="text-center py-12">
              <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{T("noAssets", "No assets yet. Add your cash, investments, and property.")}</p>
            </div>
          )}
        </div>
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? T("editAsset", "Edit Asset") : T("addAsset", "Add Asset")}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-3 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground">{T("nameRequired", "Name *")}</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 401k, Home, Savings" required className="mt-1 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">{T("valueRequired", "Value ($) *")}</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" required className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{T("type", "Type")}</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["cash","savings","investment","property","other"].map(t => (
                      <SelectItem key={t} value={t}>{TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{T("notes", "Notes")}</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder={T("optional", "Optional")} className="mt-1 rounded-xl" />
            </div>
            <Button type="submit" disabled={saving} className="w-full rounded-xl">
              {saving ? T("saving", "Saving...") : editing ? T("saveChanges", "Save Changes") : T("addAssetBtn", "Add Asset")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}