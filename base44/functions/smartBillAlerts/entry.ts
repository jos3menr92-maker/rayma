import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSupabaseAdmin } from '../../shared/supabaseClient.ts';
import { notifyUser, fmtMoney, getProfileNotificationToggles } from '../../shared/notifications.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client: supabaseAdmin } = getSupabaseAdmin();
    const now = new Date();

    // Body { "dry_run": true } → compute and count only, send nothing (testing).
    let dryRun = false;
    try { const body = await req.json(); dryRun = !!(body && body.dry_run); } catch (_) { /* no body = scheduled run */ }

    let page = 0;
    const PAGE_SIZE = 50;
    let hasMore = true;
    let alertsSent = 0;
    let usersProcessed = 0;

    while (hasMore) {
      const b44Users = await base44.asServiceRole.entities.User.list("created_date", PAGE_SIZE, page * PAGE_SIZE);
      if (!b44Users || b44Users.length === 0) break;
      if (b44Users.length < PAGE_SIZE) hasMore = false;
      page++;

      for (const b44User of b44Users) {
        try {
          const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ search: b44User.email });
          if (error || !users || users.length === 0) continue;
          const supaUser = users.find((u: any) => u.email === b44User.email);
          if (!supaUser) continue;
          const uid = supaUser.id;
          // Respect the Smart Bill Alerts toggle (default ON unless explicitly false).
          // The profiles row is authoritative — the Base44 sync can fail silently.
          if (b44User.smart_alerts === false) continue;
          const toggles = await getProfileNotificationToggles(supabaseAdmin, uid);
          if (toggles.smartAlerts === false) continue;
          const currency = b44User.preferred_currency || "USD";

          // Pull this user's active bills (is_active NULL = active, same rule as
          // the Dashboard), active loans, and loan payments for the dedupe check.
          const [billsRes, loansRes, loanPaysRes] = await Promise.all([
            supabaseAdmin.from('bills')
              .select('name, amount, due_day, payment_frequency, last_paid_date')
              .eq('user_id', uid)
              .or('is_active.is.null,is_active.eq.true'),
            supabaseAdmin.from('loans')
              .select('id, name, monthly_payment, due_day, status')
              .eq('user_id', uid)
              .neq('status', 'paid_off'),
            supabaseAdmin.from('payments')
              .select('loan_id, payment_date')
              .eq('user_id', uid)
              .eq('payment_type', 'loan'),
          ]);
          const bills = billsRes.data || [];
          const loans = loansRes.data || [];
          const loanPayments = loanPaysRes.data || [];

          // Filter to bills due in the next 3 days (by day-of-month)
          const upcoming = (bills || []).filter((b: any) => {
            if (!b.due_day) return false;
            // Skip bills already marked paid this month (mirrors DueThisWeek)
            if (b.last_paid_date) {
              const pd = new Date(b.last_paid_date);
              if (pd.getMonth() === now.getMonth() && pd.getFullYear() === now.getFullYear()) return false;
            }
            const day = Number(b.due_day);
            if (!day || day < 1 || day > 31) return false;
            const due = new Date(now.getFullYear(), now.getMonth(), day);
            let diff = (due.getTime() - now.getTime()) / 86400000;
            if (diff < 0) {
              due.setMonth(due.getMonth() + 1);
              diff = (due.getTime() - now.getTime()) / 86400000;
            }
            return diff >= 0 && diff <= 3;
          });

          // Loans with a monthly due day in the next 3 days, skipping loans
          // already paid this month — mirrors the bill logic above.
          const loansDue = loans.filter((l: any) => {
            if (!l.due_day) return false;
            const paidThisMonth = loanPayments.some((p: any) =>
              String(p.loan_id) === String(l.id) &&
              new Date(p.payment_date).getMonth() === now.getMonth() &&
              new Date(p.payment_date).getFullYear() === now.getFullYear());
            if (paidThisMonth) return false;
            const day = Number(l.due_day);
            if (!day || day < 1 || day > 31) return false;
            const due = new Date(now.getFullYear(), now.getMonth(), day);
            let diff = (due.getTime() - now.getTime()) / 86400000;
            if (diff < 0) {
              due.setMonth(due.getMonth() + 1);
              diff = (due.getTime() - now.getTime()) / 86400000;
            }
            return diff >= 0 && diff <= 3;
          });

          if (upcoming.length === 0 && loansDue.length === 0) continue;

          const items = [
            ...upcoming.map((b: any) => `• ${b.name} — ${fmtMoney(b.amount, currency)}`),
            ...loansDue.map((l: any) => `• ${l.name} (loan payment) — ${fmtMoney(l.monthly_payment, currency)}`),
          ];
          const body = `Rayma AI: You have ${items.length} payment${items.length === 1 ? "" : "s"} due in the next 3 days:\n${items.join("\n")}`;

          if (dryRun) { alertsSent++; continue; } // counted, nothing sent

          const result = await notifyUser(base44, {
            phone: b44User.phone_number,
            email: supaUser.email,
            body,
            subject: "Upcoming Payments — Rayma AI",
          });
          if (result.sent) alertsSent++;
          usersProcessed++;
        } catch (e) {
          console.warn(`[smartBillAlerts] Skipped a user:`, e.message);
        }
      }
    }

    return Response.json({ success: true, dry_run: dryRun, alerts_sent: alertsSent, users_processed: usersProcessed });
  } catch (error) {
    console.error('[smartBillAlerts] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}