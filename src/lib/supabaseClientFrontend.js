import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[Rayma AI] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Set these environment variables before building.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function runConnectionTrap() {
  try {
    const { error } = await supabase.auth.getSession();
    if (error) {
      console.error("[Supabase] Connection rejected:", error.message);
      return false;
    }
    console.log("[Supabase] Connection healthy.");
    return true;
  } catch (err) {
    console.error("[Supabase] Network error:", err.message);
    return false;
  }
}