import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSupabaseAdmin } from '../../shared/supabaseClient.ts';
import { notifyUser, fmtMoney } from '../../shared/notifications.ts';
import { projectCashFlow } from '../../shared/cashFlowProjection.ts';

/**
 * Deficit Alerts — connects the app's ONE forecast brain (the same 30-day
 * projection the Finance page shows, via shared/cashFlowProjection.ts) to the
 * notification system. For each user: if the projected balance dips below
 * zero within the next 14 days, send ONE alert — deduplicated per deficit
 * trough date (a new trough date later re-alerts; the same trough repeats at
 * most once every 7 days).
 *
 * Modes:
 *   - No session (scheduled workflow) → batch across all users (smartBillAlerts pattern).
 *   - Authenticated session → single-user check for just that user.
 *   - Body { "dry_run": true } → compute only, send nothing (testing).
 * Respects the user's Smart Alerts toggle (b44User.smart_alerts).
 */

const ALERT_WINDOW_DAYS = 14;
const REPEAT_GUARD_DAYS = 7;

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    let dryRun = false;
    try { const body = await req.json(); dryRun = !!(body && body.dry_run); } catch (_) { /* no body = scheduled run */ }

    const { client: supabaseAdmin } = getSupabaseAdmin();
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    // Covers dailySpendRate's 30-day window with margin.
    const txCutoff = new Date(today);
    txCutoff.setDate(txCutoff.getDate() - 40);
    const txCutoffStr = txCutoff.toISOString().split('T')[0];

    // ─── Resolve target users ───
    const targets: { b44User: any; supaUser: any }[] = [];
    const authedUser = await base44.auth.me().catch(() => null);
    if (authedUser) {
      // Single-user mode (agent or direct call) — only this user's own data.
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ search: authedUser.email });
      if (error) throw error;
      const supaUser = users.find((u: any) => u.email === authedUser.email);
      if (supaUser) targets.push({ b44User: authedUser, supaUser });
    } else {
      // Scheduled batch — same pagination as smartBillAlerts.
      let page = 0;
      const PAGE_SIZE = 50;
      let hasMore = true;
      while (hasMore) {
        const b44Users = await base44.asServiceRole.entities.User.list("created_date", PAGE_SIZE, page * PAGE_SIZE);
        if (!b44Users || b44Users.length === 0) break;
        if (b44Users.length < PAGE_SIZE) hasMore = false;
        page++;
        for (const b44User of b44Users) {
          const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ search: b44User.email });
          if (error || !users) continue;
          const supaUser = users.find((u: any) => u.email === b44User.email);
          if (supaUser) targets.push({ b44User, supaUser });
        }
      }
    }

    let alertsSent = 0;
    let deficitsFound = 0;
    let deduped = 0;

    for (const { b44User, supaUser } of targets) {
      try {
        // Respect the Smart Alerts toggle (default ON unless explicitly false)
        if (b44User.smart_alerts === false) continue;
        const uid = supaUser.id;
        const currency = b44User.preferred_currency || 'USD';

        const [loansRes, billsRes, incomesRes, paymentsRes, txRes, splitsRes, goalsRes, banksRes] = await Promise.all([
          supabaseAdmin.from('loans').select('*').eq('user_id', uid),
          supabaseAdmin.from('bills').select('*').eq('user_id', uid),
          supabaseAdmin.from('incomes').select('*').eq('user_id', uid),
          supabaseAdmin.from('payments').select('*').eq('user_id', uid).order('payment_date', { ascending: false }).limit(200),
          supabaseAdmin.from('transactions').select('*').eq('user_id', uid).gte('date', txCutoffStr),
          supabaseAdmin.from('transaction_splits').select('*').eq('user_id', uid).gte('date', txCutoffStr),
          supabaseAdmin.from('savings_goals').select('*').eq('user_id', uid),
          supabaseAdmin.from('bank_accounts').select('*').eq('user_id', uid),
        ]);

        const bankAccounts = banksRes.data || [];
        // No active bank account → no real starting balance → nothing
        // trustworthy to alert on (the projection would be fiction).
        if (bankAccounts.filter((a: any) => a.is_active !== false).length === 0) continue;

        // The SAME forecast brain the Finance page renders.
        const projection = projectCashFlow({
          loans: loansRes.data || [],
          bills: billsRes.data || [],
          incomes: incomesRes.data || [],
          payments: paymentsRes.data || [],
          transactions: txRes.data || [],
          transactionSplits: splitsRes.data || [],
          savingsGoals: goalsRes.data || [],
          bankAccounts,
        }, now);

        if (!projection || !projection.hasIncomeData) continue;
        if (projection.lowestBalance >= 0) continue; // no deficit in the horizon

        const lowestDate = projection.lowestDate ? new Date(projection.lowestDate) : null;
        if (!lowestDate) continue;
        const daysUntil = Math.round((lowestDate.getTime() - today.getTime()) / 86400000);
        // Only alert when the crunch is actionable (within the window).
        if (daysUntil < 0 || daysUntil > ALERT_WINDOW_DAYS) continue;

        deficitsFound++;

        // ─── Dedupe: one alert per deficit trough ───
        const deficitKey = lowestDate.toISOString().split('T')[0];
        const sameTrough = b44User.deficit_alert_key === deficitKey;
        if (sameTrough && b44User.deficit_alert_sent_at) {
          const sentAt = new Date(String(b44User.deficit_alert_sent_at).slice(0, 10) + 'T00:00:00');
          if (!isNaN(sentAt.getTime()) && Math.round((today.getTime() - sentAt.getTime()) / 86400000) < REPEAT_GUARD_DAYS) {
            deduped++;
            continue;
          }
        }

        const dateLabel = lowestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const body = `Rayma AI: Heads-up — your balance is on track to dip to -${fmtMoney(Math.abs(projection.lowestBalance), currency)} around ${dateLabel} (${daysUntil} day${daysUntil === 1 ? '' : 's'} away). You still have time to adjust: delay a purchase, shift a bill, or move some money in.`;

        if (dryRun) continue; // computed but not sent

        const result = await notifyUser(base44, {
          phone: b44User.phone_number,
          email: supaUser.email,
          body,
          subject: 'Cash Flow Warning — Rayma AI',
        });
        if (result.sent) {
          alertsSent++;
          // Persist the dedupe marker so the daily cron doesn't re-alert the same trough.
          try {
            await base44.asServiceRole.entities.User.update(b44User.id, {
              deficit_alert_key: deficitKey,
              deficit_alert_sent_at: todayStr,
            });
          } catch (uErr: any) {
            console.warn(`[deficitAlerts] Alert sent but dedupe marker failed for ${supaUser.email}:`, uErr.message);
          }
        }
      } catch (e: any) {
        console.warn('[deficitAlerts] Skipped a user:', e.message);
      }
    }

    return Response.json({
      success: true,
      dry_run: dryRun,
      users_checked: targets.length,
      deficits_found: deficitsFound,
      alerts_sent: alertsSent,
      deduped,
    });
  } catch (error: any) {
    console.error('[deficitAlerts] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}