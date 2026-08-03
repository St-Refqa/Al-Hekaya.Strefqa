const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nssuihqftjpojeakupfj.supabase.co',
  'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS'
);

async function runMigration() {
  console.log("Starting Round 2 Migration (using sidebarSettings)...");

  const { data: users, error: usersErr } = await supabase.from('users').select('*');
  if (usersErr) throw usersErr;
  
  const { data: submissions, error: subErr } = await supabase
    .from('submissions')
    .select('*')
    .gte('date', '2026-08-01T00:00:00.000Z');
  if (subErr) throw subErr;

  const { data: attendance, error: attErr } = await supabase
    .from('attendance')
    .select('*')
    .gte('timestamp', '2026-08-01T00:00:00.000Z');
  if (attErr) throw attErr;

  const newPointsMap = {}; 

  submissions.forEach(sub => {
    const pId = sub.participantId || sub.participantPhoneOrId;
    if (!newPointsMap[pId]) newPointsMap[pId] = 0;
    newPointsMap[pId] += (sub.finalScore || 0);
  });

  attendance.forEach(log => {
    const pId = log.studentId;
    if (!newPointsMap[pId]) newPointsMap[pId] = 0;
    newPointsMap[pId] += (log.points || 0);
  });

  for (const user of users) {
    if (user.role !== 'student') continue;

    const currentTotal = user.totalPoints || 0; 
    const currentCumulative = user.cumulativePoints || user.totalPoints || 0; 

    const round2NewPoints = newPointsMap[user.uid] || newPointsMap[user.code] || 0;
    
    let r1 = currentCumulative - round2NewPoints;
    if (r1 < 0) r1 = 0;

    let settings = user.sidebarSettings || {};
    settings.storePoints = currentTotal;
    settings.round1Points = r1;

    const updates = {
      sidebarSettings: settings,
      totalPoints: round2NewPoints,
      cumulativePoints: round2NewPoints 
    };

    const { error: upErr } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id);

    if (upErr) {
      console.error(`Failed to update ${user.id}:`, upErr);
    } else {
        console.log(`Updated user ${user.fullName}`);
    }
  }

  console.log("Migration complete!");
}

runMigration().catch(console.error);
