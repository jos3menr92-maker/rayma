import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[Rayma AI] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Set these environment variables before building.");
}

// Create the client with options that handle token persistence and auto-refresh.
// If the real env vars are missing, Supabase calls will fail with network errors
// (caught by try/catch in consumers) instead of crashing the entire app.
let _client = null;

function getClient() {
  if (_client) return _client;
  _client = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-anon-key',
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