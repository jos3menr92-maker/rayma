import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'https://vadbebezckuppusxukdx.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = '******.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZGJlYmV6Y2t1cHB1c3h1a2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNzcwNzksImV4cCI6MjA5Njc1MzA3OX0.kbUULYfByVgmxkouuc-Jn96pqtGDffbjdnfNeMRNELc';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn("[Rayma AI] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set in supabaseClientBackend.js — using hardcoded public fallbacks.");
}

// Lazy proxy — defers client creation so importing this module never crashes
// the app when env vars are absent.
let _client = null;

function getClient() {
  if (_client) return _client;
  _client = createClient(
    supabaseUrl,
    supabaseKey
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