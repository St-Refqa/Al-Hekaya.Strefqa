import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

const mapping = {
  "WhatsApp Image 2026-08-07 at 11.17.46 PM.jpeg": { title: "شوكولاتة جالاكسي", description: "شوكولاتة جالاكسي السادة المميزة واللذيذة." },
  "WhatsApp Image 2026-08-07 at 11.17.49 PM.jpeg": { title: "شوكولاتة كادبوري بابلي", description: "شوكولاتة كادبوري بابلي الشهيرة لمتعة التذوق." },
  "WhatsApp Image 2026-08-07 at 11.18.23 PM.jpeg": { title: "لعبة كروت أبطال العهد القديم", description: "لعبة كروت ممتعة وتعليمية عن أبطال العهد القديم." },
  "WhatsApp Image 2026-08-07 at 11.18.58 PM.jpeg": { title: "كيك توينكيز دبل كريم", description: "كيك توينكيز اللذيذ بحشوة دبل كريم." },
  "WhatsApp Image 2026-08-07 at 11.19.50 PM.jpeg": { title: "قلم رصاص سنون 0.9", description: "قلم رصاص ميكانيكي عالي الجودة مقاس 0.9." },
  "WhatsApp Image 2026-08-07 at 11.20.36 PM.jpeg": { title: "أقلام تحديد فسفورية بريما", description: "طقم أقلام تحديد بألوان فسفورية زاهية." },
  "WhatsApp Image 2026-08-07 at 11.21.38 PM.jpeg": { title: "الكتاب المقدس", description: "الكتاب المقدس بعهديه مع غلاف أزرق أنيق." },
  "WhatsApp Image 2026-08-07 at 11.23.19 PM.jpeg": { title: "زجاجة مياه رياضية", description: "زجاجة مياه رياضية ملونة مع علامات تحديد الوقت." },
  "WhatsApp Image 2026-08-07 at 11.23.59 PM.jpeg": { title: "مج زجاج بالشاليموه", description: "مج زجاجي بغطاء وشاليموه مثالي للمشروبات الباردة." },
  "WhatsApp Image 2026-08-07 at 11.24.28 PM.jpeg": { title: "سماعة بلوتوث بشاشة", description: "سماعة بلوتوث لاسلكية مع شاشة ديجيتال لعرض الشحن." },
  "WhatsApp Image 2026-08-07 at 11.25.41 PM.jpeg": { title: "سماعة بلوتوث بيضاء", description: "سماعة بلوتوث بيضاء أنيقة بتصميم مريح." },
  "WhatsApp Image 2026-08-07 at 11.27.31 PM (1).jpeg": { title: "نوت بوك آية عجبتك", description: "نوت بوك روحي مميز لتسجيل الآيات والتأملات." },
  "WhatsApp Image 2026-08-07 at 11.27.31 PM.jpeg": { title: "حامل موبايل راعوث", description: "حامل موبايل خشبي بتصميم راعوث من الحكاية ومافيها." },
  "WhatsApp Image 2026-08-07 at 11.27.32 PM (1).jpeg": { title: "نوت بوك تتبع العادات", description: "نوت بوك مخصص لمساعدتك في بناء وتتبع العادات الإيجابية." },
  "WhatsApp Image 2026-08-07 at 11.27.32 PM (2).jpeg": { title: "نوت باد To Do List", description: "نوت باد لترتيب مهامك اليومية بسهولة." },
  "WhatsApp Image 2026-08-07 at 11.27.32 PM (3).jpeg": { title: "حامل موبايل بطرس", description: "حامل موبايل خشبي بتصميم بطرس الرسول من الحكاية ومافيها." },
  "WhatsApp Image 2026-08-07 at 11.27.32 PM (4).jpeg": { title: "مساطر أبطال الكتاب", description: "مجموعة مساطر وفواصل كتب بتصميمات أبطال الكتاب المقدس." },
  "WhatsApp Image 2026-08-07 at 11.27.32 PM.jpeg": { title: "نوت بوك الحكاية ومافيها", description: "نوت بوك بغلاف شخصيات الحكاية ومافيها." },
  "WhatsApp Image 2026-08-07 at 11.29.14 PM.jpeg": { title: "شنطة وسط سوداء", description: "شنطة وسط كروس سوداء عملية وعصرية." },
  "WhatsApp Image 2026-08-07 at 11.29.33 PM.jpeg": { title: "ماوس وايرلس مضيء", description: "ماوس وايرلس بلمبات إضاءة RGB وتصميم انسيابي." },
  "WhatsApp Image 2026-08-07 at 11.31.12 PM.jpeg": { title: "مجلة ميكي", description: "مجلة ميكي الكوميدية الممتعة ببطولة بطوط والأولاد." },
  "WhatsApp Image 2026-08-07 at 11.36.30 PM.jpeg": { title: "نظارة شمسية مستطيلة", description: "نظارة شمسية سوداء بتصميم مستطيل أنيق." },
  "WhatsApp Image 2026-08-07 at 11.38.19 PM.jpeg": { title: "توت باج سمك", description: "شنطة قماشية (توت باج) بيضاء مرسوم عليها أشكال أسماك." },
  "WhatsApp Image 2026-08-07 at 11.39.16 PM.jpeg": { title: "شنطة بوب إت يونيكورن", description: "شنطة بناتي كروس بوب إت على شكل يونيكورن." },
  "WhatsApp Image 2026-08-07 at 11.39.44 PM.jpeg": { title: "شنطة صيفية شفافة", description: "شنطة شفافة بداخلها جيب قماشي أنيق للرحلات الصيفية." },
  "WhatsApp Image 2026-08-07 at 11.40.27 PM.jpeg": { title: "توت باج زهور", description: "شنطة قماشية سوداء مطبوع عليها أشكال زهور ملونة." },
  "WhatsApp Image 2026-08-07 at 11.41.39 PM.jpeg": { title: "لانش بوكس قطط", description: "لانش بوكس بينك بناتي بتصميم قطط ظريفة." },
  "WhatsApp Image 2026-08-07 at 11.42.41 PM.jpeg": { title: "نظارة شمسية بيضاء", description: "نظارة شمسية مستطيلة بإطار أبيض كلاسيكي وعصري." },
  "WhatsApp Image 2026-08-07 at 11.43.55 PM.jpeg": { title: "كاب زيتي", description: "كاب سادة بلون زيتي شيك وعملي." },
  "WhatsApp Image 2026-08-07 at 11.46.34 PM.jpeg": { title: "ترموس You Are My Stars", description: "ترموس معدني متدرج اللون يحفظ الحرارة بتصميم نجوم." },
  "WhatsApp Image 2026-08-07 at 11.47.37 PM.jpeg": { title: "نظارة بيكسل", description: "نظارة بيكسل (Thug Life) لمظهر شبابي ومرح." },
  "WhatsApp Image 2026-08-07 at 11.48.10 PM.jpeg": { title: "مج زجاج بغطاء خشب", description: "مج زجاجي شفاف بغطاء خشبي وشاليموه زجاج." },
  "WhatsApp Image 2026-08-07 at 11.49.17 PM.jpeg": { title: "مج صبار", description: "مج بينك مطبوع عليه رسومات صبار مميزة." },
  "WhatsApp Image 2026-08-07 at 11.50.55 PM.jpeg": { title: "نظارة شمسية نار", description: "نظارة شمسية بتصميم عصري على شكل ألسنة اللهب." },
  "WhatsApp Image 2026-08-07 at 11.52.26 PM.jpeg": { title: "شنطة أدوات عناية للسفر", description: "شنطة شفافة تحتوي على عبوات قابلة لإعادة التعبئة للسفر." },
  "WhatsApp Image 2026-08-08 at 12.06.11 AM.jpeg": { title: "مضرب نسكافيه كهربائي", description: "مضرب وايرلس للنسكافيه والحليب بشحن USB." },
  "WhatsApp Image 2026-08-08 at 12.08.21 AM.jpeg": { title: "كتاب تلوين Cozy Moments", description: "كتاب تلوين مريح للأعصاب بتصميمات مبهجة وبناتي." },
  "WhatsApp Image 2026-08-08 at 12.09.08 AM.jpeg": { title: "لعبة كروت قول أو إعمل", description: "لعبة كروت مضحكة للأصحاب بتحديات جريئة." },
  "WhatsApp Image 2026-08-08 at 12.09.41 AM.jpeg": { title: "أخطبوط دبدوب يعكس", description: "دبدوب أخطبوط يعكس الوجهين (فرحان/زعلان)." },
  "WhatsApp Image 2026-08-08 at 12.23.37 AM.jpeg": { title: "سلسلة صليب ذهبي", description: "سلسلة ذهبية تحمل صليب بملامح وجه المسيح المميزة." },
  "WhatsApp Image 2026-08-08 at 12.31.15 AM.jpeg": { title: "ميدالية صليب فضي", description: "ميدالية مفاتيح بصليب فضي أنيق وبسيط." }
};

async function run() {
  const storeDir = path.join(process.cwd(), 'Store');
  const files = fs.readdirSync(storeDir).filter(f => f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png'));
  
  // Sort files by size exactly as we did in upload_store.js
  const fileStats = files.map(file => {
    const filePath = path.join(storeDir, file);
    const stats = fs.statSync(filePath);
    return { file, size: stats.size };
  });

  fileStats.sort((a, b) => a.size - b.size);

  for (let i = 0; i < fileStats.length; i++) {
    const file = fileStats[i].file;
    const itemTitle = `هدية ${i + 1}`; // This is how it was originally saved
    
    const mapped = mapping[file];
    if (mapped) {
      console.log(`Updating ${itemTitle} -> ${mapped.title}`);
      
      const { data, error } = await supabase
        .from('storeItems')
        .update({ 
          title: mapped.title,
          description: mapped.description
        })
        .eq('title', itemTitle);
        
      if (error) {
        console.error(`Failed to update ${itemTitle}:`, error);
      }
    } else {
      console.warn(`No mapping found for file: ${file}`);
    }
  }

  console.log("Done updating metadata.");
}

run();
