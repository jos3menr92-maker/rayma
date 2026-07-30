/**
 * financialRecord — client-side wrapper for the manageFinancialRecord backend function.
 *
 * Routes all financial record CRUD through the backend, which resolves the user
 * from Base44 auth (always available) instead of relying on the Supabase browser
 * session (which periodically expires and causes "Missing User ID" / "Failed to fetch"
 * errors on every manual log button).
 *
 * Usage:
 *   import { createRecord, updateRecord, deleteRecord } from '@/utils/financialRecord';
 *   await createRecord('loans', { name: 'Car', current_balance: 50000, ... });
 *   await updateRecord('assets', recordId, { amount: 1000 });
 *   await deleteRecord('assets', recordId);
 */

async function call(action, table, data, recordId) {
  const res = await fetch('/api/base44/manageFinancialRecord', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, table, data, record_id: recordId }),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || `Failed to ${action} record`);
  return json;
}

export async function createRecord(table, data) {
  const result = await call('create', table, data);
  return result.record;
}

export async function updateRecord(table, recordId, data) {
  const result = await call('update', table, data, recordId);
  return result.record;
}

export async function deleteRecord(table, recordId) {
  return call('delete', table, null, recordId);
}