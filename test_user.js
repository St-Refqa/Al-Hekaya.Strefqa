import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) {
     console.error('Error:', error);
  } else {
     console.log('User columns:', Object.keys(data[0] || {}));
  }
}

run();
