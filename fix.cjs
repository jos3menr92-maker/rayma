const fs = require('fs');
let code = fs.readFileSync('src/components/DueThisWeek.jsx', 'utf8');

const correctBillsLoop = `    bills.forEach(bill => {
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
    });`;

const startIdx = code.indexOf('bills.forEach(bill => {');
const endStr = 'return result.sort((a, b) => a.daysUntil - b.daysUntil);';
const endIdx = code.indexOf(endStr);

code = code.substring(0, startIdx) + correctBillsLoop + '\n\n    ' + code.substring(endIdx);

fs.writeFileSync('src/components/DueThisWeek.jsx', code);
