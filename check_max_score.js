import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('submissions').select('*');
  if (error) throw error;
  
  let zeroMaxScore = 0;
  data.forEach(s => {
     if (s.maxScore === 0) zeroMaxScore++;
  });
  
  console.log('Submissions with maxScore = 0:', zeroMaxScore);
}
run();
