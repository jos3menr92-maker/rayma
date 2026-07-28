import { useMemo } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { useT } from "@/lib/LanguageContext";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";

export default function AccountBalanceChart({ account, transactions }) {
  const { formatCurrency: fmt } = useCurrency();
  const T = useT();

  const chartData = useMemo(() => {
    const accountTxs = transactions
      .filter(t => t.bank_account_id === account.id)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (accountTxs.length === 0) return [];

    const totalTxAmount = accountTxs.reduce((s, t) => s + (t.amount || 0), 0);
    const startingBalance = (account.balance || 0) - totalTxAmount;

    let runningBalance = startingBalance;
    const data = [{
      date: format(new Date(accountTxs[0].date + "T00:00:00"), "MMM d"),
      balance: Math.round(runningBalance * 100) / 100
    }];

    accountTxs.forEach((tx) => {
      runningBalance += (tx.amount || 0);
      data.push({
        date: format(new Date(tx.date + "T00:00:00"), "MMM d"),
        balance: Math.round(runningBalance * 100) / 100,
      });
    });

    data.push({ date: T("now", "Now"), balance: Math.round((account.balance || 0) * 100) / 100 });

    return data;
  }, [account, transactions, T]);

  if (chartData.length < 2) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4 mb-3 text-center">
        <p className="text-xs text-muted-foreground">{T("noBalanceHistory", "Not enough transaction history to show a balance trend")}</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 mb-3">
      <h3 className="text-xs font-semibold text-foreground mb-2">{T("balanceHistory", "Balance History")}</h3>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={chartData} margin={{ left: 0, right: 10, top: 5 }}>
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={55} tickFormatter={(v) => fmt(v).replace(/\.00$/, "")} />
          <Tooltip formatter={(v) => fmt(v)} />
          <Area type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#balanceGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}