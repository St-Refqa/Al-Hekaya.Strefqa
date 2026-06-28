import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('submissions').select('id, participantName, finalScore, maxScore, assessmentTitle, status');
  if (error) throw error;
  
  let noScore = 0;
  let zeroScore = 0;
  let notCompleted = 0;
  let badData = 0;
  
  data.forEach(s => {
     if (s.finalScore === null || s.finalScore === undefined) noScore++;
     else if (s.finalScore === 0 && s.maxScore > 0) zeroScore++;
     
     if (s.status !== 'completed') notCompleted++;
     
     if (!s.participantName) badData++;
  });
  
  console.log(`Total submissions: ${data.length}`);
  console.log(`No score (null/undefined): ${noScore}`);
  console.log(`Zero score (when max > 0): ${zeroScore}`);
  console.log(`Not completed: ${notCompleted}`);
  console.log(`Missing name: ${badData}`);
}
run();
