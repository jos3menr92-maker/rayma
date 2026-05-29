import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, X } from "lucide-react";

const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n || 0);

export default function BillPriceAlert() {
  const [changes, setChanges] = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dismissed_bill_changes") || "[]"); } catch { return []; }
  });

  useEffect(() => {
    async function check() {
      const [bills, payments] = await Promise.all([
        base44.entities.Bill.list("-created_date", 100),
        base44.entities.Payment.filter({ payment_type: "bill" }, "-payment_date", 200),
      ]);

      const detected = [];
      bills.forEach(bill => {
        const billPayments = payments
          .filter(p => p.bill_id === bill.id)
          .sort((a, b) => b.payment_date.localeCompare(a.payment_date));

        if (billPayments.length >= 2) {
          const latest = billPayments[0].amount;
          const previous = billPayments[1].amount;
          if (latest !== previous) {
            const key = `${bill.id}-${latest}-${previous}`;
            if (!dismissed.includes(key)) {
              detected.push({ bill, latest, previous, key, change: latest - previous });
            }
          }
        }
      });
      setChanges(detected);
    }
    check();
  }, []);

  function dismiss(key) {
    const next = [...dismissed, key];
    setDismissed(next);
    localStorage.setItem("dismissed_bill_changes", JSON.stringify(next));
    setChanges(c => c.filter(x => x.key !== key));
  }

  if (changes.length === 0) return null;

  return (
    <div className="space-y-2 mb-5">
      {changes.map(({ bill, latest, previous, key, change }) => (
        <div key={key} className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{bill.name} price changed</p>
            <p className="text-xs text-muted-foreground">
              {fmt(previous)} → {fmt(latest)}
              <span className={`ml-1 font-semibold ${change > 0 ? "text-destructive" : "text-primary"}`}>
                ({change > 0 ? "+" : ""}{fmt(change)})
              </span>
            </p>
          </div>
          <button onClick={() => dismiss(key)} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}