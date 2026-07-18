import { Receipt, TrendingUp, Banknote } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/lib/LanguageContext";

export default function AddEventDialog({ open, onClose, onAddBill, onAddLoan, onAddIncome }) {
  const T = useT();

  const options = [
    { key: "bill", icon: Receipt, label: T("addBill", "Add Bill"), desc: T("quickAddBillDesc", "Add a recurring bill"), color: "bg-destructive/10 text-destructive", onClick: onAddBill },
    { key: "loan", icon: TrendingUp, label: T("addLoan", "Add Loan"), desc: T("quickAddLoanDesc", "Track a new loan"), color: "bg-orange-500/10 text-orange-500", onClick: onAddLoan },
    { key: "income", icon: Banknote, label: T("logIncome", "Log Income"), desc: T("quickAddIncomeDesc", "Log your income"), color: "bg-primary/10 text-primary", onClick: onAddIncome },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">{T("selectEventType", "What would you like to add?")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          {options.map(opt => (
            <button
              key={opt.key}
              onClick={opt.onClick}
              className="w-full flex items-center gap-3 p-3 rounded-2xl border border-border hover:bg-muted/50 transition-colors text-left"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${opt.color}`}>
                <opt.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{opt.label}</p>
                <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}