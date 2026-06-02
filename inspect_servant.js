import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching user with code s001...");
  // Let's query users table in Supabase where code is s001 or S001
  const { data: users, error } = await supabase.from('users').select('*').ilike('code', 's001');
  if (error) {
    console.error(error);
    process.exit(1);
  }
  
  console.log("Search result for code s001:", JSON.stringify(users, null, 2));
  process.exit(0);
}

run();
