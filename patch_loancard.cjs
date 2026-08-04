const fs = require('fs');
let code = fs.readFileSync('src/components/LoanCard.jsx', 'utf8');

code = code.replace(
  'import PaymentButton from "./PaymentButton";',
  'import { useFinancialData } from "@/lib/FinancialDataContext";\nimport { useState } from "react";'
);

code = code.replace(
  'export default function LoanCard({ loan, index = 0, onEdit, onDelete }) {',
  `export default function LoanCard({ loan, index = 0, onEdit, onDelete }) {
  const { payLoan, reload } = useFinancialData();
  const [paying, setPaying] = useState(false);
  
  const handlePay = async () => {
    setPaying(true);
    try {
      await payLoan(loan.id, loan.monthly_payment);
      reload();
    } catch(err) {
      console.error(err);
    }
    setPaying(false);
    animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
    setSwiped(false);
  };
`
);

code = code.replace(
  /<PaymentButton planId=\{loan\.id\} amount=\{loan\.monthly_payment\}>\n\s*<div className="flex-1 bg-primary flex flex-col items-center justify-center gap-0\.5 cursor-pointer hover:bg-primary\/90 transition-colors">\n\s*<DollarSign className="w-4 h-4 text-primary-foreground" \/>\n\s*<span className="text-\[9px\] font-bold text-primary-foreground uppercase tracking-wide">\{T\("pay", "Pay"\)\}<\/span>\n\s*<\/div>\n\s*<\/PaymentButton>/m,
  `<button type="button" onClick={(e) => { e.stopPropagation(); handlePay(); }} disabled={paying} className="flex-1 bg-primary flex flex-col items-center justify-center gap-0.5 hover:bg-primary/90 transition-colors">
              <DollarSign className={\`w-4 h-4 text-primary-foreground \${paying ? "animate-pulse" : ""}\`} />
              <span className="text-[9px] font-bold text-primary-foreground uppercase tracking-wide">{paying ? T("paying", "Paying") : T("pay", "Pay")}</span>
            </button>`
);

fs.writeFileSync('src/components/LoanCard.jsx', code);
