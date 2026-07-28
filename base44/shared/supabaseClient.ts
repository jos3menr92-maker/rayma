import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

/**
 * Creates a Supabase admin client from environment variables.
 * Sanitizes the URL and key — secrets may contain quotes, brackets, or extra whitespace
 * that cause "Invalid URL string" errors in createClient().
 */
export function getSupabaseAdmin() {
  const rawUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL") || "";
  const urlMatch = rawUrl.match(/https:\/\/[^\s"'<>\[\]]+/);
  const supabaseUrl = urlMatch ? urlMatch[0] : "";

  const rawKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const keyMatch = rawKey.match(/eyJ[A-Za-z0-9_\-.]+/);
  const supabaseKey = keyMatch ? keyMatch[0] : rawKey.trim().replace(/^["'\[\]]|["'\[\]]$/g, "");

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase configuration secrets.");
  }

  return { client: createClient(supabaseUrl, supabaseKey), url: supabaseUrl };
}