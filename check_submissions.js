import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('submissions').select('*');
  if (error) {
    console.error('Error fetching submissions:', error);
    process.exit(1);
  }
  
  let noScoreCount = 0;
  let zeroScoreCount = 0;
  let missingUserCount = 0;
  let otherStatusCount = 0;
  let emptyAnswersCount = 0;
  let hasRawScorePropertyCount = 0;
  let total = data.length;

  data.forEach(sub => {
    if (sub.finalScore === null || sub.finalScore === undefined) {
      noScoreCount++;
      // console.log('No score:', sub.id);
    } else if (sub.finalScore === 0) {
      zeroScoreCount++;
    }

    if (!sub.participantId) {
      missingUserCount++;
    }

    if (sub.status && sub.status !== 'completed' && sub.status !== 'graded') {
      otherStatusCount++;
    }
    
    if (!sub.answers || sub.answers.length === 0) {
        emptyAnswersCount++;
    }
    if (sub.score !== undefined) {
        hasRawScorePropertyCount++;
    }
  });

  console.log(`Total submissions: ${total}`);
  console.log(`Submissions with NO finalScore (null/undefined): ${noScoreCount}`);
  console.log(`Submissions with ZERO finalScore: ${zeroScoreCount}`);
  console.log(`Submissions missing participantId: ${missingUserCount}`);
  console.log(`Submissions with status other than completed/graded: ${otherStatusCount}`);
  console.log(`Submissions with NO answers: ${emptyAnswersCount}`);
  console.log(`Submissions that have a 'score' property instead of 'finalScore': ${hasRawScorePropertyCount}`);
}

run();
