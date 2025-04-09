
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
export const supabase = createClient(supabaseUrl, supabaseServiceKey);
