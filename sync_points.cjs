const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: usersData, error: errU } = await supabase.from('users').select('id, totalPoints, cumulativePoints');
  const { data: subsData, error: errS } = await supabase.from('submissions').select('participantId, finalScore');
  const { data: attData, error: errA } = await supabase.from('attendance').select('studentId, points');
  const { data: ptsData, error: errP } = await supabase.from('point_logs').select('userId, amount, type');
  const { data: purData, error: errPur } = await supabase.from('purchases').select('userId, pricePaid, price, totalPrice');

  const users = usersData || [];
  const subs = subsData || [];
  const att = attData || [];
  const pts = ptsData || [];
  const pur = purData || [];

  let updatedCount = 0;

  for (const user of users) {
    let total = 0;
    let cumulative = 0;
    
    // Submissions
    subs.filter(s => s.participantId === user.id).forEach(s => {
      total += (s.finalScore || 0);
      cumulative += (s.finalScore || 0);
    });
    
    // Attendance
    att.filter(a => a.studentId === user.id).forEach(a => {
      total += (a.points || 0);
      cumulative += (a.points || 0);
    });
    
    // Manual Points
    pts.filter(p => p.userId === user.id).forEach(p => {
      if (p.type === 'add') {
        total += (p.amount || 0);
        cumulative += (p.amount || 0);
      } else {
        total -= (p.amount || 0);
        cumulative -= (p.amount || 0);
      }
    });
    
    // Purchases
    pur.filter(p => p.userId === user.id).forEach(p => {
      total -= (p.pricePaid ?? p.price ?? p.totalPrice ?? 0);
    });

    total = Math.max(0, total);
    cumulative = Math.max(0, cumulative);

    if (user.totalPoints !== total || user.cumulativePoints !== cumulative) {
      console.log(`User ${user.id} has total ${user.totalPoints} (should be ${total}) and cumulative ${user.cumulativePoints} (should be ${cumulative}).`);
      await supabase.from('users').update({
        totalPoints: total,
        cumulativePoints: cumulative
      }).eq('id', user.id);
      updatedCount++;
    }
  }

  console.log(`Done recalculating! Updated ${updatedCount} users.`);
}

run();
