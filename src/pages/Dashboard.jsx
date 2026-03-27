import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, TrendingDown, CheckCircle, AlertCircle } from 'lucide-react';
import LoanCard from '../components/LoanCard';
import LoanForm from '../components/LoanForm';

export default function Dashboard() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);

  const fetchLoans = async () => {
    const data = await base44.entities.Loan.list('-created_date');
    setLoans(data);
    setLoading(false);
  };

  useEffect(() => { fetchLoans(); }, []);

  const totalDebt = loans.reduce((s, l) => s + (l.total_amount || 0), 0);
  const totalPaid = loans.reduce((s, l) => s + (l.amount_paid || 0), 0);
  const totalRemaining = totalDebt - totalPaid;
  const progressPct = totalDebt > 0 ? Math.round((totalPaid / totalDebt) * 100) : 0;

  const today = new Date().toISOString().split('T')[0];
  const upcoming = loans.filter(l => l.next_payment_date && l.next_payment_date >= today)
    .sort((a, b) => a.next_payment_date.localeCompare(b.next_payment_date))
    .slice(0, 1)[0];

  const overdue = loans.filter(l => l.next_payment_date && l.next_payment_date < today);

  const handleSave = async (data, id) => {
    if (id) {
      await base44.entities.Loan.update(id, data);
    } else {
      await base44.entities.Loan.create(data);
    }
    setShowForm(false);
    setEditingLoan(null);
    fetchLoans();
  };

  const handleDelete = async (id) => {
    await base44.entities.Loan.delete(id);
    fetchLoans();
  };

  const handleEdit = (loan) => {
    setEditingLoan(loan);
    setShowForm(true);
  };

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-debt-dark px-6 pt-14 pb-8">
        <p className="text-debt-muted text-sm font-medium tracking-widest uppercase mb-1">My Debt Tracker</p>
        <h1 className="text-white text-4xl font-bold">{fmt(totalRemaining)}</h1>
        <p className="text-debt-muted text-sm mt-1">remaining to pay off</p>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="flex justify-between text-xs text-debt-muted mb-1.5">
            <span>{progressPct}% paid off</span>
            <span>{fmt(totalPaid)} paid</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-debt-accent rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="bg-white/10 rounded-2xl p-4">
            <p className="text-debt-muted text-xs mb-1">Total Debt</p>
            <p className="text-white text-xl font-bold">{fmt(totalDebt)}</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-4">
            <p className="text-debt-muted text-xs mb-1">Total Paid</p>
            <p className="text-debt-accent text-xl font-bold">{fmt(totalPaid)}</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-5 space-y-4">
        {/* Reminders */}
        {overdue.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={18} />
            <div>
              <p className="text-red-700 font-semibold text-sm">Overdue Payment{overdue.length > 1 ? 's' : ''}</p>
              <p className="text-red-500 text-xs mt-0.5">{overdue.map(l => l.name).join(', ')}</p>
            </div>
          </div>
        )}

        {upcoming && overdue.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="text-amber-500 mt-0.5 shrink-0" size={18} />
            <div>
              <p className="text-amber-700 font-semibold text-sm">Next Payment: {upcoming.name}</p>
              <p className="text-amber-500 text-xs mt-0.5">Due {new Date(upcoming.next_payment_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>
        )}

        {/* Loans */}
        <div className="flex items-center justify-between">
          <h2 className="text-foreground font-bold text-lg">Your Loans ({loans.length})</h2>
        </div>

        {loans.length === 0 ? (
          <div className="text-center py-16">
            <TrendingDown className="mx-auto text-muted-foreground mb-3" size={40} />
            <p className="text-muted-foreground text-sm">No loans added yet.<br />Tap + to add your first loan.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {loans.map(loan => (
              <LoanCard key={loan.id} loan={loan} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => { setEditingLoan(null); setShowForm(true); }}
        className="fixed bottom-8 right-6 w-14 h-14 bg-debt-dark rounded-full shadow-lg flex items-center justify-center z-10 active:scale-95 transition-transform"
      >
        <Plus className="text-white" size={26} />
      </button>

      {/* Form Modal */}
      {showForm && (
        <LoanForm
          loan={editingLoan}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingLoan(null); }}
        />
      )}
    </div>
  );
}