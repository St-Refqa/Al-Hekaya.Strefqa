const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const testRecord = {
    id: "test_" + Math.random().toString(36).substring(2, 8),
    title: "Test",
    description: "Test description",
    dateTime: "2026-06-19T19:00:00",
    createdAt: new Date().toISOString(),
    createdBy: "Test Runner"
  };
  
  console.log("Inserting basic record:", testRecord);
  const { data, error } = await supabase.from('preparationMeetings').insert(testRecord).select();
  if (error) {
    console.error("Insert failed:", error);
  } else {
    console.log("Insert succeeded!", data);
    // Cleanup
    await supabase.from('preparationMeetings').delete().eq('id', testRecord.id);
  }
}

test();
