import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('submissions').select('*').limit(1);
  if (error) {
    console.error(error);
    process.exit(1);
  }
  
  if (data && data.length > 0) {
    console.log("Raw object from Supabase:");
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log("No submissions found.");
  }
  process.exit(0);
}

run();
