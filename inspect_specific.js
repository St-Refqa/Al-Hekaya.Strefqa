import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('submissions').select('*').eq('id', 'xq1oyju1u3yoim9xqsy2').single();
  if (error) {
    console.error(error);
    process.exit(1);
  }
  
  console.log("Raw submission object for xq1oyju1u3yoim9xqsy2:");
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

run();
