import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('submissions').select('id, participantName, assessmentTitle, baseScore, finalScore, maxScore, answers');
  if (error) {
    console.error(error);
    process.exit(1);
  }
  
  console.log(`Found ${data.length} submissions in database:`);
  data.forEach((sub, i) => {
    const totalPointsSum = sub.answers ? sub.answers.reduce((acc, c) => acc + (c.maxPoints || 0), 0) : 'no answers';
    console.log(`Sub #${i}: ID: ${sub.id} | Student: ${sub.participantName} | Exam: ${sub.assessmentTitle} | Base: ${sub.baseScore} | Final: ${sub.finalScore} | Max: ${sub.maxScore} | Calculated Sum from answers: ${totalPointsSum}`);
  });
  process.exit(0);
}

run();
