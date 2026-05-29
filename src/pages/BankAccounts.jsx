import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Landmark, Pencil, Trash2, TrendingUp, CreditCard, Wallet, Download } from "lucide-react";
import { format } from "date-fns";
import BankSyncNotice from "@/components/BankSyncNotice";

const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

const typeConfig = {
  checking: { label: "Checking", icon: Wallet, color: "text-blue-400" },
  savings: { label: "Savings", icon: TrendingUp, color: "text-green-400" },
  credit: { label: "Credit", icon: CreditCard, color: "text-red-400" },
  investment: { label: "Investment", icon: TrendingUp, color: "text-purple-400" },
  other: { label: "Other", icon: Landmark, color: "text-muted-foreground" },
};

const emptyForm = { name: "", institution: "", account_type: "checking", balance: "", notes: "" };

export default function BankAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showTxDialog, setShowTxDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [txForm, setTxForm] = useState({ bank_account_id: "", date: format(new Date(), "yyyy-MM-dd"), description: "", amount: "", category: "other", type: "debit", notes: "" });
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [accs, txs] = await Promise.all([
      base44.entities.BankAccount.list("-updated_date"),
      base44.entities.Transaction.list("-date", 100),
    ]);
    setAccounts(accs);
    setTransactions(txs);
    setLoading(false);
  };

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowDialog(true); };
  const openEdit = (acc) => { setEditing(acc); setForm({ ...acc }); setShowDialog(true); };

  const saveAccount = async () => {
    const data = { ...form, balance: parseFloat(form.balance) || 0, last_synced: format(new Date(), "yyyy-MM-dd") };
    if (editing) await base44.entities.BankAccount.update(editing.id, data);
    else await base44.entities.BankAccount.create(data);
    setShowDialog(false);
    fetchAll();
  };

  const deleteAccount = async (id) => {
    await base44.entities.BankAccount.delete(id);
    fetchAll();
  };

  const saveTx = async () => {
    if (!txForm.bank_account_id) {
      alert("Please select a bank account for this transaction.");
      return;
    }
    const data = { ...txForm, amount: parseFloat(txForm.amount) || 0 };
    await base44.entities.Transaction.create(data);
    setShowTxDialog(false);
    setTxForm({ bank_account_id: "", date: format(new Date(), "yyyy-MM-dd"), description: "", amount: "", category: "other", type: "debit", notes: "" });
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

  const totalBalance = accounts.filter(a => a.is_active && a.account_type !== "credit").reduce((s, a) => s + (a.balance || 0), 0);
  const totalDebt = accounts.filter(a => a.account_type === "credit").reduce((s, a) => s + (a.balance || 0), 0);
  const visibleTxs = selectedAccount ? transactions.filter(t => t.bank_account_id === selectedAccount) : transactions;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Bank Accounts</h1>
          <p className="text-sm text-muted-foreground">Track your accounts and transactions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
          <Button variant="outline" size="sm" onClick={() => setShowTxDialog(true)}><Plus className="w-4 h-4 mr-1" />Transaction</Button>
          <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" />Account</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Balance</p>
            <p className="text-xl font-bold text-primary">{fmt(totalBalance)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Credit Balances</p>
            <p className="text-xl font-bold text-destructive">{fmt(totalDebt)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
        ) : accounts.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <Landmark className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">No accounts yet. Add your first account.</p>
              <Button className="mt-4" onClick={openAdd}><Plus className="w-4 h-4 mr-1" />Add Account</Button>
            </CardContent>
          </Card>
        ) : accounts.map(acc => {
          const cfg = typeConfig[acc.account_type] || typeConfig.other;
          const Icon = cfg.icon;
          return (
            <Card key={acc.id} className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setSelectedAccount(selectedAccount === acc.id ? null : acc.id)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{acc.name}</p>
                    <p className="text-xs text-muted-foreground">{acc.institution} · {cfg.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`font-bold ${acc.account_type === "credit" ? "text-destructive" : "text-foreground"}`}>{fmt(acc.balance)}</p>
                    {acc.last_synced && <p className="text-xs text-muted-foreground">Synced {acc.last_synced}</p>}
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(acc)}><Pencil className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAccount(acc.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Transactions */}
      {visibleTxs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            {selectedAccount ? "Account Transactions" : "Recent Transactions"}
          </h2>
          <div className="space-y-2">
            {visibleTxs.slice(0, 20).map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
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
        </div>
      )}

      {/* Legal & Bank Sync Notice */}
      <BankSyncNotice />

      {/* Add/Edit Account Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>{editing ? "Edit Account" : "Add Account"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Account Name</Label><Input className="mt-1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chase Checking" /></div>
            <div><Label>Institution</Label><Input className="mt-1" value={form.institution} onChange={e => setForm({ ...form, institution: e.target.value })} placeholder="e.g. Chase Bank" /></div>
            <div><Label>Type</Label>
              <Select value={form.account_type} onValueChange={v => setForm({ ...form, account_type: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(typeConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Current Balance</Label><Input className="mt-1" type="number" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} placeholder="0.00" /></div>
            <div><Label>Notes</Label><Input className="mt-1" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button onClick={saveAccount}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Transaction Dialog */}
      <Dialog open={showTxDialog} onOpenChange={setShowTxDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Log Transaction</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Account</Label>
              <Select value={txForm.bank_account_id} onValueChange={v => setTxForm({ ...txForm, bank_account_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Input className="mt-1" value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Amount</Label><Input className="mt-1" type="number" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} placeholder="-50.00" /></div>
              <div><Label>Date</Label><Input className="mt-1" type="date" value={txForm.date} onChange={e => setTxForm({ ...txForm, date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Category</Label>
                <Select value={txForm.category} onValueChange={v => setTxForm({ ...txForm, category: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["income","food","transport","utilities","subscriptions","health","insurance","rent","loan_payment","savings","entertainment","shopping","other"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Type</Label>
                <Select value={txForm.type} onValueChange={v => setTxForm({ ...txForm, type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="debit">Debit</SelectItem><SelectItem value="credit">Credit</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowTxDialog(false)}>Cancel</Button><Button onClick={saveTx}>Log</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}