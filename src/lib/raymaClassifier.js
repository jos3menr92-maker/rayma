/**
 * Rayma AI Silent Classifier
 * ==========================
 * Rule-based (zero AI) intent router. Runs BEFORE any coin is spent.
 * - Returns a free answer string  → answered locally, 0 credits
 * - Returns null                   → falls through to paid AI (3 credits)
 *
 * Also exports the quick-reply chip definitions (green = free, red = paid).
 */

// Quick-reply chips shown at the top of Rayma Chat.
export const CHIPS = [
  // Identity (free)
  { id: "name", labelKey: "chipName", fallback: "What's your name?", tier: "free", text: "what's your name" },
  { id: "canDo", labelKey: "chipCanDo", fallback: "What can you do?", tier: "free", text: "what can you do" },
  // How-to (free)
  { id: "addLoan", labelKey: "chipAddLoan", fallback: "Add a loan?", tier: "free", text: "how do i add a loan" },
  { id: "logPayment", labelKey: "chipLogPayment", fallback: "Log a payment?", tier: "free", text: "how do i log a payment" },
  { id: "scanReceipt", labelKey: "chipScanReceipt", fallback: "Scan a receipt?", tier: "free", text: "how do i scan a receipt" },
  { id: "setBudget", labelKey: "chipSetBudget", fallback: "Set a budget?", tier: "free", text: "how do i set a budget" },
  // Financial lookups — pure app math (free)
  { id: "netWorth", labelKey: "chipNetWorth", fallback: "My net worth?", tier: "free", text: "what's my net worth" },
  { id: "totalDebt", labelKey: "chipTotalDebt", fallback: "How much do I owe?", tier: "free", text: "how much do i owe" },
  { id: "billsDue", labelKey: "chipBillsDue", fallback: "Bills due this week?", tier: "free", text: "what bills are due this week" },
  { id: "monthly", labelKey: "chipMonthly", fallback: "Monthly obligations?", tier: "free", text: "what are my monthly obligations" },
  // Financial advice — needs AI (paid)
  { id: "cashFlow", labelKey: "chipCashFlow", fallback: "Improve cash flow", tier: "paid", text: "how can i improve my cash flow" },
  { id: "saveMoney", labelKey: "chipSaveMoney", fallback: "Save more money", tier: "paid", text: "how do i save more money" },
];

function billsDueWithinDays(bills, days) {
  const today = new Date();
  return (bills || []).filter((b) => {
    if (!b || !b.is_active || !b.due_day) return false;
    const day = Number(b.due_day);
    if (!day || day < 1 || day > 31) return false;
    let target = new Date(today.getFullYear(), today.getMonth(), day);
    let diff = (target - today) / 86400000;
    if (diff < 0) {
      target = new Date(today.getFullYear(), today.getMonth() + 1, day);
      diff = (target - today) / 86400000;
    }
    return diff >= 0 && diff <= days;
  });
}

/**
 * Returns a free answer string, or null to defer to paid AI.
 * @param {string} rawText
 * @param {object} ctx { formatCurrency, loans, bills, assets, T }
 */
export function freeAnswer(rawText, ctx = {}) {
  const text = (rawText || "").trim().toLowerCase();
  if (!text) return null;
  const {
    formatCurrency = (n) => `$${Number(n || 0).toFixed(2)}`,
    loans = [],
    bills = [],
    assets = [],
    T = (_k, f) => f,
  } = ctx;

  // --- Identity ---
  if (/(what(?:'s| is)\s*(your|ur)\s*name)|who\s*(are|r)\s*you|your\s*name/.test(text)) {
    return T(
      "freeName",
      "I'm **Rayma AI**, your personal financial co-pilot. 🤖\n\nI help you track loans, bills, budgets, and net worth — and I can log transactions, analyze your cash flow, and suggest your best next step. Ask me anything about your money!"
    );
  }
  if (/(what\s*can\s*you\s*do)|how\s*do\s*you\s*work|^help$|\bhelp\b|what\s*do\s*you\s*do/.test(text)) {
    return T(
      "freeCanDo",
      "Here's what I can do for you:\n\n• **Log** a payment or transaction (\"paid $50 to Netflix\")\n• **Split** an expense across categories\n• **Add** a bill or loan\n• **Look up** your net worth, total debt, and bills due — free\n• **Analyze** cash flow and suggest next steps\n\nTap a chip below, or just type!"
    );
  }

  // --- How-to ---
  if (/how\s*do\s*i\s*add\s*(a\s*)?loan/.test(text)) {
    return T(
      "freeAddLoan",
      "To add a loan: tap the **Quick Add (+)** button on the dashboard and choose **Add Loan**, or open the **Loans** page and tap **Add Loan**. Enter the name, amount, and payment — I'll calculate the rest!"
    );
  }
  if (/how\s*do\s*i\s*log\s*(a\s*)?payment/.test(text)) {
    return T(
      "freeLogPayment",
      "To log a payment, just tell me here: type **\"paid $50 to Netflix\"** and I'll record it instantly. You can also tap **Log** on any bill or loan card."
    );
  }
  if (/how\s*do\s*i\s*scan\s*(a\s*)?(receipt|document)/.test(text)) {
    return T(
      "freeScan",
      "Tap the **scan icon** (next to the text box). Upload a photo or PDF and I'll extract the data for you. Scanning costs 3 coins."
    );
  }
  if (/how\s*do\s*i\s*(set|create)\s*(a\s*)?budget/.test(text)) {
    return T(
      "freeBudget",
      "Open the **Budget Dashboard** from the menu and tap **Add Budget Category**. Set a monthly limit per category (food, transport, etc.) and I'll track your spending against it."
    );
  }

  // --- Financial lookups (pure app math — free) ---
  if (/net\s*worth/.test(text)) {
    const totalAssets = (assets || []).reduce((s, a) => s + (a.amount || 0), 0);
    const totalDebt = (loans || []).reduce((s, l) => s + (l.current_balance || 0), 0);
    const nw = totalAssets - totalDebt;
    return T(
      "freeNetWorth",
      `**Your Net Worth** 💰\n\n• Total assets: ${formatCurrency(totalAssets)}\n• Total debt: ${formatCurrency(totalDebt)}\n• **Net worth: ${formatCurrency(nw)}**\n\n*Calculated from your assets minus your loan balances.*`
    );
  }
  if (/(how\s*much\s*do\s*i\s*owe|total\s*debt|what\s*do\s*i\s*owe)/.test(text)) {
    const totalDebt = (loans || []).reduce((s, l) => s + (l.current_balance || 0), 0);
    const activeLoans = (loans || []).filter((l) => l.status !== "paid_off").length;
    return T(
      "freeTotalDebt",
      `**Total Debt** 🏦\n\nYou owe **${formatCurrency(totalDebt)}** across ${activeLoans} active loan${activeLoans === 1 ? "" : "s"}.\n\n*Tap any loan on the Loans page to see its payoff progress.*`
    );
  }
  if (/(bills?\s*due|due\s*this\s*week|upcoming\s*bills)/.test(text)) {
    const due = billsDueWithinDays(bills, 7);
    if (due.length === 0) {
      return T("freeBillsNone", "**Bills Due This Week** 📅\n\nNo bills due in the next 7 days. You're clear! ✅");
    }
    const list = due.map((b) => `• ${b.name} — ${formatCurrency(b.amount)}`).join("\n");
    return T("freeBillsDue", `**Bills Due This Week** 📅\n\n${list}`);
  }
  if (/(monthly\s*(obligations|payments|bills)|how\s*much.*spend\s*(a\s*)?month)/.test(text)) {
    const activeBills = (bills || []).filter((b) => b.is_active);
    const activeLoans = (loans || []).filter((l) => l.status !== "paid_off");
    const monthlyBills = activeBills.reduce((s, b) => s + (b.amount || 0), 0);
    const monthlyLoans = activeLoans.reduce((s, l) => s + (l.monthly_payment || 0), 0);
    const total = monthlyBills + monthlyLoans;

    const billLines = activeBills.length
      ? activeBills.map((b) => `  • ${b.name} — ${formatCurrency(b.amount)}${b.due_day ? ` (due day ${b.due_day})` : ""}`).join("\n")
      : `  • ${T("freeNoBills", "No active bills logged.")}`;
    const loanLines = activeLoans.length
      ? activeLoans.map((l) => `  • ${l.name} — ${formatCurrency(l.monthly_payment || 0)}/mo (balance ${formatCurrency(l.current_balance || 0)})`).join("\n")
      : `  • ${T("freeNoLoans", "No active loans.")}`;

    return T(
      "freeMonthly",
      `**${T("freeMonthlyTitle", "Monthly Obligations")}** 🧾\n\n**${T("freeMonthlyBills", "Bills")}** (${formatCurrency(monthlyBills)})\n${billLines}\n\n**${T("freeMonthlyLoans", "Loan payments")}** (${formatCurrency(monthlyLoans)})\n${loanLines}\n\n—\n**${T("freeMonthlyTotal", "Total monthly obligations")}: ${formatCurrency(total)}/mo**`
    );
  }

  return null;
}