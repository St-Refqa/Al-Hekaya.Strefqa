const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('point_logs').select('*');
  const duplicates = {};
  data.forEach(log => {
    if (log.reason && log.reason.includes('متي')) {
      const key = log.userId;
      if (!duplicates[key]) duplicates[key] = [];
      duplicates[key].push(log);
    }
  });

  const dupes = Object.values(duplicates).filter(arr => arr.length > 1);
  console.log('Duplicate manual points found:', dupes.length);

  let toDelete = [];
  dupes.forEach(arr => {
    console.log('User ID:', arr[0].userId, 'Count:', arr.length);
    arr.forEach(l => console.log('  ', l.id, l.reason, l.amount));
    // sort by created date and delete all but the first
    arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    arr.slice(1).forEach(l => toDelete.push(l));
  });

  console.log(`Need to delete ${toDelete.length} logs`);

  for (let log of toDelete) {
    console.log(`Deleting ${log.id}...`);
    await supabase.from('point_logs').delete().eq('id', log.id);
    
    // Also we must deduct the points from the user!
    const { data: userData } = await supabase.from('users').select('totalPoints, cumulativePoints').eq('uid', log.userId).single();
    if (userData) {
      await supabase.from('users').update({
        totalPoints: userData.totalPoints - log.amount,
        cumulativePoints: userData.cumulativePoints - log.amount
      }).eq('uid', log.userId);
      console.log(`Updated user ${log.userId} points.`);
    }
  }
}
run();
