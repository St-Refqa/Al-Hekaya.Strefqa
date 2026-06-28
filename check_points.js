import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('assessments').select('id, title, questions');
  if (error) throw error;
  
  let missingPoints = 0;
  data.forEach(a => {
     let count = 0;
     if (Array.isArray(a.questions)) {
        a.questions.forEach(q => { if (q.points === undefined) count++; });
     } else if (a.questions) {
        ['easy', 'medium', 'hard'].forEach(level => {
            (a.questions[level] || []).forEach(q => {
               if (q.points === undefined) count++;
            });
        });
     }
     if (count > 0) {
        console.log(`Assessment ${a.title} has ${count} questions without points.`);
        missingPoints++;
     }
  });
  console.log(`Total assessments with missing points: ${missingPoints}`);
}
run();
