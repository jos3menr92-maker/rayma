import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getSupabaseAdmin } from '../../shared/supabaseClient.ts';

/**
 * Admin-gated cleanup for test-data contamination in a user's account:
 * 1. net-worth snapshots whose liabilities still include a since-deleted
 *    test loan (identified by total_liabilities far above any real balance)
 * 2. payments left pointing at a loan/bill that no longer exists
 *
 * Runs in dry-run mode by default: reports exactly what would be removed
 * and changes nothing. Pass execute: true to actually delete.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (caller.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const targetEmail = String(body.email || '').toLowerCase();
    const threshold = Number(body.liabilityThreshold || 30000);
    const execute = body.execute === true;
    if (!targetEmail) return Response.json({ error: 'email required' }, { status: 400 });

    const { client: supabase } = getSupabaseAdmin();

    // Resolve the Supabase user by exact (case-insensitive) email
    const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers({ search: targetEmail });
    if (listErr) throw listErr;
    const supaUser = users.find(u => String(u.email || '').toLowerCase() === targetEmail);
    if (!supaUser) return Response.json({ error: 'Supabase user not found' }, { status: 404 });
    const uid = supaUser.id;

    const [{ data: loans }, { data: bills }, { data: payments }, { data: snaps }] = await Promise.all([
      supabase.from('loans').select('id, name').eq('user_id', uid),
      supabase.from('bills').select('id, name').eq('user_id', uid),
      supabase.from('payments').select('id, payment_type, loan_id, bill_id, amount, payment_date, note').eq('user_id', uid).order('payment_date'),
      supabase.from('net_worth_snapshots').select('id, snapshot_date, total_assets, total_liabilities, net_worth').eq('user_id', uid).order('snapshot_date'),
    ]);

    const loanIds = new Set((loans || []).map(l => l.id));
    const billIds = new Set((bills || []).map(b => b.id));

    // 1. Snapshots that counted the since-deleted test loan as a liability
    const contaminated = (snaps || []).filter(s => (s.total_liabilities || 0) > threshold);

    // 2. Payments referencing a loan/bill that no longer exists in the account
    const orphanPayments = (payments || []).filter(p =>
      (p.payment_type === 'loan' && p.loan_id && !loanIds.has(p.loan_id)) ||
      (p.payment_type === 'bill' && p.bill_id && !billIds.has(p.bill_id))
    );

    const plan = {
      email: targetEmail,
      liabilityThreshold: threshold,
      contaminatedSnapshots: contaminated.map(s => `${s.snapshot_date} (net ${Math.round(s.net_worth || 0)})`),
      orphanedPayments: orphanPayments.map(p => `${p.payment_date} · ${p.amount}${p.note ? ` · ${p.note}` : ''}`),
    };

    if (!execute) {
      return Response.json({
        success: true, mode: 'dry-run',
        summary: { snapshotsToRemove: contaminated.length, paymentsToRemove: orphanPayments.length },
        ...plan,
      });
    }

    let snapshotsDeleted = 0;
    let paymentsDeleted = 0;
    if (contaminated.length > 0) {
      const { error } = await supabase.from('net_worth_snapshots').delete().in('id', contaminated.map(s => s.id));
      if (error) throw error;
      snapshotsDeleted = contaminated.length;
    }
    if (orphanPayments.length > 0) {
      const { error } = await supabase.from('payments').delete().in('id', orphanPayments.map(p => p.id));
      if (error) throw error;
      paymentsDeleted = orphanPayments.length;
    }

    return Response.json({
      success: true, mode: 'executed',
      summary: { snapshotsDeleted, paymentsDeleted },
      ...plan,
    });
  } catch (error) {
    console.error('[purgeTestContamination] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}