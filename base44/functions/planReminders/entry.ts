import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSupabaseAdmin } from '../../shared/supabaseClient.ts';
import { sendEmailFallback, fmtMoney, getProfileNotificationToggles } from '../../shared/notifications.ts';
import { realIncomeEntries } from '../../shared/incomeMath.ts';

/**
 * Weekly Plan Reminder — proactive email check-in for every user:
 * 1. Savings plan exists (active, not-yet-funded savings goal):
 *    - behind the pace they set → "Your financial plan needs attention"
 *    - on pace → "You're doing great"
 * 2. Budgets exist (no goal) → "Stay on top of your budget"
 * 3. No plan but logging has gone stale → "Time to log your info"
 * Skips never-onboarded users (no data at all) and users who turned
 * automated insights off (auto_insights === false), same as the weekly insight job.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client: supabaseAdmin } = getSupabaseAdmin();
    const now = new Date();
    const weekAgoStr = new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0];
    const twoWeeksAgoStr = new Date(now.getTime() - 14 * 86400000).toISOString().split("T")[0];

    let page = 0;
    const PAGE_SIZE = 50;
    let hasMore = true;
    let attentionSent = 0;
    let greatSent = 0;
    let loggingSent = 0;

    while (hasMore) {
      const b44Users = await base44.asServiceRole.entities.User.list("created_date", PAGE_SIZE, page * PAGE_SIZE);
      if (!b44Users || b44Users.length === 0) break;
      if (b44Users.length < PAGE_SIZE) hasMore = false;
      page++;

      for (const b44User of b44Users) {
        try {
          // Respect the Smart Notifications toggles (default ON unless explicitly
          // false): if the user turned off automated notifications, send nothing.
          if (b44User.auto_insights === false || b44User.smart_alerts === false) continue;

          const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ search: b44User.email });
          if (error || !users || users.length === 0) continue;
          const supaUser = users.find((u: any) => u.email === b44User.email);
          if (!supaUser) continue;
          const uid = supaUser.id;

          // The Profile page saves the Smart Notifications toggles to the Supabase
          // profiles table first (the Base44 sync is best-effort and can fail
          // silently), so read the authoritative value there — if the user
          // turned either toggle off, send nothing.
          const toggles = await getProfileNotificationToggles(supabaseAdmin, uid);
          if (toggles.smartAlerts === false || toggles.autoInsights === false) continue;

          const currency = b44User.preferred_currency || "USD";
          const name = b44User.preferred_name || supaUser.email?.split("@")[0] || "there";

          const [goalsRes, budgetsRes, incomesRes, txRes, billsRes] = await Promise.all([
            supabaseAdmin.from('savings_goals').select('name, target_amount, current_saved, weekly_contribution, target_date, status, created_at')
              .eq('user_id', uid),
            supabaseAdmin.from('budget_categories').select('name, monthly_limit')
              .eq('user_id', uid),
            supabaseAdmin.from('incomes').select('amount, week_start, is_recurring, recurring_source_id')
              .eq('user_id', uid).gte('week_start', twoWeeksAgoStr),
            supabaseAdmin.from('transactions').select('date, amount')
              .eq('user_id', uid).gte('date', weekAgoStr),
            supabaseAdmin.from('bills').select('id')
              .eq('user_id', uid).or('is_active.is.null,is_active.eq.true'),
          ]);

          const goals = (goalsRes.data || []).filter((g: any) => g.status !== 'completed');
          const budgets = budgetsRes.data || [];
          const bills = billsRes.data || [];
          const txs = txRes.data || [];
          const recentIncome = realIncomeEntries(incomesRes.data || [])
            .reduce((s: number, i: any) => s + (i.amount || 0), 0);

          // The plan = the user's newest active, not-yet-funded savings goal
          const goal = [...goals]
            .filter((g: any) => (g.target_amount || 0) > (g.current_saved || 0))
            .sort((a: any, b: any) => String(b.created_at || "").localeCompare(String(a.created_at || "")))[0];

          // Skip never-onboarded users — no plan, no budgets, no recent activity, no bills
          if (!goal && budgets.length === 0 && txs.length === 0 && bills.length === 0) continue;

          const budgetTotal = budgets.reduce((s: number, b: any) => s + (b.monthly_limit || 0), 0);
          const budgetLine = budgets.length > 0
            ? `\n\nYour ${budgets.length} budget categories total ${fmtMoney(budgetTotal, currency)}/month — keep logging your spending so the alerts stay accurate.`
            : "";
          const staleLine = recentIncome === 0
            ? `\n\nAlso, no income logged in the last two weeks — a quick log keeps your plan honest.`
            : "";

          let subject: string;
          let body: string;

          if (goal) {
            const saved = goal.current_saved || 0;
            const target = goal.target_amount || 0;
            const pct = target > 0 ? Math.round((saved / target) * 100) : 0;
            let behindGap = 0;
            if (goal.weekly_contribution > 0 && goal.created_at) {
              const weeks = Math.max(0, (now.getTime() - new Date(goal.created_at).getTime()) / (7 * 86400000));
              const expected = goal.weekly_contribution * weeks;
              behindGap = Math.max(0, expected - saved);
            }

            if (behindGap > 0) {
              subject = "Your financial plan needs attention — Rayma AI";
              body = `Hi ${name},\n\nThis is where you are: your ${goal.name} is ${pct}% funded (${fmtMoney(saved, currency)} of ${fmtMoney(target, currency)}), about ${fmtMoney(behindGap, currency)} behind the pace you set.\n\nA small contribution this week gets you back on track — open Rayma AI, log it, and I'll keep watching your progress.${budgetLine}${staleLine}\n\n— Rayma AI`;
              attentionSent++;
            } else {
              subject = "You're doing great — Rayma AI";
              body = `Hi ${name},\n\nThis is where you are: your ${goal.name} is ${pct}% funded (${fmtMoney(saved, currency)} of ${fmtMoney(target, currency)}${goal.target_date ? `, on pace for ${goal.target_date}` : ""}). Keep it up!${budgetLine}${staleLine}\n\n— Rayma AI`;
              greatSent++;
            }
          } else if (budgets.length > 0) {
            subject = "Stay on top of your budget — Rayma AI";
            body = `Hi ${name},\n\nThis is where you are: you have ${budgets.length} budget categories totaling ${fmtMoney(budgetTotal, currency)}/month. Keep logging your spending so your budget progress and alerts stay accurate.${staleLine}\n\n— Rayma AI`;
            loggingSent++;
          } else {
            subject = "Time to log your info — Rayma AI";
            body = `Hi ${name},\n\nIt's been a while since your latest numbers${txs.length === 0 ? " — no spending logged this week" : ""}${recentIncome === 0 ? ", and no income in the last two weeks" : ""}.\n\nOpen Rayma AI and log your info — your health score, plan, and reminders only stay honest when your numbers are current.\n\n— Rayma AI`;
            loggingSent++;
          }

          const result = await sendEmailFallback(base44, supaUser.email, subject, body);
          if (!result.sent) {
            console.warn(`[planReminders] Could not reach ${b44User.email}: ${result.reason}`);
          }
        } catch (e) {
          console.warn(`[planReminders] Skipped a user:`, e.message);
        }
      }
    }

    return Response.json({ success: true, attention_sent: attentionSent, great_sent: greatSent, logging_sent: loggingSent });
  } catch (error) {
    console.error('[planReminders] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}