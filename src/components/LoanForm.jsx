import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { t } from '@/lib/i18n';

const COLORS = ['#6C63FF', '#FF6584', '#43B89C', '#F59E0B', '#3B82F6', '#EC4899'];

export default function LoanForm({ loan, onSave, onClose }) {
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const [form, setForm] = useState({
    name: loan?.name || '',
    lender: loan?.lender || '',
    total_amount: loan?.total_amount || '',
    amount_paid: loan?.amount_paid || '',
    monthly_payment: loan?.monthly_payment || '',
    next_payment_date: loan?.next_payment_date || '',
    interest_rate: loan?.interest_rate || '',
    notes: loan?.notes || '',
    color: loan?.color || COLORS[0],
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      total_amount: parseFloat(form.total_amount) || 0,
      amount_paid: parseFloat(form.amount_paid) || 0,
      monthly_payment: form.monthly_payment ? parseFloat(form.monthly_payment) : null,
      interest_rate: form.interest_rate ? parseFloat(form.interest_rate) : null,
    };
    onSave(data, loan?.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between px-5 pt-14 pb-4 border-b border-border">
        <h2 className="text-xl font-bold">{loan ? T("editLoan", "Edit Loan") : T("addLoan", "Add Loan")}</h2>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-muted">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 space-y-4 pb-32">
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">{T("color", "Color")}</label>
          <div className="flex gap-2">
            {COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => set('color', c)}
                className="w-8 h-8 rounded-full transition-transform"
                style={{ backgroundColor: c, transform: form.color === c ? 'scale(1.25)' : 'scale(1)', outline: form.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
              />
            ))}
          </div>
        </div>

        <Field label={T("loanNameRequired", "Loan Name *")} value={form.name} onChange={v => set('name', v)} placeholder="e.g. Car Loan" required />
        <Field label={T("lenderLabel", "Lender")} value={form.lender} onChange={v => set('lender', v)} placeholder={T("lenderEx", "e.g. Bank of America")} />

        <div className="grid grid-cols-2 gap-3">
          <Field label={T("totalAmountRequired", "Total Amount *")} value={form.total_amount} onChange={v => set('total_amount', v)} placeholder="0" type="number" required />
          <Field label={T("amountPaid", "Amount Paid")} value={form.amount_paid} onChange={v => set('amount_paid', v)} placeholder="0" type="number" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={T("monthlyPayment", "Monthly Payment")} value={form.monthly_payment} onChange={v => set('monthly_payment', v)} placeholder="0" type="number" />
          <Field label={`${T("interestRate", "Interest Rate")} %`} value={form.interest_rate} onChange={v => set('interest_rate', v)} placeholder="0.0" type="number" />
        </div>

        <Field label={T("nextPaymentDate", "Next Payment Date")} value={form.next_payment_date} onChange={v => set('next_payment_date', v)} type="date" />
        <Field label={T("notes", "Notes")} value={form.notes} onChange={v => set('notes', v)} placeholder={T("optionalNotes", "Optional notes...")} textarea />
      </form>

      <div className="fixed bottom-0 left-0 right-0 p-5 bg-background border-t border-border">
        <button type="submit" onClick={handleSubmit} className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold text-base active:scale-95 transition-transform">
          {loan ? T("saveChanges", "Save Changes") : T("addLoan", "Add Loan")}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', required, textarea }) {
  const cls = "w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  return (
    <div>
      <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{label}</label>
      {textarea ? (
        <textarea className={cls + ' h-20 resize-none'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input className={cls} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required} step={type === 'number' ? 'any' : undefined} />
      )}
    </div>
  );
}