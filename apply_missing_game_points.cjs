const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: users, error: ue } = await supabase.from('users').select('id, totalPoints, cumulativePoints, sidebarSettings');
  const { data: games, error: ge } = await supabase.from('game_scores').select('id, totalScore');

  if (ue) console.error("Users error:", ue);
  if (ge) console.error("Games error:", ge);

  let updated = 0;
  let totalPointsGiven = 0;
  for (const game of (games || [])) {
    const total = game.totalScore || 0;
    const user = users.find(u => u.id === game.id);
    if (!user) continue;

    const synced = (user.sidebarSettings && user.sidebarSettings.syncedGameScore) || 0;
    const diff = total - synced;

    if (diff > 0) {
      let currentStorePoints = user.totalPoints || 0;
      if (user.sidebarSettings && user.sidebarSettings.storePoints !== undefined) {
         currentStorePoints = user.sidebarSettings.storePoints;
      }

      const newTotal = (user.totalPoints || 0) + diff;
      const newCumulative = (user.cumulativePoints || 0) + diff;
      const newStore = currentStorePoints + diff;

      let newSettings = user.sidebarSettings || {};
      newSettings.storePoints = newStore;
      newSettings.syncedGameScore = total;

      await supabase.from('users').update({
         totalPoints: newTotal,
         cumulativePoints: newCumulative,
         sidebarSettings: newSettings
      }).eq('id', user.id);

      console.log(`Added ${diff} points to ${user.id}`);
      totalPointsGiven += diff;
      updated++;
    }
  }
  console.log(`Done! Updated ${updated} users with a total of ${totalPointsGiven} points.`);
}
run();
