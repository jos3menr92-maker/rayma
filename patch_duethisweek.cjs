const fs = require('fs');
let code = fs.readFileSync('src/components/DueThisWeek.jsx', 'utf8');

code = code.replace(
  'import { CalendarCheck } from "lucide-react";',
  'import { CalendarCheck, CheckCircle2 } from "lucide-react";\nimport { useState } from "react";\nimport { useFinancialData } from "@/lib/FinancialDataContext";'
);

code = code.replace(
  'export default function DueThisWeek({ loans, bills }) {',
  `export default function DueThisWeek({ loans, bills }) {
  const { payBill, payLoan, reload } = useFinancialData();
  const [payingId, setPayingId] = useState(null);

  const handlePay = async (item) => {
    setPayingId(item.id);
    try {
      if (item.type === "bill") {
        const bill = bills.find(b => b.id === item.id);
        if (bill) await payBill(bill, item.amount);
      } else if (item.type === "loan") {
        await payLoan(item.id, item.amount);
      }
      reload();
    } catch(err) {
      console.error(err);
    }
    setPayingId(null);
  };`
);

code = code.replace(
  /bills\.forEach\(bill => \{[\s\S]*?\}\);/m,
  `bills.forEach(bill => {
      if (!bill.is_active) return;
      
      const isPaidMonthly = bill.last_paid_date && new Date(bill.last_paid_date).getMonth() === today.getMonth() && new Date(bill.last_paid_date).getFullYear() === today.getFullYear();
      const isPaidWeekly = bill.last_paid_date && (today.getTime() - new Date(bill.last_paid_date).getTime() < 7 * 24 * 60 * 60 * 1000);

      if (bill.payment_frequency === "weekly" || bill.payment_frequency === "biweekly") {
        if (isPaidWeekly) return;
        if (bill.due_day_of_week) {
          const dueDayIdx = DOW_ORDER.indexOf(bill.due_day_of_week);
          if (dueDayIdx === -1) return;
          const diffDays = (dueDayIdx - dayOfWeek + 7) % 7;
          if (diffDays <= 6) {
            result.push({ id: bill.id, name: bill.name, amount: bill.amount, type: "bill", daysUntil: diffDays });
          }
        }
      } else if (bill.due_day) {
        if (isPaidMonthly) return;
        const dueDate = new Date(today.getFullYear(), today.getMonth(), bill.due_day);
        if (dueDate >= weekStart && dueDate <= weekEnd) {
          const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
          result.push({ id: bill.id, name: bill.name, amount: bill.amount, type: "bill", daysUntil: diffDays });
        }
      }
    });`
);

code = code.replace(
  /<span className=\{\`text-xs font-semibold px-2 py-0\.5 rounded-lg \$\{[\s\S]*?\}\`\}>\n\s*\{fmt\(item\.amount\)\}\n\s*<\/span>/,
  `{/* Wrap the amount in a flex container with the pay button */}
            <div className="flex items-center gap-2">
              <span className={\`text-xs font-semibold px-2 py-0.5 rounded-lg \${
                item.daysUntil <= 1
                  ? "bg-destructive/10 text-destructive"
                  : item.daysUntil <= 3
                  ? "bg-amber-500/10 text-amber-500"
                  : "bg-primary/10 text-primary"
              }\`}>
                {fmt(item.amount)}
              </span>
              <button 
                onClick={() => handlePay(item)} 
                disabled={payingId === item.id} 
                className="p-1.5 text-muted-foreground hover:text-primary transition-colors" 
                title={T("markPaid", "Mark as Paid")}
              >
                <CheckCircle2 className={\`w-4 h-4 \${payingId === item.id ? "text-primary animate-pulse" : ""}\`} />
              </button>
            </div>`
);

fs.writeFileSync('src/components/DueThisWeek.jsx', code);
