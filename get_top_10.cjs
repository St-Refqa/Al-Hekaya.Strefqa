const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nssuihqftjpojeakupfj.supabase.co',
  'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS'
);

async function getTop10() {
  const { data: users, error } = await supabase.from('users').select('*').eq('role', 'student');
  if (error) throw error;

  let students = [];
  users.forEach(data => {
    students.push({
      name: data.fullName || 'Unknown',
      code: data.code || '',
      r1: data.sidebarSettings?.round1Points || data.round1Points || 0,
      r2: data.totalPoints || 0
    });
  });

  const workshop = students.filter(s => s.code.toUpperCase().startsWith('N') || s.code.toUpperCase().startsWith('S'));
  const online = students.filter(s => s.code.toUpperCase().startsWith('H'));

  const top10WR1 = [...workshop].sort((a,b) => b.r1 - a.r1).slice(0, 10);
  const top10WR2 = [...workshop].sort((a,b) => b.r2 - a.r2).slice(0, 10);
  
  const top10OR1 = [...online].sort((a,b) => b.r1 - a.r1).slice(0, 10);
  const top10OR2 = [...online].sort((a,b) => b.r2 - a.r2).slice(0, 10);

  const results = {
    top10WR1, top10WR2, top10OR1, top10OR2
  };
  
  const fs = require('fs');
  fs.writeFileSync('top10_results.json', JSON.stringify(results, null, 2));
  console.log("Written to top10_results.json");
}

getTop10().catch(console.error);
