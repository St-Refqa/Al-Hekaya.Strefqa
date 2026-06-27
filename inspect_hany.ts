import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'e:/St Refqa/AL Hkaya/WebSite/New/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHany() {
  console.log('Searching for users named Hany or هاني...');
  const { data: users, error } = await supabase
    .from('users')
    .select('*');

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  const hanyUsers = users.filter(u => 
    u.fullName?.includes('هاني') || 
    u.fullName?.toLowerCase().includes('hany') ||
    u.fullName?.toLowerCase().includes('hani')
  );

  if (hanyUsers.length === 0) {
    console.log('No users found matching Hany/هاني.');
    return;
  }

  console.log(`Found ${hanyUsers.length} user(s):`);
  for (const hany of hanyUsers) {
    console.log(`\nUser Profile:`);
    console.log(`- ID: ${hany.id}`);
    console.log(`  Name: ${hany.fullName}`);
    console.log(`  Code: ${hany.code}`);
    console.log(`  totalPoints: ${hany.totalPoints}`);
    console.log(`  cumulativePoints: ${hany.cumulativePoints}`);
    console.log(`  totalExams: ${hany.totalExams}`);

    // Fetch his submissions
    const { data: submissions, error: sError } = await supabase
      .from('submissions')
      .select('*');
    
    if (!sError && submissions) {
      const hanySubs = submissions.filter(s => 
        s.participantId === hany.id || 
        s.participantName === hany.fullName || 
        (hany.code && s.participantPhoneOrId?.toUpperCase() === hany.code.toUpperCase())
      );
      
      console.log(`Submissions (${hanySubs.length}):`);
      for (const s of hanySubs) {
        console.log(`  - Exam: "${s.assessmentTitle}" | Date: ${s.date} | Score: ${s.finalScore} | participantId: ${s.participantId} | participantName: ${s.participantName}`);
      }
    }
  }
}

checkHany().catch(console.error);
