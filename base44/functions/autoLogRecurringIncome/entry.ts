import { getSupabaseAdmin } from '../../shared/supabaseClient.ts';

/**
 * Auto-logs recurring income entries.
 * Runs on a daily schedule. For each active recurring income template,
 * checks if an entry should be created for the current period and creates one if not.
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

export default async function(req: Request): Promise<Response> {
  try {
    const { client: supabaseAdmin } = getSupabaseAdmin();

    // Fetch all active recurring income templates
    const { data: templates, error: fetchErr } = await supabaseAdmin
      .from('incomes')
      .select('*')
      .eq('is_recurring', true)
      .eq('recurring_active', true);

    if (fetchErr) throw fetchErr;

    let created = 0;
    const errors: string[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    for (const tmpl of templates || []) {
      try {
        if (!tmpl.week_start || !tmpl.recurring_frequency || !tmpl.user_id) continue;

        const periodStart = getCurrentPeriodStart(tmpl.recurring_frequency, tmpl.week_start);

        // Skip if the period is before the original entry (don't backfill before creation)
        if (periodStart < tmpl.week_start) continue;
        // Skip if the period is in the future
        if (periodStart > todayStr) continue;

        // Check if an entry already exists for this period (from this template)
        const { data: existing } = await supabaseAdmin
          .from('incomes')
          .select('id')
          .eq('user_id', tmpl.user_id)
          .eq('recurring_source_id', tmpl.id)
          .eq('week_start', periodStart)
          .limit(1);

        if (existing && existing.length > 0) continue; // already logged

        // Create the auto-logged entry
        const { error: insertErr } = await supabaseAdmin
          .from('incomes')
          .insert([{
            amount: tmpl.amount,
            week_start: periodStart,
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
      templates_checked: (templates || []).length,
      created,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('[autoLogRecurringIncome] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}