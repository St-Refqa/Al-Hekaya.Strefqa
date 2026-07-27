import { config } from "dotenv";
config();
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://nssuihqftjpojeakupfj.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS";
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('push_subscriptions').select('*');
  console.log(data);
  console.log(error);
}

main();
