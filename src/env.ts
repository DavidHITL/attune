
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR_')) {
  console.error('[Config] Missing VITE_SUPABASE_URL – voice call cannot start');
}

if (!SUPABASE_KEY || SUPABASE_KEY.includes('YOUR_')) {
  console.error('[Config] Missing VITE_SUPABASE_ANON_KEY – voice call cannot start');
}
