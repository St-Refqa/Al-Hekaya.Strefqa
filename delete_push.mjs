import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function wipe() {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); 
    
  if (error) {
    console.error('Error deleting:', error);
  } else {
    console.log('Successfully deleted all old push subscriptions.');
  }
}

wipe();
