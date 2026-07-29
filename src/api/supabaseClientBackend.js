import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("[Rayma AI] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in supabaseClientBackend.js.");
}

// Lazy proxy — defers client creation so importing this module never crashes
// the app when env vars are absent.
let _client = null;

function getClient() {
  if (_client) return _client;
  _client = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseKey || 'placeholder-anon-key'
  );
  return _client;
}

export const supabase = new Proxy({}, {
  get(_target, prop) {
    const client = getClient();
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

export { createClient };