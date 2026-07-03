import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: subs, error } = await supabase.from('submissions').select('*');
  if (error) {
    console.error('Error fetching submissions:', error);
    process.exit(1);
  }
  
  const testName = 'متي 6 و 7';
  const matchingSubs = subs.filter(s => s.assessmentTitle && s.assessmentTitle.includes('متي 6 و 7'));
  
  const grouped = {};
  matchingSubs.forEach(s => {
    const key = s.participantId + '_' + s.assessmentId;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  });
  
  const duplicates = Object.values(grouped).filter(arr => arr.length > 1);
  console.log('Duplicates found for test:', duplicates.length);
  
  let toDelete = [];
  duplicates.forEach(arr => {
    console.log('Participant:', arr[0].participantName, 'Count:', arr.length);
    // Keep the one with the highest score, or the latest date
    arr.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    arr.forEach((s, idx) => {
        console.log('  ', s.id, s.date, s.finalScore, idx === 0 ? '(KEEP)' : '(DELETE)');
        if (idx !== 0) {
            toDelete.push(s.id);
        }
    });
  });

  console.log('IDs to delete:', toDelete);
}

run();
