import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sub = {
    id: 'test_undefined_id',
    participantId: 'test',
    assessmentId: 'test',
    participantName: 'test',
    participantPhoneOrId: 'test',
    date: new Date().toISOString(),
    status: 'completed',
    answers: [{
        questionId: 'q1',
        userAnswer: 'hello',
        score: undefined, // undefined property!
        feedback: undefined
    }]
  };
  
  const { error } = await supabase.from('submissions').insert(sub);
  if (error) {
     console.error('Insert Error:', error);
  } else {
     console.log('Inserted successfully with undefined properties!');
     await supabase.from('submissions').delete().eq('id', 'test_undefined_id');
  }
}

run();
