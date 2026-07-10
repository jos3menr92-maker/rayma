import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useT } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Landmark, Pencil, Trash2, TrendingUp, CreditCard, Wallet, Download, RefreshCw, PiggyBank, BarChart3, ShieldAlert, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

function buildTypeConfig(T) {
  return {
    checking: { label: T("checking", "Checking"), icon: Wallet, color: "text-blue-400", bg: "bg-blue-400/10" },
    savings:  { label: T("savings", "Savings"),  icon: PiggyBank, color: "text-green-400", bg: "bg-green-400/10" },
    credit:   { label: T("credit", "Credit"),   icon: CreditCard, color: "text-red-400", bg: "bg-red-400/10" },
    investment:{ label: T("investment", "Investment"), icon: BarChart3, color: "text-purple-400", bg: "bg-purple-400/10" },
    other:    { label: T("other", "Other"),    icon: Landmark, color: "text-muted-foreground", bg: "bg-muted" },
  };
}

const emptyForm = { name: "", institution: "", account_type: "checking", balance: "", notes: "" };
const emptyTx = { bank_account_id: "", date: format(new Date(), "yyyy-MM-dd"), description: "", amount: "", category: "other", type: "debit", notes: "" };

export default function BankAccounts() {
  const T = useT();
  const { formatCurrency: fmt } = useCurrency();
  const { userProfile, supaUser } = useFinancialData();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showTxDialog, setShowTxDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [txForm, setTxForm] = useState(emptyTx);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const typeConfig = useMemo(() => buildTypeConfig(T), [T]);

  // 🔐 Security Vault State
  const [showPasswordLock, setShowPasswordLock] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (supaUser?.id) {
      fetchAll();
    }
  }, [supaUser?.id]);

  const fetchAll = async () => {
    setLoading(true);
    const uid = supaUser?.id;
    const [accsRes, txsRes] = await Promise.all([
      supabase.from('bank_accounts').select('*').eq('user_id', uid).order('updated_at', { ascending: false }),
      supabase.from('transactions').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(100),
    ]);
    if (accsRes.error) console.error("Bank accounts error:", accsRes.error);
    if (txsRes.error) console.error("Transactions error:", txsRes.error);
    setAccounts(accsRes.data || []);
    setTransactions(txsRes.data || []);
    setLoading(false);
  };

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowDialog(true); };
  const openEdit = (acc) => { setEditing(acc); setForm({ ...acc }); setShowDialog(true); };

  const saveAccount = async () => {
    const data = { ...form, balance: parseFloat(form.balance) || 0, last_synced: format(new Date(), "yyyy-MM-dd") };
    if (editing) {
      const { error } = await supabase.from('bank_accounts').update(data).eq('id', editing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('bank_accounts').insert([{ ...data, user_id: supaUser?.id }]);
      if (error) throw error;
    }
    setShowDialog(false);
    fetchAll();
  };

  const deleteAccount = (id) => {
    setAccountToDelete(id);
    setPassword("");
    setAuthError("");
    setShowPasswordLock(true);
  };

  const verifyAndExecute = async () => {
    setAuthError("");
    setIsVerifying(true);
    try {
      await executeDeleteAccount(password, accountToDelete);
      setShowPasswordLock(false);
    } catch (err) {
      setAuthError(T("invalidPassword", "Invalid password. Please try again."));
    } finally {
      setIsVerifying(false);
    }
  };

  const executeDeleteAccount = async (password, id) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) throw new Error("Could not verify user identity.");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password });
    if (signInError) throw signInError;

    const { error } = await supabase.from('bank_accounts').delete().eq('id', id);
    if (error) throw error;
    setAccountToDelete(null);
    fetchAll();
  };

  const saveTx = async () => {
    if (!txForm.bank_account_id) { alert(T("selectAccountPrompt", "Please select a bank account.")); return; }
    const { error } = await supabase.from('transactions').insert([{ ...txForm, amount: parseFloat(txForm.amount) || 0, user_id: supaUser?.id }]);
    if (error) throw error;
    setShowTxDialog(false);
    setTxForm(emptyTx);
    fetchAll();
  };

  const exportCSV = () => {
    const rows = [["Date","Description","Amount","Category","Type","Account"]];
    transactions.forEach(tx => {
      const acc = accounts.find(a => a.id === tx.bank_account_id);
      rows.push([tx.date, tx.description, tx.amount, tx.category, tx.type, acc?.name || ""]);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "transactions.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const totalAssets = accounts.filter(a => a.is_active && a.account_type !== "credit").reduce((s, a) => s + (a.balance || 0), 0);
  const totalCredit = accounts.filter(a => a.account_type === "credit").reduce((s, a) => s + (a.balance || 0), 0);
  const netBalance = totalAssets - totalCredit;
  const visibleTxs = selectedAccount ? transactions.filter(t => t.bank_account_id === selectedAccount) : transactions;

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">{T("bankAccounts", "Bank Accounts")}</h1>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> {T("manualBalances", "Manual balances — update anytime")}
          </p>
        </div>
        <Button size="sm" onClick={openAdd} className="shrink-0">
          <Plus className="w-4 h-4 mr-1" /> {T("addAccount", "Add Account")}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{T("assets", "Assets")}</p>
          <p className="text-base font-bold text-primary">{fmt(totalAssets)}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{T("credit", "Credit")}</p>
          <p className="text-base font-bold text-destructive">{fmt(totalCredit)}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{T("net", "Net")}</p>
          <p className={`text-base font-bold ${netBalance >= 0 ? "text-foreground" : "text-destructive"}`}>{fmt(netBalance)}</p>
        </div>
      </div>

      {/* Accounts List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">{T("loading", "Loading...")}</div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-3xl">
          <Landmark className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold text-foreground mb-1">{T("noAccountsYet", "No accounts yet")}</p>
          <p className="text-sm text-muted-foreground mb-4">{T("addCheckingDesc", "Add your checking, savings, or credit accounts")}</p>
          <Button onClick={openAdd}><Plus className="w-4 h-4 mr-1" />{T("addAccount", "Add Account")}</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map(acc => {
            const cfg = typeConfig[acc.account_type] || typeConfig.other;
            const Icon = cfg.icon;
            const isSelected = selectedAccount === acc.id;
            return (
              <div
                key={acc.id}
                onClick={() => setSelectedAccount(isSelected ? null : acc.id)}
                className={`bg-card border rounded-2xl p-4 cursor-pointer transition-all ${isSelected ? "border-primary/50 shadow-sm" : "border-border hover:border-primary/20"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${cfg.color}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{acc.name}</p>
                      <p className="text-xs text-muted-foreground">{acc.institution}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className={`font-bold text-sm ${acc.account_type === "credit" ? "text-destructive" : "text-foreground"}`}>{fmt(acc.balance)}</p>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">{cfg.label}</Badge>
                    </div>
                    <div className="flex flex-col gap-1 ml-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEdit(acc)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteAccount(acc.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                {acc.last_synced && (
                  <p className="text-[10px] text-muted-foreground mt-2 pl-13">
                    {T("lastUpdated", "Last updated")} {acc.last_synced}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Transactions Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">
            {selectedAccount ? T("accountTransactions", "Account Transactions") : T("recentTransactions", "Recent Transactions")}
          </h2>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Download className="w-3.5 h-3.5" /> {T("csv", "CSV")}
            </button>
            <Button size="sm" variant="outline" onClick={() => setShowTxDialog(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> {T("log", "Log")}
            </Button>
          </div>
        </div>

        {visibleTxs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm bg-card border border-border rounded-2xl">
            {T("noTransactionsYet", "No transactions yet")}
          </div>
        ) : (
          <div className="space-y-1.5">
            {visibleTxs.slice(0, 20).map(tx => (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-xl">
                <div>
                  <p className="text-sm font-medium text-foreground">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">{tx.date} · {tx.category}</p>
                </div>
                <p className={`font-semibold text-sm ${tx.amount >= 0 ? "text-primary" : "text-destructive"}`}>
                  {tx.amount >= 0 ? "+" : ""}{fmt(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Account Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>{editing ? T("editAccount", "Edit Account") : T("addAccount", "Add Account")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{T("accountName", "Account Name")}</Label><Input className="mt-1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={T("chaseCheckingEx", "e.g. Chase Checking")} /></div>
            <div><Label>{T("institution", "Institution")}</Label><Input className="mt-1" value={form.institution} onChange={e => setForm({ ...form, institution: e.target.value })} placeholder={T("chaseBankEx", "e.g. Chase Bank")} /></div>
            <div><Label>{T("type", "Type")}</Label>
              <Select value={form.account_type} onValueChange={v => setForm({ ...form, account_type: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(typeConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>{T("currentBalance", "Current Balance")}</Label><Input className="mt-1" type="number" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} placeholder="0.00" /></div>
            <div><Label>{T("notes", "Notes")}</Label><Input className="mt-1" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>{T("cancel", "Cancel")}</Button>
            <Button onClick={saveAccount}>{T("save", "Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Transaction Dialog */}
      <Dialog open={showTxDialog} onOpenChange={setShowTxDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>{T("logTransaction", "Log Transaction")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{T("account", "Account")}</Label>
              <Select value={txForm.bank_account_id} onValueChange={v => setTxForm({ ...txForm, bank_account_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={T("selectAccount", "Select account")} /></SelectTrigger>
                <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>{T("description", "Description")}</Label><Input className="mt-1" value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>{T("amount", "Amount")}</Label><Input className="mt-1" type="number" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} placeholder="-50.00" /></div>
              <div><Label>{T("date", "Date")}</Label><Input className="mt-1" type="date" value={txForm.date} onChange={e => setTxForm({ ...txForm, date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>{T("category", "Category")}</Label>
                <Select value={txForm.category} onValueChange={v => setTxForm({ ...txForm, category: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["income","food","transport","utilities","subscriptions","health","insurance","rent","loan_payment","savings","entertainment","shopping","other"].map(c =>
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{T("type", "Type")}</Label>
                <Select value={txForm.type} onValueChange={v => setTxForm({ ...txForm, type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">{T("debit", "Debit")}</SelectItem>
                    <SelectItem value="credit">{T("creditLabel", "Credit")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTxDialog(false)}>{T("cancel", "Cancel")}</Button>
            <Button onClick={saveTx}>{T("logTransaction", "Log Transaction")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🔐 SECURITY MODAL (The Vault) */}
      {showPasswordLock && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-background border rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-500">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-bold text-lg text-foreground">{T("verifyPassword", "Verify Password")}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{T("deleteAccountVault", "Enter your password to permanently delete this account.")}</p>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={T("enterPassword", "Enter password...")} />
            {authError && <p className="text-xs text-destructive">{authError}</p>}
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setShowPasswordLock(false)}>{T("cancel", "Cancel")}</Button>
              <Button className="flex-1" onClick={verifyAndExecute} disabled={isVerifying || !password}>
                {isVerifying ? <Loader2 className="animate-spin" /> : T("confirm", "Confirm")}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}