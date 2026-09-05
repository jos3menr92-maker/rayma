import { useState, useMemo } from "react";
import { createRecord, updateRecord, deleteRecord } from "@/lib/supabaseHelpers";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useT } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import LogSuggestionStrip from "@/components/forms/LogSuggestionStrip";
import { computeBudgetPreview } from "@/utils/logPreviewMath";
import { monthlyBillAmount, monthSpentByCategory } from "@/utils/financeMath";
import { monthlyObligation } from "@/utils/loanEngine";

const CATEGORY_COLORS = {
  food: "#f59e0b", transport: "#3b82f6", utilities: "#8b5cf6", subscriptions: "#ec4899",
  health: "#10b981", insurance: "#6366f1", rent: "#f97316", loan_payment: "#ef4444",
  savings: "#22c55e", entertainment: "#a855f7", shopping: "#14b8a6", other: "#64748b"
};

function getPacingStatus(spent, limit, dayOfMonth, daysInMonth) {
  if (limit <= 0) return { color: "bg-slate-400", label: "No Limit", pacingPct: 0 };
  const spendRatio = spent / limit;
  const timeRatio = daysInMonth > 0 ? dayOfMonth / daysInMonth : 1;
  if (spendRatio > 1) return { color: "bg-destructive", label: "Over Budget", pacingPct: spendRatio };
  const pacing = timeRatio > 0 ? spendRatio / timeRatio : spendRatio;
  if (pacing <= 1.0) return { color: "bg-primary", label: "On Track", pacingPct: pacing };
  if (pacing <= 1.25) return { color: "bg-amber-500", label: "Watch Out", pacingPct: pacing };
  return { color: "bg-destructive", label: "Over Pace", pacingPct: pacing };
}

const emptyForm = { name: "", category_key: "other", monthly_limit: "" };

export default function BudgetDashboard() {
  const T = useT();
  const { formatCurrency: fmt } = useCurrency();
  const { bills, loans, budgetCategories: budgets, transactions, transactionSplits, loading, reload } = useFinancialData();
  const { toast } = useToast();

  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showConfirm, setShowConfirm] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState(null);

  const now = new Date();

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      name: b.name,
      category_key: b.category_key,
      monthly_limit: String(b.monthly_limit),
    });
    setShowDialog(true);
  };

  const save = async () => {
    const data = {
      name: form.name,
      category_key: form.category_key,
      monthly_limit: parseFloat(form.monthly_limit) || 0,
      color: CATEGORY_COLORS[form.category_key] || "#64748b",
    };

    try {
      if (editing) {
        await updateRecord('budget_categories', editing.id, data);
      } else {
        await createRecord('budget_categories', data);
      }
      setShowDialog(false);
      reload();
    } catch (err) {
      toast({ title: T("saveFailed", "Save failed"), description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = (b) => {
    setBudgetToDelete(b);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (!budgetToDelete) return;
    try {
      await deleteRecord('budget_categories', budgetToDelete.id);
    } catch (err) {
      toast({ title: T("deleteFailed", "Delete failed"), description: err.message, variant: "destructive" });
    }
    setBudgetToDelete(null);
    setShowConfirm(false);
    reload();
  };

  // Shared spending brain (financeMath): split rows are the source of truth,
  // a parent tx only counts when it has zero splits.
  const spentByCat = useMemo(
    () => monthSpentByCategory({ transactions, transactionSplits }),
    [transactions, transactionSplits]
  );
  const getSpent = (categoryKey) => spentByCat[categoryKey] || 0;

  const activeBills = useMemo(() => bills.filter((b) => b.is_active !== false), [bills]);
  const activeLoans = useMemo(() => loans.filter((l) => l.status !== "paid_off"), [loans]);

  // Monthly-normalized via the shared brain — a $100/week bill shows as ~$433/mo
  const fixedExpenses = [
    ...activeBills.map((b) => ({ name: b.name, amount: monthlyBillAmount(b), category: b.category })),
    ...activeLoans.map((l) => ({
      name: `${l.name} ${T("loanSuffix", "(loan)")}`,
      amount: monthlyObligation(l),
      category: "loan_payment",
    })),
  ];

  const totalBudgeted = budgets.reduce((s, b) => s + (b.monthly_limit || 0), 0);
  const totalSpent = budgets.reduce((s, b) => s + getSpent(b.category_key), 0);
  const totalFixed = fixedExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  const categories = Object.keys(CATEGORY_COLORS);

  const budgetPreview = useMemo(() => computeBudgetPreview(form, { fmt, T, monthlySpent: getSpent(form.category_key) }), [form, fmt, T]);
  const acceptSuggestion = (field, value) => setForm({ ...form, [field]: value });

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            {T("budgetDashboard", "Budget Dashboard")}
          </h1>
          <p className="text-sm text-muted-foreground">{format(now, "MMMM yyyy")}</p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1" />
          {T("addBudget", "Add Budget")}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-3 sm:p-4 text-center min-w-0">
            <p className="text-xs text-muted-foreground mb-1 truncate">{T("budgeted", "Budgeted")}</p>
            <p className="text-base sm:text-lg font-bold text-foreground truncate">{fmt(totalBudgeted)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-3 sm:p-4 text-center min-w-0">
            <p className="text-xs text-muted-foreground mb-1 truncate">{T("spent", "Spent")}</p>
            <p className={`text-base sm:text-lg font-bold truncate ${totalSpent > totalBudgeted ? "text-destructive" : "text-primary"}`}>
              {fmt(totalSpent)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-3 sm:p-4 text-center min-w-0">
            <p className="text-xs text-muted-foreground mb-1 truncate">{T("fixedBills", "Fixed Bills")}</p>
            <p className="text-base sm:text-lg font-bold text-orange-400 truncate">{fmt(totalFixed)}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">{T("loading", "Loading...")}</div>
      ) : budgets.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <TrendingDown className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">{T("noBudgets", "No budgets set. Add a category to start tracking.")}</p>
            <Button className="mt-4" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-1" />
              {T("addBudgetCategory", "Add Budget Category")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {T("variableBudgets", "Variable Budgets")}
          </h2>
          {budgets.map((b) => {
            const spent = getSpent(b.category_key);
            const pct = b.monthly_limit > 0 ? Math.min((spent / b.monthly_limit) * 100, 100) : 0;
            const over = spent > b.monthly_limit;
            const color = CATEGORY_COLORS[b.category_key] || "#64748b";
            const pacing = getPacingStatus(
              spent,
              b.monthly_limit || 0,
              now.getDate(),
              new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
            );

            return (
              <Card key={b.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="font-medium text-foreground text-sm truncate">{b.name}</span>
                      {over && (
                        <Badge variant="destructive" className="text-xs py-0 shrink-0">
                          {T("overBudget", "Over Budget")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {fmt(spent)} / {fmt(b.monthly_limit)}
                      </span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(b)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(b)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${pacing.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">
                      {over
                        ? `${fmt(spent - b.monthly_limit)} ${T("overLimit", "over limit")}`
                        : `${fmt(b.monthly_limit - spent)} ${T("remaining", "remaining")}`}
                    </p>
                    <span className={`text-[10px] font-semibold ${pacing.color === "bg-primary" ? "text-primary" : pacing.color === "bg-amber-500" ? "text-amber-500" : "text-destructive"}`}>
                      {T(`pacing_${pacing.label.replace(/\s/g, "")}`, pacing.label)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {fixedExpenses.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {T("fixedExpenses", "Fixed Expenses (from Bills & Loans)")}
          </h2>
          <div className="space-y-2">
            {fixedExpenses.map((e, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[e.category] || "#64748b" }} />
                  <span className="text-sm text-foreground truncate">{e.name}</span>
                  <Badge variant="outline" className="text-xs py-0 shrink-0">{e.category}</Badge>
                </div>
                <span className="text-sm font-semibold text-destructive shrink-0 ml-2">{fmt(e.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editing ? T("editBudget", "Edit Budget") : T("addBudgetCategory", "Add Budget Category")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>{T("label", "Label")}</Label>
              <Input
                className="mt-1"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={T("labelPlaceholder", "e.g. Groceries")}
              />
            </div>

            <div>
              <Label>{T("category", "Category")}</Label>
              <Select
                value={form.category_key}
                onValueChange={(v) => setForm({ ...form, category_key: v, name: form.name || v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{T("monthlyLimit", "Monthly Limit ($)")}</Label>
              <Input
                className="mt-1"
                type="number"
                value={form.monthly_limit}
                onChange={(e) => setForm({ ...form, monthly_limit: e.target.value })}
              />
            </div>
          </div>

          <LogSuggestionStrip preview={budgetPreview} onAccept={acceptSuggestion} />

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>{T("cancel", "Cancel")}</Button>
            <Button onClick={save}>{T("save", "Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title={T("deleteBudget", "Delete Budget")}
        description={T("deleteBudgetConfirmSimple", "Are you sure you want to delete this budget category? This cannot be undone.")}
        confirmLabel={T("delete", "Delete")}
        cancelLabel={T("cancel", "Cancel")}
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}