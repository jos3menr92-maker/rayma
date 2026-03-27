import { useState } from 'react';
import { Trash2, Edit2, ChevronDown, ChevronUp, Calendar, DollarSign } from 'lucide-react';

const COLORS = ['#6C63FF', '#FF6584', '#43B89C', '#F59E0B', '#3B82F6', '#EC4899'];

export default function LoanCard({ loan, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const remaining = (loan.total_amount || 0) - (loan.amount_paid || 0);
  const pct = loan.total_amount > 0 ? Math.min(100, Math.round((loan.amount_paid / loan.total_amount) * 100)) : 0;
  const color = loan.color || COLORS[0];

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

  const today = new Date().toISOString().split('T')[0];
  const isOverdue = loan.next_payment_date && loan.next_payment_date < today;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="h-1" style={{ backgroundColor: color }} />
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1" onClick={() => setExpanded(!expanded)}>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-foreground text-base">{loan.name}</h3>
              {isOverdue && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Overdue</span>}
            </div>
            {loan.lender && <p className="text-muted-foreground text-xs mt-0.5">{loan.lender}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onEdit(loan)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <Edit2 size={15} className="text-muted-foreground" />
            </button>
            <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              {expanded ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{pct}% paid</span>
            <span className="font-semibold text-foreground">{fmt(remaining)} left</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Paid: {fmt(loan.amount_paid)}</span>
            <span>Total: {fmt(loan.total_amount)}</span>
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            {loan.next_payment_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar size={14} className={isOverdue ? 'text-red-500' : 'text-muted-foreground'} />
                <span className={isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}>
                  Next payment: {new Date(loan.next_payment_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            )}
            {loan.monthly_payment && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign size={14} className="text-muted-foreground" />
                <span className="text-muted-foreground">Monthly: {fmt(loan.monthly_payment)}</span>
              </div>
            )}
            {loan.interest_rate && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground text-xs">%</span>
                <span className="text-muted-foreground">Interest: {loan.interest_rate}%</span>
              </div>
            )}
            {loan.notes && (
              <p className="text-muted-foreground text-xs mt-2 bg-muted rounded-xl p-3">{loan.notes}</p>
            )}

            {/* Delete */}
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="mt-2 flex items-center gap-1.5 text-red-400 text-sm">
                <Trash2 size={14} /> Delete loan
              </button>
            ) : (
              <div className="flex gap-2 mt-2">
                <button onClick={() => onDelete(loan.id)} className="flex-1 bg-red-500 text-white text-sm py-2 rounded-xl font-medium">Confirm Delete</button>
                <button onClick={() => setConfirmDelete(false)} className="flex-1 bg-muted text-foreground text-sm py-2 rounded-xl font-medium">Cancel</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}