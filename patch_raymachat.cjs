const fs = require('fs');
let code = fs.readFileSync('src/components/RaymaChat.jsx', 'utf8');

code = code.replace(
  'const { reload, refreshUserProfile } = useFinancialData();',
  'const { reload, refreshUserProfile, payBill, payLoan } = useFinancialData();'
);

code = code.replace(
  /const paidMatch = text\.match\(\/paid \\\$\?\(\\d\+\)\\s\+\(\?:to\|for\)\\s\+\(\.\+\)\/\);\n\s*if \(paidMatch\) \{[\s\S]*?setLoading\(false\);\n\s*return;\n\s*\}/m,
  `const paidMatch = text.match(/paid \\$?\\s?(\\d+(?:\\.\\d+)?)\\s+(?:to|for)\\s+(.+)/);
    if (paidMatch) {
      setMessages(prev => [...prev, { role: "user", content: sourceText }]);
      setInput("");
      setLoading(true);
      const amount = parseFloat(paidMatch[1]);
      const target = paidMatch[2].trim();
      
      try {
        const lowerTarget = target.toLowerCase();
        const matchedBill = bills.find(b => b.name && b.name.toLowerCase() === lowerTarget);
        const matchedLoan = loans.find(l => l.name && l.name.toLowerCase() === lowerTarget);

        if (matchedBill) {
          await payBill(matchedBill, amount);
        } else if (matchedLoan) {
          await payLoan(matchedLoan.id, amount);
        } else {
          // generic debit
          const todayISO = new Date().toISOString().split("T")[0];
          const payload = {
            date: todayISO,
            description: target,
            amount: -amount,
            category: "other",
            type: "debit"
          };
          if (bankAccounts && bankAccounts.length > 0) {
            payload.bank_account_id = bankAccounts[0].id;
          }
          if (addTransaction) {
            await addTransaction(payload);
          } else {
            await createRecord('transactions', payload);
          }
        }
        
        setMessages(prev => [...prev, { role: "assistant", content: T("paymentLoggedSuccess", \`✅ **Payment Logged!** I just securely recorded your \${formatCurrency(amount)} payment to \${target} in your database. Your balances will update automatically.\`) }]);
        reload();
      } catch (error) {
        console.error("Payment log error:", error.message);
        setMessages(prev => [...prev, { role: "assistant", content: T("paymentLogError", \`I tried to log your payment to \${target}, but encountered a database error.\`) }]);
      }
      setLoading(false);
      return;
    }`
);

fs.writeFileSync('src/components/RaymaChat.jsx', code);
