import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zzcwjfnibyvwdhfydvyw.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_kbwm0AIzVeSLAAwSUGw3oQ_Pp6AZHKX';

export const supabase = createClient(supabaseUrl, supabaseKey);
