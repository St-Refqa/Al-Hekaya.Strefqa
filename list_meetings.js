import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('preparationMeetings').select('*');
  if (error) {
    console.error("Error fetching preparationMeetings:", error);
  } else {
    console.log("All preparationMeetings in DB:", JSON.stringify(data, null, 2));
  }
  process.exit(0);
}

run();
