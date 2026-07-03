const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Find the submission for "Kirolos Samy" for "مرقس 1"
  const { data: subs, error } = await supabase
    .from('submissions')
    .select('*')
    .ilike('participantName', '%Kirolos%')
    .ilike('assessmentTitle', '%مرقس 1%');
    
  if (error) {
    console.error(error);
    return;
  }

  console.log(`Found ${subs.length} submissions for Kirolos in Mark 1.`);
  for (let sub of subs) {
    console.log(`ID: ${sub.id}, Title: ${sub.assessmentTitle}, Score: ${sub.finalScore}`);
    
    // Update score to 10
    console.log(`Updating ${sub.id} score to 10...`);
    await supabase.from('submissions').update({
        finalScore: 10,
        baseScore: 10,
        score: 10
    }).eq('id', sub.id);
    
    // Sync points for Kirolos Samy
    // We can just call the logic from sync_points.cjs specifically for his user id
    const userId = sub.participantId;
    
    console.log(`Recalculating points for user ${userId}...`);
    let total = 0;
    let cumulative = 0;
    
    const { data: userSubs } = await supabase.from('submissions').select('finalScore').eq('participantId', userId);
    const { data: att } = await supabase.from('attendance').select('points').eq('studentId', userId);
    const { data: pts } = await supabase.from('point_logs').select('amount, type').eq('userId', userId);
    const { data: pur } = await supabase.from('purchases').select('pricePaid, price, totalPrice').eq('userId', userId);

    (userSubs || []).forEach(s => {
      total += (s.finalScore || 0);
      cumulative += (s.finalScore || 0);
    });
    
    (att || []).forEach(a => {
      total += (a.points || 0);
      cumulative += (a.points || 0);
    });
    
    (pts || []).forEach(p => {
      if (p.type === 'add') {
        total += (p.amount || 0);
        cumulative += (p.amount || 0);
      } else {
        total -= (p.amount || 0);
        cumulative -= (p.amount || 0);
      }
    });
    
    (pur || []).forEach(p => {
      total -= (p.pricePaid ?? p.price ?? p.totalPrice ?? 0);
    });

    total = Math.max(0, total);
    cumulative = Math.max(0, cumulative);
    
    console.log(`Setting new points: total=${total}, cumulative=${cumulative}`);
    await supabase.from('users').update({
      totalPoints: total,
      cumulativePoints: cumulative
    }).eq('id', userId);
    
    console.log(`Successfully updated Kirolos Samy!`);
  }
}

run();
