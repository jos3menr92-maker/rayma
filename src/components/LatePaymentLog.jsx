import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrency } from '@/hooks/useCurrency';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';

export default function LatePaymentLog({ loan, onLoanUpdated }) {
  const { formatCurrency: fmt } = useCurrency();
  const [adjustments, setAdjustments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    direction: 'add',
    reason: '',
    date: new Date().toISOString().split('T')[0],
  });

  const load = async () => {
    const data = await base44.entities.LoanAdjustment.filter({ loan_id: loan.id }, '-date', 50);
    setAdjustments(data);
  };

  useEffect(() => { load(); }, [loan.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const amount = parseFloat(form.amount);

    await base44.entities.LoanAdjustment.create({
      loan_id: loan.id,
      amount,
      direction: form.direction,
      reason: form.reason,
      date: form.date,
    });

    // "add" = late fee / missed payment → increases original_amount (more owed)
    // "subtract" = partial/late payment → decreases current_balance
    let updatePayload = {};
    if (form.direction === 'add') {
      updatePayload = { original_amount: (loan.original_amount || 0) + amount };
    } else {
      updatePayload = { current_balance: Math.max(0, (loan.current_balance || 0) - amount) };
    }
    await base44.entities.Loan.update(loan.id, updatePayload);

    setForm({ amount: '', direction: 'add', reason: '', date: new Date().toISOString().split('T')[0] });
    setShowForm(false);
    setSaving(false);
    load();
    onLoanUpdated();
  };

  const handleDelete = async (adj) => {
    await base44.entities.LoanAdjustment.delete(adj.id);
    // Reverse the effect
    let updatePayload = {};
    if (adj.direction === 'add') {
      updatePayload = { original_amount: Math.max(0, (loan.original_amount || 0) - adj.amount) };
    } else {
      updatePayload = { current_balance: (loan.current_balance || 0) + adj.amount };
    }
    await base44.entities.Loan.update(loan.id, updatePayload);
    load();
    onLoanUpdated();
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setShowForm(!showForm)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} className="text-amber-500" />
          <span className="text-sm font-semibold text-foreground">Late Payment Log</span>
          {adjustments.length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{adjustments.length}</span>
          )}
        </div>
        <Plus size={15} className="text-muted-foreground" />
      </button>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="px-4 pb-4 border-t border-border pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Amount ($)</label>
              <input
                type="number"
                step="any"
                required
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Effect</label>
              <select
                value={form.direction}
                onChange={e => setForm(f => ({ ...f, direction: e.target.value }))}
                className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="add">+ Add to total owed</option>
                <option value="subtract">− Reduce balance</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Note</label>
              <input
                type="text"
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="e.g. Missed March"
                className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="flex-1 bg-amber-500 text-white py-2 rounded-xl text-sm font-semibold">
              {saving ? 'Saving...' : 'Log Entry'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-muted text-foreground py-2 rounded-xl text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Entries list */}
      {adjustments.length > 0 && (
        <div className="border-t border-border divide-y divide-border">
          {adjustments.map(adj => (
            <div key={adj.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className={`text-base font-bold ${adj.direction === 'add' ? 'text-red-500' : 'text-green-600'}`}>
                  {adj.direction === 'add' ? '+' : '−'}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{fmt(adj.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {adj.date && new Date(adj.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {adj.reason && ` · ${adj.reason}`}
                  </p>
                </div>
              </div>
              <button onClick={() => handleDelete(adj)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {adjustments.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground text-center py-3 border-t border-border">
          Tap + to log a late or missed payment
        </p>
      )}
    </div>
  );
}