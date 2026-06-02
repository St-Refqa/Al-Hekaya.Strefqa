import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const testId = 'test_' + Math.random().toString(36).substring(2, 10);
  const testSubmission = {
    id: testId,
    participantId: 'test_student',
    assessmentId: 'test_assessment',
    participantName: 'Test Student',
    participantPhoneOrId: 'T001',
    assessmentTitle: 'Test Exam',
    date: new Date().toISOString(),
    answers: [],
    baseScore: 15,
    maxScore: 20,
    bonusPoints: 0,
    finalScore: 15,
    status: 'completed'
  };

  console.log("Inserting test submission...");
  const { data, error } = await supabase.from('submissions').insert(testSubmission).select();
  if (error) {
    console.error("Insert error:", error);
    process.exit(1);
  }

  console.log("Inserted object returned from DB:", JSON.stringify(data, null, 2));

  console.log("Cleaning up test row...");
  await supabase.from('submissions').delete().eq('id', testId);
  process.exit(0);
}

run();
