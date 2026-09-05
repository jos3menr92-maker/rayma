import { getSupabaseAdmin } from '../../shared/supabaseClient.ts';

/**
 * Auto-logs recurring income entries.
 * Runs on a daily schedule. For each active recurring income template:
 *  - Duplicate guard: if a user has 2+ active templates, only the newest
 *    (latest anchor week_start) auto-logs; the rest are skipped.
 *  - Rolling average: the logged amount is the average of the user's last 3
 *    REAL paychecks (manual logs / confirmed scans — never auto-logged
 *    entries). Falls back to the template amount when no real history exists.
 */

function getCurrentPeriodStart(frequency: string, anchorDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (frequency === 'monthly') {
    // First of current month
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    return d.toISOString().split('T')[0];
  }

  // weekly or biweekly — find the start of the current period based on anchor date
  const anchor = new Date(anchorDate + 'T00:00:00');
  anchor.setHours(0, 0, 0, 0);

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysSinceAnchor = Math.floor((today.getTime() - anchor.getTime()) / msPerDay);

  let periodDays = 7;
  if (frequency === 'biweekly') periodDays = 14;

  const periodsElapsed = Math.floor(daysSinceAnchor / periodDays);
  const periodStart = new Date(anchor);
  periodStart.setDate(anchor.getDate() + periodsElapsed * periodDays);

  return periodStart.toISOString().split('T')[0];
}

export default async function (req: Request): Promise<Response> {
  try {
    const { client: supabaseAdmin } = getSupabaseAdmin();

    // Fetch all active recurring income templates
    const { data: templates, error: fetchErr } = await supabaseAdmin
      .from('incomes')
      .select('*')
      .eq('is_recurring', true)
      .eq('recurring_active', true);

    if (fetchErr) throw fetchErr;

    // Duplicate guard — one active template per user (the newest wins)
    const byUser = new Map<string, any>();
    const skippedDuplicates: string[] = [];
    for (const tmpl of templates || []) {
      if (!tmpl.week_start || !tmpl.recurring_frequency || !tmpl.user_id) continue;
      const current = byUser.get(tmpl.user_id);
      if (!current) {
        byUser.set(tmpl.user_id, tmpl);
      } else if (tmpl.week_start > current.week_start) {
        skippedDuplicates.push(current.id);
        byUser.set(tmpl.user_id, tmpl);
      } else {
        skippedDuplicates.push(tmpl.id);
      }
    }

    let created = 0;
    const errors: string[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    for (const tmpl of byUser.values()) {
      try {
        const periodStart = getCurrentPeriodStart(tmpl.recurring_frequency, tmpl.week_start);

        // Skip the template's own period — the template IS that week's real
        // paycheck (financeMath.realIncomeEntries counts it once). Auto-logged
        // clones start from the NEXT period so paychecks are never duplicated.
        if (periodStart <= tmpl.week_start) continue;
        // Skip if the period is in the future
        if (periodStart > todayStr) continue;

        // Rolling average of the last 3 REAL paychecks (auto-logged entries never feed the math)
        const { data: realPaychecks, error: realErr } = await supabaseAdmin
          .from('incomes')
          .select('amount')
          .eq('user_id', tmpl.user_id)
          .is('recurring_source_id', null)
          .not('week_start', 'is', null)
          .order('week_start', { ascending: false })
          .limit(3);

        let amount = tmpl.amount;
        if (!realErr && realPaychecks && realPaychecks.length > 0) {
          const sum = realPaychecks.reduce((s, r) => s + (r.amount || 0), 0);
          amount = Math.round((sum / realPaychecks.length) * 100) / 100;
        } else if (realErr) {
          errors.push(`Average lookup for template ${tmpl.id}: ${realErr.message}`);
        }

        // Check if an entry already exists for this period (from this template)
        const { data: existing } = await supabaseAdmin
          .from('incomes')
          .select('id')
          .eq('user_id', tmpl.user_id)
          .eq('recurring_source_id', tmpl.id)
          .eq('week_start', periodStart)
          .limit(1);

        if (existing && existing.length > 0) continue; // already logged

        // Create the auto-logged entry (average-based)
        const { error: insertErr } = await supabaseAdmin
          .from('incomes')
          .insert([{
            amount,
            week_start: periodStart,
            frequency: tmpl.recurring_frequency,
            note: tmpl.note,
            source: tmpl.note || 'Auto-logged',
            user_id: tmpl.user_id,
            is_active: true,
            is_recurring: false,
            recurring_active: false,
            recurring_source_id: tmpl.id
          }]);

        if (insertErr) {
          errors.push(`Template ${tmpl.id}: ${insertErr.message}`);
        } else {
          created++;
        }
      } catch (tmplErr) {
        errors.push(`Template ${tmpl.id}: ${tmplErr.message}`);
      }
    }

    return Response.json({
      success: true,
      templates_checked: byUser.size,
      duplicate_templates_skipped: skippedDuplicates.length,
      created,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('[autoLogRecurringIncome] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}