import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function run() {
  console.log("1. Deleting non-servant appointments (like 'كرنفال')...");
  const { error: delError } = await supabase
    .from('preparationMeetings')
    .delete()
    .eq('id', '3bob8zqga1fwxe9h9r9109');
    
  if (delError) {
    console.error("Delete failed:", delError);
    process.exit(1);
  }
  console.log("Successfully deleted Carnival.");

  console.log("2. Inserting new appointments for 8-8 and 8-15 (نهضة العدرا)...");
  const newMeetings = [
    {
      id: generateId(),
      title: "نهضة العذراء مريم",
      description: "نهضة العدرا",
      dateTime: "2026-08-08T19:00:00",
      reminderSent12h: false,
      createdAt: new Date().toISOString(),
      createdBy: "مسؤول الخدمة"
    },
    {
      id: generateId(),
      title: "نهضة العذراء مريم",
      description: "نهضة العدرا",
      dateTime: "2026-08-15T19:00:00",
      reminderSent12h: false,
      createdAt: new Date().toISOString(),
      createdBy: "مسؤول الخدمة"
    }
  ];

  const { error: insertError } = await supabase
    .from('preparationMeetings')
    .insert(newMeetings);

  if (insertError) {
    console.error("Insert failed:", insertError);
    process.exit(1);
  }
  
  console.log("Successfully updated the database table preparationMeetings.");
  process.exit(0);
}

run();
