import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, AlertTriangle, CheckCircle2, TrendingDown } from "lucide-react";
import { startOfMonth, endOfMonth, format, isWithinInterval, parseISO } from "date-fns";

const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

const CATEGORY_COLORS = {
  food: "#f59e0b", transport: "#3b82f6", utilities: "#8b5cf6", subscriptions: "#ec4899",
  health: "#10b981", insurance: "#6366f1", rent: "#f97316", loan_payment: "#ef4444",
  savings: "#22c55e", entertainment: "#a855f7", shopping: "#14b8a6", other: "#64748b"
};

const emptyForm = { name: "", category_key: "other", monthly_limit: "" };

export default function BudgetDashboard() {
  const { lang } = useLanguage();

  const T = useMemo(() =>
    (key, fallback) => {
      const translated = t(lang, key);
      return translated !== key ? translated : fallback;
    },
    [lang]
  );
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [bills, setBills] = useState([]);
  const [loans, setLoans] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [b, tx, bills, loans] = await Promise.all([
      base44.entities.BudgetCategory.list(),
      base44.entities.Transaction.list("-date", 200),
      base44.entities.Bill.filter({ is_active: true }),
      base44.entities.Loan.filter({ status: "active" }),
    ]);
    setBudgets(b);
    setTransactions(tx);
    setBills(bills);
    setLoans(loans);
    setLoading(false);
  };

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowDialog(true); };
  const openEdit = (b) => { setEditing(b); setForm({ ...b, monthly_limit: String(b.monthly_limit) }); setShowDialog(true); };

  const save = async () => {
    const data = { ...form, monthly_limit: parseFloat(form.monthly_limit) || 0, color: CATEGORY_COLORS[form.category_key] || "#64748b" };
    if (editing) await base44.entities.BudgetCategory.update(editing.id, data);
    else await base44.entities.BudgetCategory.create(data);
    setShowDialog(false);
    fetchAll();
  };

  const getSpent = (categoryKey) => {
    return transactions
      .filter(tx => {
        if (tx.category !== categoryKey) return false;
        try { return isWithinInterval(parseISO(tx.date), { start: monthStart, end: monthEnd }); } catch { return false; }
      })
      .reduce((s, tx) => s + Math.abs(tx.amount || 0), 0);
  };

  // Auto-calculate fixed expenses from bills and loans
  const fixedExpenses = [
    ...bills.map(b => ({ name: b.name, amount: b.amount, category: b.category })),
    ...loans.map(l => ({ name: l.name + " (loan)", amount: l.monthly_payment, category: "loan_payment" })),
  ];

  const totalBudgeted = budgets.reduce((s, b) => s + (b.monthly_limit || 0), 0);
  const totalSpent = budgets.reduce((s, b) => s + getSpent(b.category_key), 0);
  const totalFixed = fixedExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  const categories = Object.keys(CATEGORY_COLORS);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">{T("budgetDashboard", "Budget Dashboard")}</h1>
          <p className="text-sm text-muted-foreground">{format(now, "MMMM yyyy")}</p>
        </div>
        <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" />{T("addBudget", "Add Budget")}</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{T("budgeted", "Budgeted")}</p>
            <p className="text-lg font-bold text-foreground">{fmt(totalBudgeted)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{T("spent", "Spent")}</p>
            <p className={`text-lg font-bold ${totalSpent > totalBudgeted ? "text-destructive" : "text-primary"}`}>{fmt(totalSpent)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{T("fixedBills", "Fixed Bills")}</p>
            <p className="text-lg font-bold text-orange-400">{fmt(totalFixed)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Categories */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">{T("loading", "Loading...")}</div>
      ) : budgets.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <TrendingDown className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">{T("noBudgets", "No budgets set. Add a category to start tracking.")}</p>
            <Button className="mt-4" onClick={openAdd}><Plus className="w-4 h-4 mr-1" />{T("addBudgetCategory", "Add Budget Category")}</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{T("variableBudgets", "Variable Budgets")}</h2>
          {budgets.map(b => {
            const spent = getSpent(b.category_key);
            const pct = b.monthly_limit > 0 ? Math.min((spent / b.monthly_limit) * 100, 100) : 0;
            const over = spent > b.monthly_limit;
            const color = CATEGORY_COLORS[b.category_key] || "#64748b";
            return (
              <Card key={b.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="font-medium text-foreground text-sm">{b.name}</span>
                      {over && <Badge variant="destructive" className="text-xs py-0">{T("overBudget", "Over Budget")}</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{fmt(spent)} / {fmt(b.monthly_limit)}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(b)}><Pencil className="w-3 h-3" /></Button>
                    </div>
                  </div>
                  <Progress value={pct} className="h-2" style={{ "--progress-color": over ? "#ef4444" : color }} />
                  <p className="text-xs text-muted-foreground mt-1">
                    {over ? `${fmt(spent - b.monthly_limit)} ${T("overLimit", "over limit")}` : `${fmt(b.monthly_limit - spent)} ${T("remaining", "remaining")}`}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Fixed Expenses from Bills & Loans */}
      {fixedExpenses.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{T("fixedExpenses", "Fixed Expenses (from Bills & Loans)")}</h2>
          <div className="space-y-2">
            {fixedExpenses.map((e, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[e.category] || "#64748b" }} />
                  <span className="text-sm text-foreground">{e.name}</span>
                  <Badge variant="outline" className="text-xs py-0">{e.category}</Badge>
                </div>
                <span className="text-sm font-semibold text-destructive">{fmt(e.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>{editing ? T("editBudget", "Edit Budget") : T("addBudgetCategory", "Add Budget Category")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{T("label", "Label")}</Label><Input className="mt-1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={T("labelPlaceholder", "e.g. Groceries")} /></div>
            <div><Label>{T("category", "Category")}</Label>
              <Select value={form.category_key} onValueChange={v => setForm({ ...form, category_key: v, name: form.name || v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>{T("monthlyLimit", "Monthly Limit ($)")}</Label><Input className="mt-1" type="number" value={form.monthly_limit} onChange={e => setForm({ ...form, monthly_limit: e.target.value })} placeholder="500" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>{T("cancel", "Cancel")}</Button><Button onClick={save}>{T("save", "Save")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}