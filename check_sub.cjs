const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nssuihqftjpojeakupfj.supabase.co',
  'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS'
);

async function checkSubmissions() {
  const { data: submissions } = await supabase.from('submissions').select('*').limit(5);
  console.log(submissions[0]);
}

checkSubmissions().catch(console.error);
