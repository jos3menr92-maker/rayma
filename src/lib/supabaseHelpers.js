/**
 * supabaseHelpers.js — Session-aware CRUD helpers for frontend Supabase operations.
 *
 * These functions wrap direct Supabase client calls with automatic token refresh
 * on 401/expired JWT errors. If the browser Supabase session is missing or
 * cannot be refreshed, they automatically fall back to the manageFinancialRecord
 * backend function (Base44 auth + service role key) so logging always works.
 */
import { supabase } from "@/lib/supabaseClientFrontend";
import { base44 } from "@/api/base44Client";

/**
 * Fallback to the manageFinancialRecord backend function when the browser
 * Supabase session is missing/expired. Uses Base44 auth + service role key,
 * so logging works even when the frontend session is dead.
 */
async function backendCreate(table, data) {
  try {
    const res = await base44.functions.invoke('manageFinancialRecord', { action: 'create', table, data });
    return res.data?.record;
  } catch (err) {
    throw new Error(err?.response?.data?.error || err?.message || 'Backend save failed');
  }
}

async function backendUpdate(table, recordId, data) {
  try {
    const res = await base44.functions.invoke('manageFinancialRecord', { action: 'update', table, record_id: recordId, data });
    return res.data?.record;
  } catch (err) {
    throw new Error(err?.response?.data?.error || err?.message || 'Backend update failed');
  }
}

async function backendDelete(table, recordId) {
  try {
    await base44.functions.invoke('manageFinancialRecord', { action: 'delete', table, record_id: recordId });
  } catch (err) {
    throw new Error(err?.response?.data?.error || err?.message || 'Backend delete failed');
  }
}

/**
 * Attempt a silent token refresh if the Supabase session has expired.
 * Returns the refreshed session user or null.
 */
async function tryRefreshSession() {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.warn("[supabaseHelpers] Token refresh failed:", error.message);
      return null;
    }
    return data?.session?.user || null;
  } catch (err) {
    console.warn("[supabaseHelpers] Token refresh exception:", err.message);
    return null;
  }
}

/**
 * Checks if an error indicates an expired/invalid session (401/JWT).
 */
function isAuthError(error) {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  const code = error.code || "";
  return (
    error.status === 401 ||
    error.status === 403 ||
    code === "PGRST301" ||
    msg.includes("jwt expired") ||
    msg.includes("invalid jwt") ||
    msg.includes("not authenticated") ||
    msg.includes("unauthorized") ||
    msg.includes("refresh_token_not_found")
  );
}

/**
 * Build a human-readable error message for failed DB operations.
 */
function buildErrorMessage(table, operation, error) {
  const detail = error?.details || error?.hint || "";
  const base = `[${table}] ${operation} failed: ${error?.message || "Unknown error"}`;
  return detail ? `${base} (${detail})` : base;
}

/**
 * Get the current user ID, refreshing session if necessary.
 */
async function getValidUserId() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) return session.user.id;

  // Session expired — attempt refresh
  const user = await tryRefreshSession();
  if (user?.id) return user.id;

  throw new Error("No active Supabase session. Please log in again.");
}

/**
 * Insert a record into the given table with the current user's ID.
 * Automatically retries once after a silent token refresh on auth errors.
 */
export async function createRecord(table, data) {
  let userId;
  try {
    userId = await getValidUserId();
  } catch {
    return backendCreate(table, data);
  }

  const payload = { ...data, user_id: userId };
  const { data: record, error } = await supabase
    .from(table)
    .insert(payload)
    .select()
    .single();

  if (error && isAuthError(error)) {
    const refreshedUser = await tryRefreshSession();
    if (!refreshedUser?.id) return backendCreate(table, data);

    const retryPayload = { ...data, user_id: refreshedUser.id };
    const { data: retryRecord, error: retryError } = await supabase
      .from(table)
      .insert(retryPayload)
      .select()
      .single();

    if (retryError && isAuthError(retryError)) return backendCreate(table, data);
    if (retryError) throw new Error(buildErrorMessage(table, "insert", retryError));
    return retryRecord;
  }

  if (error) throw new Error(buildErrorMessage(table, "insert", error));
  return record;
}

/**
 * Update a record by ID.
 * Automatically retries once after a silent token refresh on auth errors.
 */
export async function updateRecord(table, recordId, data) {
  try {
    await getValidUserId();
  } catch {
    return backendUpdate(table, recordId, data);
  }

  const { data: record, error } = await supabase
    .from(table)
    .update(data)
    .eq("id", recordId)
    .select()
    .single();

  if (error && isAuthError(error)) {
    const refreshedUser = await tryRefreshSession();
    if (!refreshedUser?.id) return backendUpdate(table, recordId, data);

    const { data: retryRecord, error: retryError } = await supabase
      .from(table)
      .update(data)
      .eq("id", recordId)
      .select()
      .single();

    if (retryError && isAuthError(retryError)) return backendUpdate(table, recordId, data);
    if (retryError) throw new Error(buildErrorMessage(table, "update", retryError));
    return retryRecord;
  }

  if (error) throw new Error(buildErrorMessage(table, "update", error));
  return record;
}

/**
 * Delete a record by ID.
 * Automatically retries once after a silent token refresh on auth errors.
 */
export async function deleteRecord(table, recordId) {
  try {
    await getValidUserId();
  } catch {
    return backendDelete(table, recordId);
  }

  const { error } = await supabase
    .from(table)
    .delete()
    .eq("id", recordId);

  if (error && isAuthError(error)) {
    const refreshedUser = await tryRefreshSession();
    if (!refreshedUser?.id) return backendDelete(table, recordId);

    const { error: retryError } = await supabase
      .from(table)
      .delete()
      .eq("id", recordId);

    if (retryError && isAuthError(retryError)) return backendDelete(table, recordId);
    if (retryError) throw new Error(buildErrorMessage(table, "delete", retryError));
    return;
  }

  if (error) throw new Error(buildErrorMessage(table, "delete", error));
}