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
  'result.push({ id: bill.id, name: bill.name, amount: bill.amount, type: "bill", daysUntil: diffDays });',
  `if (!bill.last_paid_date || new Date(bill.last_paid_date).getTime() < today.getTime() - 7*24*60*60*1000) {
              result.push({ id: bill.id, name: bill.name, amount: bill.amount, type: "bill", daysUntil: diffDays });
            }`
);

code = code.replace(
  'result.push({ id: bill.id, name: bill.name, amount: bill.amount, type: "bill", daysUntil: diffDays });',
  `if (!bill.last_paid_date || new Date(bill.last_paid_date).getMonth() !== today.getMonth()) {
            result.push({ id: bill.id, name: bill.name, amount: bill.amount, type: "bill", daysUntil: diffDays });
          }`
);

// We have 2 result.push for bills. Let's do it right using a regex or more targeted replace.
