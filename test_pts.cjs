const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('point_logs').select('*').limit(1);
  console.log('point_logs', data, error);
  const { data: pur, error: err2 } = await supabase.from('purchases').select('*').limit(1);
  console.log('purchases', pur, err2);
  const { data: att, error: err3 } = await supabase.from('attendance').select('*').limit(1);
  console.log('attendance', att, err3);
}
run();
