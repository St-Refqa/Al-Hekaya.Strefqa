const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nssuihqftjpojeakupfj.supabase.co',
  'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS'
);

async function runFix() {
  console.log("Recalculating August 1st+ points for Round 2...");

  const { data: users, error: usersErr } = await supabase.from('users').select('*').eq('role', 'student');
  if (usersErr) throw usersErr;
  
  const { data: submissions, error: subErr } = await supabase
    .from('submissions')
    .select('*');
  if (subErr) throw subErr;

  const { data: attendance, error: attErr } = await supabase
    .from('attendance')
    .select('*');
  if (attErr) throw attErr;

  const augustPoints = {};
  const preAugustPoints = {};

  submissions.forEach(sub => {
    const pId = sub.participantId || sub.participantPhoneOrId;
    if (!pId) return;
    const isAug = new Date(sub.date) >= new Date('2026-08-01T00:00:00.000Z');
    
    if (isAug) {
        if (!augustPoints[pId]) augustPoints[pId] = 0;
        augustPoints[pId] += (sub.finalScore || 0);
    } else {
        if (!preAugustPoints[pId]) preAugustPoints[pId] = 0;
        preAugustPoints[pId] += (sub.finalScore || 0);
    }
  });

  attendance.forEach(log => {
    const pId = log.studentId;
    if (!pId) return;
    const isAug = new Date(log.timestamp) >= new Date('2026-08-01T00:00:00.000Z') || (log.date && log.date >= '2026-08-01');
    
    if (isAug) {
        if (!augustPoints[pId]) augustPoints[pId] = 0;
        augustPoints[pId] += (log.points || 0);
    } else {
        if (!preAugustPoints[pId]) preAugustPoints[pId] = 0;
        preAugustPoints[pId] += (log.points || 0);
    }
  });

  for (const user of users) {
    const r2Points = (augustPoints[user.id] || augustPoints[user.code]) || 0;
    const r1Points = (preAugustPoints[user.id] || preAugustPoints[user.code]) || 0;

    let settings = user.sidebarSettings || {};
    settings.round1Points = r1Points;
    
    // Safety check, ensure storePoints exists
    if (settings.storePoints === undefined) {
      settings.storePoints = user.totalPoints || (r1Points + r2Points);
    }

    const updates = {
      sidebarSettings: settings,
      totalPoints: r2Points,
      cumulativePoints: r1Points + r2Points 
    };

    const { error: upErr } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id);

    if (upErr) {
      console.error(`Failed to update ${user.id}:`, upErr);
    }
  }

  console.log("Recalculation complete!");
}

runFix().catch(console.error);
