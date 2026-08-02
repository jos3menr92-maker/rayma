import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSupabaseAdmin } from '../../shared/supabaseClient.ts';
import { notifyUser, fmtMoney } from '../../shared/notifications.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client: supabaseAdmin } = getSupabaseAdmin();
    const now = new Date();
    const weekAgoStr = new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0];

    let page = 0;
    const PAGE_SIZE = 50;
    let hasMore = true;
    let insightsSent = 0;

    while (hasMore) {
      const b44Users = await base44.asServiceRole.entities.User.list("created_date", PAGE_SIZE, page * PAGE_SIZE);
      if (!b44Users || b44Users.length === 0) break;
      if (b44Users.length < PAGE_SIZE) hasMore = false;
      page++;

      for (const b44User of b44Users) {
        try {
          // Respect the Automated Cash Flow Insights toggle (default ON unless explicitly false)
          if (b44User.auto_insights === false) continue;

          const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ search: b44User.email });
          if (error || !users || users.length === 0) continue;
          const supaUser = users.find((u: any) => u.email === b44User.email);
          if (!supaUser) continue;
          const uid = supaUser.id;
          const currency = b44User.preferred_currency || "USD";
          const name = b44User.preferred_name || supaUser.email?.split("@")[0] || "there";

          // Pull last 7 days of transactions + active bills
          const [txRes, billsRes] = await Promise.all([
            supabaseAdmin.from('transactions').select('date, amount, description, category')
              .eq('user_id', uid).gte('date', weekAgoStr),
            supabaseAdmin.from('bills').select('name, amount')
              .eq('user_id', uid).eq('is_active', true),
          ]);

          const txs = txRes.data || [];
          const bills = billsRes.data || [];
          if (txs.length === 0 && bills.length === 0) continue;

          const spending = txs.filter((t: any) => (t.amount || 0) < 0).reduce((s: number, t: any) => s + Math.abs(t.amount), 0);
          const income = txs.filter((t: any) => (t.amount || 0) > 0).reduce((s: number, t: any) => s + t.amount, 0);
          const monthlyBills = bills.reduce((s: number, b: any) => s + (b.amount || 0), 0);

          const summary = `User: ${name}. Last 7 days: spending ${fmtMoney(spending, currency)}, income ${fmtMoney(income, currency)}. Active monthly bills: ${fmtMoney(monthlyBills, currency)} across ${bills.length} bills. Transactions logged: ${txs.length}.`;

          // Generate a short insight via the LLM integration
          let insight: string;
          try {
            const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
              prompt: `You are Rayma AI, a friendly, concise financial co-pilot. Based on this weekly summary, write a SHORT (2-3 sentences) encouraging insight with one actionable tip. No greeting, no sign-off, just the insight.\n\nSummary: ${summary}`,
            });
            insight = typeof llmRes === "string" ? llmRes : String(llmRes || summary);
          } catch (e) {
            insight = `This week you spent ${fmtMoney(spending, currency)} and earned ${fmtMoney(income, currency)}. Your fixed monthly bills total ${fmtMoney(monthlyBills, currency)} — try to keep spending below your income to stay on track.`;
          }

          const body = `Rayma AI weekly insight:\n${insight}`;
          const result = await notifyUser(base44, {
            phone: b44User.phone_number,
            email: supaUser.email,
            body,
            subject: "Your Weekly Cash Flow Insight — Rayma AI",
          });
          if (result.sent) insightsSent++;
        } catch (e) {
          console.warn(`[weeklyCashFlowInsight] Skipped a user:`, e.message);
        }
      }
    }

    return Response.json({ success: true, insights_sent: insightsSent });
  } catch (error) {
    console.error('[weeklyCashFlowInsight] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}