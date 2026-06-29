import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const m6_id = 'ns6g9pqngrfbaa4pqmija6'; // متي ٦
  const m7_id = 'l0zt0o5dlega9hkwzwkqx'; // متي 7

  const { data: assessments } = await supabase.from('assessments').select('*');
  const m6 = assessments.find(a => a.id === m6_id);
  const m7 = assessments.find(a => a.id === m7_id);

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

  const m6Score = getMaxScore(m6); // Should be max points
  const m7Score = getMaxScore(m7);

  console.log(`Max score for متي ٦: ${m6Score}`);
  console.log(`Max score for متي 7: ${m7Score}`);

  // Fetch ALL users (students)
  const { data: users, error: usersErr } = await supabase.from('users').select('*');
  if (usersErr) throw usersErr;
  
  // Filter only those who have at least one submission
  const { data: allSubmissions } = await supabase.from('submissions').select('participantId');
  const activeUserIds = new Set(allSubmissions.filter(s => s.participantId).map(s => s.participantId));
  
  const activeUsers = users.filter(u => activeUserIds.has(u.id));
  console.log(`Total users in DB: ${users.length}, Active Users: ${activeUsers.length}`);

  let updatedUsersCount = 0;
  let updatedSubmissionsCount = 0;
  let newSubmissionsCount = 0;

  for (const user of activeUsers) {
      let pointsToAdd = 0;
      let examsToAdd = 0;

      // Handle M6
      const { data: m6Subs } = await supabase.from('submissions').select('*').eq('participantId', user.id).eq('assessmentId', m6_id);
      if (!m6Subs || m6Subs.length === 0) {
          // Add new submission for M6
          const newSub = {
              id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
              participantId: user.id,
              assessmentId: m6_id,
              participantName: user.fullName || "طالب",
              participantPhoneOrId: user.code || "",
              assessmentTitle: m6.title,
              assessmentVersion: m6.version || 1,
              date: new Date().toISOString(),
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
          };
          await supabase.from('submissions').insert(newSub);
          pointsToAdd += m6Score;
          examsToAdd += 1;
          newSubmissionsCount++;
      } else {
          // Check if they didn't get full marks
          const existing = m6Subs[0];
          if (existing.finalScore < m6Score || !existing.finalScore) {
              const diff = m6Score - (existing.finalScore || 0);
              pointsToAdd += diff;
              await supabase.from('submissions').update({ finalScore: m6Score, baseScore: m6Score, maxScore: m6Score }).eq('id', existing.id);
              updatedSubmissionsCount++;
          }
      }

      // Handle M7
      const { data: m7Subs } = await supabase.from('submissions').select('*').eq('participantId', user.id).eq('assessmentId', m7_id);
      if (!m7Subs || m7Subs.length === 0) {
          // Add new submission for M7
          const newSub = {
              id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
              participantId: user.id,
              assessmentId: m7_id,
              participantName: user.fullName || "طالب",
              participantPhoneOrId: user.code || "",
              assessmentTitle: m7.title,
              assessmentVersion: m7.version || 1,
              date: new Date().toISOString(),
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
          };
          await supabase.from('submissions').insert(newSub);
          pointsToAdd += m7Score;
          examsToAdd += 1;
          newSubmissionsCount++;
      } else {
          // Check if they didn't get full marks
          const existing = m7Subs[0];
          if (existing.finalScore < m7Score || !existing.finalScore) {
              const diff = m7Score - (existing.finalScore || 0);
              pointsToAdd += diff;
              await supabase.from('submissions').update({ finalScore: m7Score, baseScore: m7Score, maxScore: m7Score }).eq('id', existing.id);
              updatedSubmissionsCount++;
          }
      }

      if (pointsToAdd > 0 || examsToAdd > 0) {
          // Update user
          const newTotalExams = (user.totalExams || 0) + examsToAdd;
          const newTotalPoints = Number(user.totalPoints || 0) + pointsToAdd;
          const newCumulative = Number(user.cumulativePoints || user.totalPoints || 0) + pointsToAdd;
          
          // Recalculate average (simplified: just max score ratio if assuming all exams are roughly same max points, or just raw total points divided by something. But in our app averageScore is a percentage 0-100)
          // To be safe, if we just gave them full marks, average goes UP.
          // In PublicAssessment we did:
          // newAverageScore = uData.averageScore ? (uData.averageScore * (newTotalExams - examsToAdd) + (100 * examsToAdd)) / newTotalExams : 100
          
          let newAvg = 100;
          if (user.averageScore) {
              const oldSum = user.averageScore * (user.totalExams || 1);
              // each full mark adds 100% to the sum
              newAvg = (oldSum + (100 * examsToAdd)) / newTotalExams;
          }

          await supabase.from('users').update({
              totalExams: newTotalExams,
              totalPoints: newTotalPoints,
              cumulativePoints: newCumulative,
              averageScore: newAvg
          }).eq('id', user.id);
          
          updatedUsersCount++;
      }
  }

  console.log(`Done!`);
  console.log(`New submissions created: ${newSubmissionsCount}`);
  console.log(`Existing submissions upgraded: ${updatedSubmissionsCount}`);
  console.log(`Users updated: ${updatedUsersCount}`);
  
  process.exit(0);
}
run().catch(console.error);
