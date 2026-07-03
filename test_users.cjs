const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const res = await supabase.from('users').select('uid').limit(1);
  console.log(res);
}
run();
