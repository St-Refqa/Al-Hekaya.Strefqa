const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nssuihqftjpojeakupfj.supabase.co',
  'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS'
);

async function checkAmira() {
  const { data: users } = await supabase.from('users').select('*').eq('code', 'H079');
  const amira = users[0];
  console.log('Amira user:', {
    code: amira.code,
    name: amira.fullName,
    totalPoints: amira.totalPoints,
    cumulativePoints: amira.cumulativePoints,
    sidebarSettings: amira.sidebarSettings,
  });

  const { data: submissions } = await supabase.from('submissions').select('*').or(`participantId.eq.${amira.id},participantPhoneOrId.eq.H079`);
  console.log(`Submissions for Amira (${submissions.length}):`);
  let sum = 0;
  submissions.forEach(s => {
    console.log(`- ${s.date}: Score ${s.finalScore}/${s.maxScore} (${s.assessmentTitle})`);
    sum += s.finalScore || 0;
  });
  console.log(`Total submission points: ${sum}`);

  const { data: attendance } = await supabase.from('attendance').select('*').or(`studentId.eq.${amira.id},studentId.eq.H079`);
  console.log(`Attendance for Amira (${attendance?.length}):`);
  let attSum = 0;
  if(attendance) {
      attendance.forEach(a => {
        console.log(`- ${a.date || a.timestamp}: Points ${a.points}`);
        attSum += a.points || 0;
      });
  }
  console.log(`Total attendance points: ${attSum}`);
  
  console.log(`GRAND TOTAL SHOULD BE: ${sum + attSum}`);
}

checkAmira().catch(console.error);
