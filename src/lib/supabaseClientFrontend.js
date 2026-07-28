import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://vadbebezckuppusxukdx.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZGJlYmV6Y2t1cHB1c3h1a2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNzcwNzksImV4cCI6MjA5Njc1MzA3OX0.kbUULYfByVgmxkouuc-Jn96pqtGDffbjdnfNeMRNELc";

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn("[Rayma AI] Supabase env vars not found in build — using fallback config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in production for correct operation.");
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