import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { t } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Bell, Send, Loader2, CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const categoryIcons = {
  mortgage: "🏠", auto: "🚗", student: "🎓", personal: "💰",
  credit_card: "💳", medical: "🏥", other: "📋",
  utilities: "⚡", subscriptions: "📱", insurance: "🛡️",
  rent: "🏠", food: "🍔", transport: "🚗", health: "🏥",
};

export default function Reminders() {
  const { lang } = useLanguage();
  const { formatCurrency: fmt } = useCurrency();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const [loans, setLoans] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState({});
  const [sent, setSent] = useState({});

  useEffect(() => {
    loadData();
  }, []);

async function loadData() {
    try {
      setLoading(true);
      // Your existing data fetching logic here
      const [l, me] = await Promise.all([
        base44.entities.Loan.list("-created_date", 100),
        base44.auth.me(),
      ]);
      setLoans(l);
      setUser(me);
    } catch (error) {
      console.error("Failed to load reminders:", error);
    } finally {
      setLoading(false);
    }
  }

  async function sendReminder(item, type) {
    const key = `${type}-${item.id}`;
    setSending(s => ({ ...s, [key]: true }));

    const isLoan = type === "loan";
    const amount = isLoan ? item.monthly_payment : item.amount;
    const dueText = item.due_day ? `on the ${item.due_day}th of each month` : "soon";

    const subject = `💰 Payment Reminder: ${item.name}`;
    const body = `Hi,\n\nThis is a reminder that your ${isLoan ? "loan payment" : "bill"} is due ${dueText}.\n\n` +
      `📌 ${item.name}\n` +
      `💵 Amount due: ${fmt(amount)}\n` +
      (item.lender ? `🏦 Lender: ${item.lender}\n` : "") +
      (item.category ? `🏷️ Category: ${item.category}\n` : "") +
      `\nStay on top of your finances!\n\n— Debt Tracker`;

    await base44.integrations.Core.SendEmail({ to: email, subject, body });

    setSending(s => ({ ...s, [key]: false }));
    setSent(s => ({ ...s, [key]: true }));
    setTimeout(() => setSent(s => ({ ...s, [key]: false })), 3000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold font-heading text-foreground mb-1">{T("reminders", "Reminders")}</h1>
        <p className="text-sm text-muted-foreground mb-5">{T("sendPaymentReminders", "Send payment reminders to your email")}</p>

        {/* Email field */}
        <div className="bg-card border border-border rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4 text-primary" />
            <Label className="text-xs font-semibold text-foreground">{T("sendRemindersTo", "Send reminders to")}</Label>
          </div>
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={T("emailPlaceholder", "your@email.com")}
            className="rounded-xl"
          />
        </div>

        {/* Loans */}
        {loans.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{T("loans", "Loans")}</h2>
            <div className="space-y-3">
              {loans.map((loan, i) => {
                const key = `loan-${loan.id}`;
                return (
                  <motion.div
                    key={loan.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg">
                        {categoryIcons[loan.category] || "📋"}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{loan.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmt(loan.monthly_payment)}/mo{loan.due_day ? ` · Due ${loan.due_day}th` : ""}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={sent[key] ? "outline" : "default"}
                      className="rounded-xl text-xs"
                      disabled={sending[key] || !email}
                      onClick={() => sendReminder(loan, "loan")}
                    >
                      {sending[key] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                        sent[key] ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1 text-primary" />{T("sent", "Sent!")}</> :
                        <><Send className="w-3.5 h-3.5 mr-1" />{T("remind", "Remind")}</>}
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bills */}
        {bills.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{T("bills", "Bills")}</h2>
            <div className="space-y-3">
              {bills.map((bill, i) => {
                const key = `bill-${bill.id}`;
                return (
                  <motion.div
                    key={bill.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg">
                        {categoryIcons[bill.category] || "📋"}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{bill.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmt(bill.amount)}/mo{bill.due_day ? ` · Due ${bill.due_day}th` : ""}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={sent[key] ? "outline" : "default"}
                      className="rounded-xl text-xs"
                      disabled={sending[key] || !email}
                      onClick={() => sendReminder(bill, "bill")}
                    >
                      {sending[key] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                        sent[key] ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1 text-primary" />{T("sent", "Sent!")}</> :
                        <><Send className="w-3.5 h-3.5 mr-1" />{T("remind", "Remind")}</>}
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {loans.length === 0 && bills.length === 0 && (
          <div className="text-center py-12">
            <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{T("noActiveLoansOrBills", "No active loans or bills to remind about.")}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}