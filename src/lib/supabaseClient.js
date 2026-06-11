import { createClient } from '@supabase/supabase-js';

// RAYMA's secure connection to the database
const supabaseUrl = 'https://vadbebezckuppusxukdx.supabase.co';
const supabaseAnonKey = 'sb_publishable_yn9qklEphaMgMBr1bOC2sA_gQFoRno2';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
