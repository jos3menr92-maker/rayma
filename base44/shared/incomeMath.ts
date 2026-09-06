/**
 * Real income entries — mirrors src/utils/financeMath.js realIncomeEntries.
 * The ONE definition of "a paycheck actually happened" (used by
 * getComputedFinancials and weeklyCashFlowInsight):
 *   - manual logs, confirmed scans, and auto-logged clones always count;
 *   - a recurring TEMPLATE also counts for its own week — unless one of its
 *     auto-logged clones already covers that same week (legacy cron behavior);
 *   - a manual entry in a template's own week with the SAME amount is the
 *     same paycheck logged twice — count it once.
 */
export function realIncomeEntries(incomes: any[]): any[] {
  const list = incomes || [];
  const cloneWeeks = new Set<string>();
  const templateAmounts = new Map<string, number>();
  for (const i of list) {
    const week = String(i.week_start || "").slice(0, 10);
    if (i.recurring_source_id) {
      cloneWeeks.add(`${i.recurring_source_id}|${week}`);
    } else if (i.is_recurring) {
      templateAmounts.set(week, Number(i.amount) || 0);
    }
  }
  return list.filter((i) => {
    const week = String(i.week_start || "").slice(0, 10);
    if (!i.is_recurring && !i.recurring_source_id) {
      const tmplAmt = templateAmounts.get(week);
      if (tmplAmt !== undefined && Math.abs((Number(i.amount) || 0) - tmplAmt) < 0.01) return false;
      return true;
    }
    if (!i.is_recurring) return true;
    return !cloneWeeks.has(`${i.id}|${week}`);
  });
}