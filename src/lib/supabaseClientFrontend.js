import { createClient } from '@supabase/supabase-js';

// 1. The Bulletproof Fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://vadbebezckuppusxukdx.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZGJlYmV6Y2t1cHB1c3h1a2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNzcwNzksImV4cCI6MjA5Njc1MzA3OX0.kbUULYfByVgmxkouuc-Jn96pqtGDffbjdnfNeMRNELc";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. 🪤 THE DIAGNOSTIC TRAP 🪤
export async function runConnectionTrap() {
  try {
    // Attempt a lightweight ping to the Auth server
    const { error } = await supabase.auth.getSession();
    
    if (error) {
      alert(`🔴 SUPABASE REJECTED CONNECTION!\n\nReason: ${error.message}\n\nCheck your keys and URL.`);
      console.error("Trap Caught Error:", error);
      return false;
    }
    
    console.log("🟢 SUPABASE TRAP: Connection is perfectly healthy!");
    return true;
  } catch (err) {
    alert(`🔴 CRITICAL NETWORK CRASH!\n\nThe app cannot reach Supabase at all. It might be a bad URL or CORS issue.\n\nDetails: ${err.message}`);
    console.error("Trap Caught Crash:", err);
    return false;
  }
}