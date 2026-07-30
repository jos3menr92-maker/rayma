/**
 * supabaseHelpers.js — Session-aware CRUD helpers for frontend Supabase operations.
 *
 * These functions wrap direct Supabase client calls with automatic token refresh
 * on 401/expired JWT errors, preventing the "Missing User ID" failures that
 * previously caused the app to route everything through a metered backend.
 */
import { supabase } from "@/lib/supabaseClientFrontend";

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
 * Checks if an error indicates an expired/invalid session.
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
    msg.includes("unauthorized")
  );
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
  const userId = await getValidUserId();
  const payload = { ...data, user_id: userId };

  const { data: record, error } = await supabase
    .from(table)
    .insert(payload)
    .select()
    .single();

  if (error && isAuthError(error)) {
    // Retry after refresh
    const refreshedUser = await tryRefreshSession();
    if (!refreshedUser?.id) throw new Error("Session expired. Please log in again.");
    
    const retryPayload = { ...data, user_id: refreshedUser.id };
    const { data: retryRecord, error: retryError } = await supabase
      .from(table)
      .insert(retryPayload)
      .select()
      .single();

    if (retryError) throw new Error(retryError.message);
    return retryRecord;
  }

  if (error) throw new Error(error.message);
  return record;
}

/**
 * Update a record by ID.
 * Automatically retries once after a silent token refresh on auth errors.
 */
export async function updateRecord(table, recordId, data) {
  await getValidUserId();

  const { data: record, error } = await supabase
    .from(table)
    .update(data)
    .eq("id", recordId)
    .select()
    .single();

  if (error && isAuthError(error)) {
    await tryRefreshSession();
    const { data: retryRecord, error: retryError } = await supabase
      .from(table)
      .update(data)
      .eq("id", recordId)
      .select()
      .single();

    if (retryError) throw new Error(retryError.message);
    return retryRecord;
  }

  if (error) throw new Error(error.message);
  return record;
}

/**
 * Delete a record by ID.
 * Automatically retries once after a silent token refresh on auth errors.
 */
export async function deleteRecord(table, recordId) {
  await getValidUserId();

  const { error } = await supabase
    .from(table)
    .delete()
    .eq("id", recordId);

  if (error && isAuthError(error)) {
    await tryRefreshSession();
    const { error: retryError } = await supabase
      .from(table)
      .delete()
      .eq("id", recordId);

    if (retryError) throw new Error(retryError.message);
    return;
  }

  if (error) throw new Error(error.message);
}
