import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('assessments').select('*').in('title', ['متي ٦', 'متي 7']);
  if (error) throw error;
  
  console.log(JSON.stringify(data, null, 2));
}

run();
