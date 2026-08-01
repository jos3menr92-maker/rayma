/**
 * Resolve a Supabase auth user UUID from an email via the admin API.
 *
 * admin.listUsers({ search }) performs a partial match and paginates
 * (1000/page), so we confirm an exact, case-insensitive email match to avoid
 * returning the wrong user when several emails share a prefix. Returns the
 * user id or null if no exact match is found.
 */
export async function getSupaUserIdByEmail(supabaseAdmin, email) {
  if (!email) return null;
  const lower = String(email).toLowerCase();
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ search: email });
    if (error || !data?.users) return null;
    const match = data.users.find((u) => (u.email || '').toLowerCase() === lower);
    return match?.id || null;
  } catch (err) {
    console.warn('[supabaseUserLookup] listUsers failed:', err?.message);
    return null;
  }
}