import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: assessments, error: asError } = await supabase.from('assessments').select('*');
  if (asError) throw asError;

  const m6 = assessments.find(a => a.id === 'ns6g9pqngrfbaa4pqmija6'); // متي ٦
  const m7 = assessments.find(a => a.id === 'l0zt0o5dlega9hkwzwkqx'); // متي 7

  const getMaxScore = (a) => {
      let score = 0;
      if (a.questions) {
          if (Array.isArray(a.questions)) {
              score = a.questions.reduce((acc, q) => acc + (q.points || 2), 0);
          } else {
              score += (a.questions.easy || []).reduce((acc, q) => acc + (q.points || 2), 0);
              score += (a.questions.medium || []).reduce((acc, q) => acc + (q.points || 2), 0);
              score += (a.questions.hard || []).reduce((acc, q) => acc + (q.points || 2), 0);
          }
      }
      return score;
  };

  const m6Score = getMaxScore(m6);
  const m7Score = getMaxScore(m7);

  console.log(`Max score for متي ٦: ${m6Score}`);
  console.log(`Max score for متي 7: ${m7Score}`);

  // Find active users
  const { data: submissions, error: subError } = await supabase.from('submissions').select('participantId, participantName, participantPhoneOrId');
  if (subError) throw subError;

  const activeUsersMap = new Map();
  submissions.forEach(sub => {
     if (sub.participantId && !activeUsersMap.has(sub.participantId)) {
         activeUsersMap.set(sub.participantId, {
             id: sub.participantId,
             name: sub.participantName,
             phoneOrId: sub.participantPhoneOrId
         });
     }
  });

  const activeStudents = Array.from(activeUsersMap.values());
  console.log(`Found ${activeStudents.length} active students.`);

  // Prepare insertions
  const newSubmissions = [];
  const dateStr = new Date().toISOString();

  for (const student of activeStudents) {
      // Check if student already has a submission for m6
      const { data: existingM6 } = await supabase.from('submissions').select('id').eq('participantId', student.id).eq('assessmentId', m6.id);
      if (!existingM6 || existingM6.length === 0) {
          newSubmissions.push({
              id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
              participantId: student.id,
              assessmentId: m6.id,
              participantName: student.name,
              participantPhoneOrId: student.phoneOrId,
              assessmentTitle: m6.title,
              assessmentVersion: m6.version || 1,
              date: dateStr,
              readingTimeSeconds: 0,
              answeringTimeSeconds: 0,
              answers: [],
              baseScore: m6Score,
              maxScore: m6Score,
              bonusPoints: 0,
              finalScore: m6Score,
              streakCount: 0,
              status: "completed",
              submittedManually: false,
              unansweredCount: 0
          });
      }

      // Check if student already has a submission for m7
      const { data: existingM7 } = await supabase.from('submissions').select('id').eq('participantId', student.id).eq('assessmentId', m7.id);
      if (!existingM7 || existingM7.length === 0) {
          newSubmissions.push({
              id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
              participantId: student.id,
              assessmentId: m7.id,
              participantName: student.name,
              participantPhoneOrId: student.phoneOrId,
              assessmentTitle: m7.title,
              assessmentVersion: m7.version || 1,
              date: dateStr,
              readingTimeSeconds: 0,
              answeringTimeSeconds: 0,
              answers: [],
              baseScore: m7Score,
              maxScore: m7Score,
              bonusPoints: 0,
              finalScore: m7Score,
              streakCount: 0,
              status: "completed",
              submittedManually: false,
              unansweredCount: 0
          });
      }
  }

  console.log(`Prepared ${newSubmissions.length} new submissions to insert.`);
  
  if (newSubmissions.length > 0) {
      const chunkSize = 50;
      for (let i = 0; i < newSubmissions.length; i += chunkSize) {
          const chunk = newSubmissions.slice(i, i + chunkSize);
          const { error: insErr } = await supabase.from('submissions').insert(chunk);
          if (insErr) {
              console.error('Insert error:', insErr);
          } else {
              console.log(`Inserted chunk ${i / chunkSize + 1}`);
          }
      }
  }
  
  console.log('Done!');
  process.exit(0);
}
run().catch(console.error);
