import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: assessments } = await supabase.from('assessments').select('id, title');
  const examIds = assessments.map(a => a.id);
  
  const { data: submissions } = await supabase.from('submissions').select('participantId, participantName, assessmentId');
  
  const studentMap = new Map();
  
  submissions.forEach(sub => {
    if (!sub.participantId) return;
    if (!studentMap.has(sub.participantId)) {
      studentMap.set(sub.participantId, {
        id: sub.participantId,
        name: sub.participantName,
        examsSolved: new Set()
      });
    }
    studentMap.get(sub.participantId).examsSolved.add(sub.assessmentId);
  });
  
  const totalExams = examIds.length;
  
  let studentsWhoSolvedAll = [];
  
  studentMap.forEach(student => {
    // Check if they solved all active exams
    if (student.examsSolved.size >= totalExams - 2) { // Allow missing 2 maybe? Let's strictly count
        studentsWhoSolvedAll.push({
            name: student.name,
            count: student.examsSolved.size
        });
    }
  });
  
  studentsWhoSolvedAll.sort((a,b) => b.count - a.count);
  console.log(`Total active students (solved at least 1): ${studentMap.size}`);
  console.log(`Total exams available: ${totalExams}`);
  console.log(`Students who solved most/all days:`);
  studentsWhoSolvedAll.slice(0, 30).forEach(s => {
      console.log(`- ${s.name} (${s.count} exams)`);
  });
  
  process.exit(0);
}
run().catch(console.error);
