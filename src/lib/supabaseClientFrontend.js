import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'https://vadbebezckuppusxukdx.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = '******.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZGJlYmV6Y2t1cHB1c3h1a2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNzcwNzksImV4cCI6MjA5Njc1MzA3OX0.kbUULYfByVgmxkouuc-Jn96pqtGDffbjdnfNeMRNELc';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn("[Rayma AI] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set — using hardcoded public fallbacks.");
}

// Create the client with options that handle token persistence and auto-refresh.
// If the real env vars are missing, Supabase calls will fail with network errors
// (caught by try/catch in consumers) instead of crashing the entire app.
let _client = null;

function getClient() {
  if (_client) return _client;
  _client = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }
  );
  return _client;
}

// Proxy: defers client creation until first property access, so importing this
// module never crashes the app even when env vars are absent.
export const supabase = new Proxy({}, {
  get(_target, prop) {
    const client = getClient();
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

export async function runConnectionTrap() {
  try {
    const { error } = await getClient().auth.getSession();
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