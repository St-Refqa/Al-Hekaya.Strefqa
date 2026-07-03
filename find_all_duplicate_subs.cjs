const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('submissions').select('*');
  const duplicates = {};
  data.forEach(sub => {
    const key = sub.participantId + '_' + sub.assessmentId;
    if (!duplicates[key]) duplicates[key] = [];
    duplicates[key].push(sub);
  });

  const dupes = Object.values(duplicates).filter(arr => arr.length > 1);
  console.log('Duplicate submissions found:', dupes.length);

  let toDelete = [];
  dupes.forEach(arr => {
    console.log('User ID:', arr[0].participantId, 'Assessment:', arr[0].assessmentTitle, 'Count:', arr.length);
    arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    arr.slice(1).forEach(l => toDelete.push(l));
  });

  console.log(`Need to delete ${toDelete.length} submissions`);
  
  for (let sub of toDelete) {
    if (sub.assessmentTitle.includes('متي') || sub.assessmentTitle.includes('متى') || sub.assessmentTitle.includes('6') || sub.assessmentTitle.includes('7') || sub.assessmentTitle.includes('إنجيل')) {
        console.log(`Deleting ${sub.id} (${sub.assessmentTitle})...`);
        await supabase.from('submissions').delete().eq('id', sub.id);
        
        // Also deduct points
        const { data: userData } = await supabase.from('users').select('totalPoints, cumulativePoints').eq('uid', sub.participantId).single();
        if (userData) {
          await supabase.from('users').update({
            totalPoints: userData.totalPoints - (sub.finalScore || 0),
            cumulativePoints: userData.cumulativePoints - (sub.finalScore || 0)
          }).eq('uid', sub.participantId);
          console.log(`Updated user ${sub.participantId} points (-${sub.finalScore}).`);
        }
    }
  }
}
run();
