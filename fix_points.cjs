const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://nssuihqftjpojeakupfj.supabase.co', 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS');

(async () => {
  const { data: users, error: e1 } = await s.from('users').select('id, fullName, totalPoints, cumulativePoints').eq('role', 'student');
  const { data: subs, error: e2 } = await s.from('submissions').select('participantId, finalScore, baseScore, maxScore');
  const { data: atts, error: e3 } = await s.from('attendance').select('studentId, points');
  const { data: purs, error: e4 } = await s.from('purchases').select('userId, pricePaid, price, totalPrice');
  const { data: logs, error: e5 } = await s.from('point_logs').select('userId, type, amount');

  if (e1 || e2 || e3) {
    console.log('Errors:', e1, e2, e3, e4, e5);
    return;
  }

  const safeSubs = subs || [];
  const safeAtts = atts || [];
  const safePurs = purs || [];
  const safeLogs = logs || [];

  let fixed = 0;
  let total = users.length;

  for (const u of users) {
    const examPts = safeSubs
      .filter(s2 => s2.participantId === u.id)
      .reduce((a, s2) => a + (s2.finalScore || s2.baseScore || 0), 0);
    const attPts = safeAtts
      .filter(a2 => a2.studentId === u.id)
      .reduce((a, c) => a + (c.points || 0), 0);
    const manPts = safeLogs
      .filter(l => l.userId === u.id)
      .reduce((a, c) => c.type === 'add' ? a + (c.amount || 0) : a - (c.amount || 0), 0);
    const purPts = safePurs
      .filter(p => p.userId === u.id)
      .reduce((a, c) => a + (c.pricePaid ?? c.price ?? c.totalPrice ?? 0), 0);

    const correctTotal = Math.max(0, examPts + attPts + manPts - purPts);
    const correctCumul = Math.max(0, examPts + attPts + manPts);

    if (u.totalPoints !== correctTotal || u.cumulativePoints !== correctCumul) {
      console.log(u.fullName, '| was:', u.totalPoints, '/', u.cumulativePoints, '| correct:', correctTotal, '/', correctCumul);
      const res = await s.from('users').update({
        totalPoints: correctTotal,
        cumulativePoints: correctCumul
      }).eq('id', u.id);
      if (!res.error) {
        fixed++;
      } else {
        console.log('  ERROR:', res.error.message);
      }
    }
  }

  console.log('\n=== DONE ===');
  console.log('Fixed', fixed, 'out of', total, 'students');
})();
