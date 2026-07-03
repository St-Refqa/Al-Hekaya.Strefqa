import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: submissions, error: subError } = await supabase.from('submissions').select('*');
  if (subError) throw subError;

  let repairedCount = 0;

  for (const sub of submissions) {
    if (!sub.answers || !Array.isArray(sub.answers)) continue;

    const uniqueAnswersMap = new Map();
    for (const ans of sub.answers) {
      if (ans && ans.questionId) {
        uniqueAnswersMap.set(ans.questionId, ans);
      }
    }

    if (uniqueAnswersMap.size < sub.answers.length) {
      const newAnswers = Array.from(uniqueAnswersMap.values());
      const newBaseScore = newAnswers.reduce((acc, ans) => acc + (ans.score || 0), 0);
      const newFinalScore = Math.min(newBaseScore, sub.maxScore || newBaseScore);
      
      const pointDifference = (sub.baseScore || 0) - newBaseScore;
      
      console.log(`Repairing submission ${sub.id} for ${sub.participantName}: reduced answers from ${sub.answers.length} to ${newAnswers.length}. Score drops from ${sub.baseScore} to ${newBaseScore}. Difference: ${pointDifference}`);
      
      // Update submission
      await supabase.from('submissions').update({
        answers: newAnswers,
        baseScore: newBaseScore,
        finalScore: newFinalScore,
        unansweredCount: (sub.unansweredCount || 0) + (sub.answers.length - newAnswers.length)
      }).eq('id', sub.id);
      
      // Update user
      if (pointDifference > 0 && sub.participantId) {
        const { data: userSnap } = await supabase.from('users').select('*').eq('id', sub.participantId).single();
        if (userSnap) {
          const newTotalPoints = (userSnap.totalPoints || 0) - pointDifference;
          const newCumulative = (userSnap.cumulativePoints || userSnap.totalPoints || 0) - pointDifference;
          // Re-evaluate average score: Just a slight recalculation, but it's hard to be exact without fetching ALL their submissions.
          // Let's just fetch all their submissions to recalculate averageScore exactly
          const { data: allUserSubs } = await supabase.from('submissions').select('finalScore, maxScore').eq('participantId', sub.participantId);
          let newAvg = userSnap.averageScore;
          if (allUserSubs && allUserSubs.length > 0) {
              const totalPercentage = allUserSubs.reduce((acc, s) => {
                  if (s.id === sub.id) {
                      return acc + Math.round((newFinalScore / (s.maxScore || 1)) * 100);
                  }
                  return acc + Math.round(((s.finalScore || 0) / (s.maxScore || 1)) * 100);
              }, 0);
              newAvg = Math.round(totalPercentage / allUserSubs.length);
          }
          
          await supabase.from('users').update({
            totalPoints: Math.max(0, newTotalPoints),
            cumulativePoints: Math.max(0, newCumulative),
            averageScore: newAvg
          }).eq('id', userSnap.id);
          console.log(`Updated user ${userSnap.fullName}: removed ${pointDifference} points.`);
        }
      }
      
      repairedCount++;
    }
  }

  console.log(`Done! Repaired ${repairedCount} submissions.`);
  process.exit(0);
}
run().catch(console.error);
