import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching all submissions from database...");
  const { data: submissions, error } = await supabase.from('submissions').select('*');
  if (error) {
    console.error("Fetch error:", error);
    process.exit(1);
  }
  
  console.log(`Found ${submissions.length} submissions. Inspecting and repairing...`);
  
  let repairedCount = 0;
  
  for (const sub of submissions) {
    const answers = sub.answers || [];
    if (answers.length > 0) {
      const calculatedMax = answers.reduce((acc, curr) => acc + (curr.maxPoints || 0), 0);
      const calculatedBase = answers.reduce((acc, curr) => acc + (curr.score || 0), 0);
      
      const needsMaxRepair = sub.maxScore === 0 && calculatedMax > 0;
      const needsBaseRepair = sub.baseScore === 0 && calculatedBase > 0;
      
      if (needsMaxRepair || needsBaseRepair) {
        console.log(`Sub #${sub.id} (${sub.participantName} - ${sub.assessmentTitle}):`);
        console.log(`  Current Max: ${sub.maxScore} | Calculated Max: ${calculatedMax}`);
        console.log(`  Current Base: ${sub.baseScore} | Calculated Base: ${calculatedBase}`);
        
        const updates = {
          maxScore: calculatedMax,
          baseScore: calculatedBase
        };
        
        // If finalScore was 0 but should have been calculatedBase (and wasn't manually adjusted)
        if (sub.finalScore === 0 && !sub.isManuallyAdjusted && calculatedBase > 0) {
          updates.finalScore = calculatedBase;
          console.log(`  Updating finalScore to: ${calculatedBase}`);
        }
        
        const { error: updateError } = await supabase.from('submissions').update(updates).eq('id', sub.id);
        if (updateError) {
          console.error(`  Error updating Sub #${sub.id}:`, updateError);
        } else {
          console.log(`  Successfully repaired Sub #${sub.id}`);
          repairedCount++;
        }
      }
    }
  }
  
  console.log(`Repaired ${repairedCount} submissions.`);
  process.exit(0);
}

run();
