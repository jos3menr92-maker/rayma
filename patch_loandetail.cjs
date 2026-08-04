const fs = require('fs');
let code = fs.readFileSync('src/pages/LoanDetail.jsx', 'utf8');

code = code.replace(
  'const { reload, supaUser } = useFinancialData();',
  'const { reload, supaUser, payLoan } = useFinancialData();'
);

code = code.replace(
  /async function handleAddPayment\(e\) \{[\s\S]*?finally \{\n\s*setSaving\(false\);\s*\}\n\s*\}/m,
  `async function handleAddPayment(e) { 
    e.preventDefault(); 
    
    if (!supaUser?.id) return; 

    setSaving(true); 
    const amount = parseFloat(payForm.amount); 
    
    try {
      await payLoan(id, amount, payForm.payment_date, payForm.note);
      
      reload(); 
      setPayForm({ amount: "", payment_date: new Date().toISOString().split("T")[0], note: "" }); 
      setPaymentOpen(false); 
      loadData(); 
    } catch (err) {
      console.error('Add payment failed:', err.message);
    } finally {
      setSaving(false); 
    }
  }`
);

fs.writeFileSync('src/pages/LoanDetail.jsx', code);
