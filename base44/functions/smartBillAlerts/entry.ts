import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSupabaseAdmin } from '../../shared/supabaseClient.ts';
import { notifyUser, fmtMoney } from '../../shared/notifications.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client: supabaseAdmin } = getSupabaseAdmin();
    const now = new Date();

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
          // Respect the Smart Bill Alerts toggle (default ON unless explicitly false)
          if (b44User.smart_alerts === false) continue;

          const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ search: b44User.email });
          if (error || !users || users.length === 0) continue;
          const supaUser = users.find((u: any) => u.email === b44User.email);
          if (!supaUser) continue;
          const uid = supaUser.id;
          const currency = b44User.preferred_currency || "USD";

          // Pull this user's active bills
          const { data: bills } = await supabaseAdmin.from('bills')
            .select('name, amount, due_day, payment_frequency')
            .eq('user_id', uid)
            .eq('is_active', true);

          // Filter to bills due in the next 3 days (by day-of-month)
          const upcoming = (bills || []).filter((b: any) => {
            if (!b.due_day) return false;
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

          if (upcoming.length === 0) continue;

          const list = upcoming.map((b: any) => `• ${b.name} — ${fmtMoney(b.amount, currency)}`).join("\n");
          const body = `Rayma AI: You have ${upcoming.length} bill${upcoming.length === 1 ? "" : "s"} due in the next 3 days:\n${list}`;

          const result = await notifyUser(base44, {
            phone: b44User.phone_number,
            email: supaUser.email,
            body,
            subject: "Upcoming Bills — Rayma AI",
          });
          if (result.sent) alertsSent++;
          usersProcessed++;
        } catch (e) {
          console.warn(`[smartBillAlerts] Skipped a user:`, e.message);
        }
      }
    }

    return Response.json({ success: true, alerts_sent: alertsSent, users_processed: usersProcessed });
  } catch (error) {
    console.error('[smartBillAlerts] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}