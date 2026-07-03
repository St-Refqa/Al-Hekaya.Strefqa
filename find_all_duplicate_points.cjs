const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('point_logs').select('*');
  const duplicates = {};
  data.forEach(log => {
    // Group by userId, amount, and roughly the reason
    const key = log.userId + '_' + log.amount + '_' + log.reason;
    if (!duplicates[key]) duplicates[key] = [];
    duplicates[key].push(log);
  });

  const dupes = Object.values(duplicates).filter(arr => arr.length > 1);
  console.log('Duplicate manual points found:', dupes.length);

  let toDelete = [];
  dupes.forEach(arr => {
    console.log('User ID:', arr[0].userId, 'Amount:', arr[0].amount, 'Reason:', arr[0].reason, 'Count:', arr.length);
    arr.forEach(l => console.log('  ', l.id, l.createdAt));
    arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    arr.slice(1).forEach(l => toDelete.push(l));
  });

  console.log(`Need to delete ${toDelete.length} logs`);

  // ONLY DELETE IF THE REASON IS "متي 6 و 7" or similar
  const relevantToDelete = toDelete.filter(l => l.reason.includes('متي') || l.reason.includes('متى') || l.reason.includes('6') || l.reason.includes('7') || l.reason.includes('اختبار'));
  
  console.log(`Relevant to delete: ${relevantToDelete.length}`);
  
  for (let log of relevantToDelete) {
    console.log(`Deleting ${log.id} (${log.reason})...`);
    await supabase.from('point_logs').delete().eq('id', log.id);
    
    // Also deduct points
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
