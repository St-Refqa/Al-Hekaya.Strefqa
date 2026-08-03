const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nssuihqftjpojeakupfj.supabase.co',
  'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS'
);

async function runFix() {
  console.log("Recalculating correct points by removing duplicate submissions...");

  const { data: users, error: usersErr } = await supabase.from('users').select('*').eq('role', 'student');
  if (usersErr) throw usersErr;
  
  // We need to fetch ALL submissions, Supabase limit is 1000 by default so we might need pagination
  let allSubmissions = [];
  let hasMore = true;
  let offset = 0;
  const limit = 1000;
  
  while (hasMore) {
    const { data: submissions, error: subErr } = await supabase
      .from('submissions')
      .select('*')
      .range(offset, offset + limit - 1);
    
    if (subErr) throw subErr;
    if (submissions.length > 0) {
      allSubmissions.push(...submissions);
      offset += limit;
    } else {
      hasMore = false;
    }
  }
  console.log(`Fetched ${allSubmissions.length} submissions.`);

  // Group by (participantId) -> (assessmentId) -> Max Score
  const uniqueSubmissions = {};

  allSubmissions.forEach(sub => {
    const pId = sub.participantId || sub.participantPhoneOrId;
    if (!pId) return;
    
    // Some old submissions might not have an assessmentId, fallback to assessmentTitle
    const aId = sub.assessmentId || sub.assessmentTitle; 
    
    if (!uniqueSubmissions[pId]) {
      uniqueSubmissions[pId] = {};
    }
    
    const existing = uniqueSubmissions[pId][aId];
    if (!existing || (sub.finalScore > existing.finalScore)) {
      uniqueSubmissions[pId][aId] = sub; // Keep the whole submission object for date checking
    }
  });

  const { data: attendance, error: attErr } = await supabase
    .from('attendance')
    .select('*');
  if (attErr) throw attErr;

  const augustPoints = {};
  const preAugustPoints = {};

  // Now calculate sum from unique submissions
  Object.keys(uniqueSubmissions).forEach(pId => {
    Object.values(uniqueSubmissions[pId]).forEach(sub => {
      const isAug = new Date(sub.date) >= new Date('2026-08-01T00:00:00.000Z');
      
      if (isAug) {
          if (!augustPoints[pId]) augustPoints[pId] = 0;
          augustPoints[pId] += (sub.finalScore || 0);
      } else {
          if (!preAugustPoints[pId]) preAugustPoints[pId] = 0;
          preAugustPoints[pId] += (sub.finalScore || 0);
      }
    });
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

  console.log("Updating users...");
  for (const user of users) {
    const r2Points = (augustPoints[user.id] || augustPoints[user.code]) || 0;
    const r1Points = (preAugustPoints[user.id] || preAugustPoints[user.code]) || 0;

    let settings = user.sidebarSettings || {};
    settings.round1Points = r1Points;
    
    // Store points = Round 1 + Round 2
    settings.storePoints = r1Points + r2Points;

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
