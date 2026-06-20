const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

const meetings = [
  {
    id: generateId(),
    title: "العذراء القناطر اعدادي",
    description: "الموضوعات : اي حاجه عن الرسل ( لو متاح )",
    dateTime: "2026-06-19T19:00:00",
    reminderSent12h: false,
    createdAt: new Date().toISOString(),
    createdBy: "مسؤول الخدمة"
  },
  {
    id: generateId(),
    title: "العذراء و البابا كيرلس شبرا شباب",
    description: "الموضوعات : بانوراما العهد القديم ، الكهانوت الهاروني",
    dateTime: "2026-06-25T19:00:00",
    reminderSent12h: false,
    createdAt: new Date().toISOString(),
    createdBy: "مسؤول الخدمة"
  },
  {
    id: generateId(),
    title: "الملاك اكتوبر خارجين",
    description: "الموضوعات. : بولس الرسول ، الفقره التانيه اللي احنا عوزينو",
    dateTime: "2026-07-10T19:00:00",
    reminderSent12h: false,
    createdAt: new Date().toISOString(),
    createdBy: "مسؤول الخدمة"
  }
];

async function run() {
  console.log("Inserting preparation meetings...");
  const { error } = await supabase.from('preparationMeetings').insert(meetings);
  if (error) {
    console.error("Failed to insert:", error);
    process.exit(1);
  }
  console.log("Successfully inserted 3 preparation meetings.");
  process.exit(0);
}

run();
