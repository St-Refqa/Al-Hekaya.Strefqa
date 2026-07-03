const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nssuihqftjpojeakupfj.supabase.co', 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS');
async function run() {
  const { data } = await supabase.from('submissions').select('id, participantName, assessmentTitle, finalScore, assessmentId').ilike('participantName', '%Kirolos%');
  console.log(data);
}
run();
