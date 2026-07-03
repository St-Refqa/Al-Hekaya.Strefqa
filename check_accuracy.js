import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAccuracy() {
  const { data: users } = await supabase.from('users').select('*');
  const { data: submissions } = await supabase.from('submissions').select('*');

  const userStats = {};
  for (const sub of submissions) {
    const pId = sub.participantId || sub.participantPhoneOrId;
    if (!userStats[pId]) userStats[pId] = { maxPossible: 0, subs: 0 };
    userStats[pId].maxPossible += (sub.maxScore || 1);
    userStats[pId].subs += 1;
  }

  for (const user of users) {
    const stats = userStats[user.id];
    if (stats && stats.maxPossible > 0) {
      const totalScore = user.cumulativePoints || user.totalPoints || 0;
      const accuracy = totalScore / stats.maxPossible;
      if (accuracy > 1) {
        console.log(`User ${user.fullName} (${user.id}): TotalScore=${totalScore}, MaxPossible=${stats.maxPossible}, Accuracy=${Math.round(accuracy * 100)}%`);
      }
    }
  }
}

checkAccuracy().catch(console.error);
