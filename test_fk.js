import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('submissions').insert({
      id: 'test_fk_error',
      participantId: 'does_not_exist',
      assessmentId: 'does_not_exist',
      participantName: 'test',
      status: 'completed',
      date: new Date().toISOString()
  });
  console.log('Error:', error);
}

run();
