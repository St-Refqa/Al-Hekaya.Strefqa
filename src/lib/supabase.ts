import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';

export const supabase = createClient(supabaseUrl, supabaseKey);
