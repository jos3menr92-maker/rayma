const fs = require('fs');

const path = 'src/lib/FinancialDataContext.jsx';
let content = fs.readFileSync(path, 'utf8');

const payBillStr = `  async function payBill(bill, paymentAmount, paymentDate = new Date().toISOString().split("T")[0]) {
    const prevBills = [...bills];
    const prevPayments = [...payments];

    setBills(prev => prev.map(b => (b.id === bill.id ? { ...b, last_paid_date: paymentDate } : b)));

    try {
      const data = await createRecord('payments', {
        bill_id: bill.id,
        amount: paymentAmount,
        payment_date: paymentDate,
        payment_type: "bill",
      });

      setPayments(prev => [data, ...prev]);

      await updateRecord('bills', bill.id, { last_paid_date: paymentDate });

      if (bankAccounts.length > 0) {
        await addTransaction({
          bank_account_id: bankAccounts[0].id,
          date: paymentDate,
          description: \`Paid Bill: \${bill.name}\`,
          amount: -paymentAmount,
          category: bill.category || "other",
          type: "debit"
        });
      }
    } catch (e) {
      setBills(prevBills);
      setPayments(prevPayments);
      toast({ title: "Payment failed", description: e.message, variant: "destructive" });
    }
  }

  async function payLoan(loanId, paymentAmount, paymentDate = new Date().toISOString().split("T")[0], note = "") {
    const prevLoans = [...loans];
    const prevPayments = [...payments];

    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    try {
      const data = await createRecord('payments', {
        loan_id: loanId,
        amount: paymentAmount,
        payment_date: paymentDate,
        payment_type: "loan",
        note: note
      });

      setPayments(prev => [data, ...prev]);

      const newBalance = Math.max((loan.current_balance || 0) - paymentAmount, 0);
      const updates = { 
        current_balance: newBalance, 
        status: newBalance <= 0 ? "paid_off" : "active" 
      };

      setLoans(prev => prev.map(l => (l.id === loanId ? { ...l, ...updates } : l)));
      await updateRecord('loans', loanId, updates);

      if (bankAccounts.length > 0) {
        await addTransaction({
          bank_account_id: bankAccounts[0].id,
          date: paymentDate,
          description: \`Paid Loan: \${loan.name}\`,
          amount: -paymentAmount,
          category: loan.category || "other",
          type: "debit"
        });
      }
    } catch (e) {
      setLoans(prevLoans);
      setPayments(prevPayments);
      toast({ title: "Payment failed", description: e.message, variant: "destructive" });
    }
  }`;

content = content.replace(/async function payBill\([^]*?toast\(\{ title: "Payment failed"[^]*?\}\);\s*\}/, payBillStr);

// Also need to export payLoan
content = content.replace(/payBill,\n\s*updateLoan,/, 'payBill,\n        payLoan,\n        updateLoan,');

fs.writeFileSync(path, content);
