import fs from 'fs';

let content = fs.readFileSync('src/data/markQuestions.ts', 'utf8');
content = content.replace(/\r\n/g, '\n');

const matchQ = `  {
    id: 'm5', type: 'match', difficulty: 'easy', chapter: 2,
    pairs: [
      { right: 'لاوي بن حلفى', left: 'العشار الذي دعاه يسوع' },
      { right: 'المفلوج', left: 'دُلّي من السقف' },
      { right: 'أصدقاء المفلوج', left: 'نقبوا السقف بسبب إيمانهم' },
      { right: 'الكتبة', left: 'فكروا في قلوبهم: من يقدر أن يغفر الخطايا' },
    ],
  },
];`;

const fillQ = `  {
    id: 'f17', type: 'fill', difficulty: 'easy', chapter: 4,
    question: '"مَنْ لَهُ أُذُنَانِ لِلسَّمْعِ، فَلْـ_____" (مر ٤: ٩)',
    options: ['يَسْمَعْ', 'يَفْهَمْ', 'يَتُبْ', 'يَكْرِزْ'],
    answer: 'يَسْمَعْ',
    hint: 'ختام مَثَل الزارع',
  },
  {
    id: 'f18', type: 'fill', difficulty: 'medium', chapter: 9,
    question: '"إِنْ كُنْتَ تَسْتَطِيعُ أَنْ تُؤْمِنَ. كُلُّ شَيْءٍ مُسْتَطَاعٌ لِلْمُـ_____" (مر ٩: ٢٣)',
    options: ['مُؤْمِنِ', 'صَائِمِ', 'مُصَلِّي', 'تَائِبِ'],
    answer: 'مُؤْمِنِ',
    hint: 'رد يسوع على أبو الولد المريض',
  },
];`;

const whereQ = `  {
    id: 'w17', type: 'where', difficulty: 'medium', chapter: 14,
    question: 'أين كان يسوع عندما سكبت المرأة طيب الناردين على رأسه؟',
    options: ['بيت عنيا', 'أورشليم', 'الناصرة', 'كفرناحوم'],
    answer: 'بيت عنيا',
    hint: 'في بيت سمعان الأبرص',
  },
];`;

const whoQ = `  {
    id: 'wh17', type: 'who', difficulty: 'easy', chapter: 1,
    question: '"أَنَا عَمَّدْتُكُمْ بِالْمَاءِ، وَأَمَّا هُوَ فَسَيُعَمِّدُكُمْ بِالرُّوحِ الْقُدُسِ" (مر ١: ٨)',
    options: ['يوحنا المعمدان', 'بطرس الرسول', 'إشعياء النبي', 'ملاك الرب'],
    answer: 'يوحنا المعمدان',
    hint: 'كان يكرز في البرية',
  },
];`;

const orderQ = `  {
    id: 'o5', type: 'order', difficulty: 'medium',
    question: 'رتّب أحداث التجلي (مر ٩):',
    items: [
      { text: 'أخذ يسوع بطرس ويعقوب ويوحنا إلى جبل', order: 1 },
      { text: 'تغيّرت هيئة يسوع وصارت ثيابه تلمع', order: 2 },
      { text: 'ظهر إيليا وموسى يتكلمان مع يسوع', order: 3 },
      { text: 'جاءت سحابة وظللتهم وسمعوا صوتاً من السحابة', order: 4 },
    ],
  },
];`;

const speedQ = `  {
    id: 'sp17', type: 'speed', difficulty: 'easy',
    question: 'بأي معجزة بدأ يسوع خدمته في مجمع كفرناحوم حسب إنجيل مارقس؟',
    options: ['إخراج روح نجس', 'شفاء أعمى', 'إقامة ميت', 'مشي على الماء'],
    answer: 'إخراج روح نجس',
  },
];`;

content = content.replace(/ {6}\{ right: 'مريم المجدلية',    left: 'أول من رأى يسوع بعد القيامة' \},\n {4}\],\n {2}\},\n\];/, 
`      { right: 'مريم المجدلية',    left: 'أول من رأى يسوع بعد القيامة' },\n    ],\n  },\n` + matchQ);

content = content.replace(/ {4}answer: 'فَاغْفِرُوا',\n {4}hint: 'عن أهمية التسامح لاستجابة الصلاة',\n {2}\},\n\];/,
`    answer: 'فَاغْفِرُوا',\n    hint: 'عن أهمية التسامح لاستجابة الصلاة',\n  },\n` + fillQ);

content = content.replace(/ {4}answer: 'بستان جثسيماني',\n {4}hint: 'مر ١٤: ٥١ — وقت إلقاء القبض على يسوع',\n {2}\},\n\];/,
`    answer: 'بستان جثسيماني',\n    hint: 'مر ١٤: ٥١ — وقت إلقاء القبض على يسوع',\n  },\n` + whereQ);

content = content.replace(/ {4}answer: 'الشاب اللابس حلة بيضاء',\n {4}hint: 'كان في القبر وقت ذهاب المريمات',\n {2}\},\n\];/,
`    answer: 'الشاب اللابس حلة بيضاء',\n    hint: 'كان في القبر وقت ذهاب المريمات',\n  },\n` + whoQ);

content = content.replace(/ {6}\{ text: 'ظهور يسوع لمريم المجدلية', order: 4 \},\n {4}\],\n {2}\},\n\];/,
`      { text: 'ظهور يسوع لمريم المجدلية', order: 4 },\n    ],\n  },\n` + orderQ);

content = content.replace(/ {4}answer: 'الصلاة',\n {4}hint: 'طالبهم يسوع بالصلاة لئلا يدخلوا في تجربة',\n {2}\},\n\];/,
`    answer: 'الصلاة',\n    hint: 'طالبهم يسوع بالصلاة لئلا يدخلوا في تجربة',\n  },\n` + speedQ);

fs.writeFileSync('src/data/markQuestions.ts', content, 'utf8');
console.log('Done!');
