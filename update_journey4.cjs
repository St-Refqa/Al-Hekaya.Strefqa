const fs = require('fs');

let content = fs.readFileSync('src/lib/journeysData.ts', 'utf8');

// The new Journey 4 string
const newJourney4 = `  {
    id: 'journey4',
    title: 'الرحلة إلى روما (أع 27-28)',
    color: '#7c3aed',
    mapImage: '/assets/maps/journey4.png', // rose-600
    locations: [
      {
        id: 'jerusalem4',
        name: 'أورشليم',
        x: 88, y: 78,
        companions: ['لوقا', 'أرسترخس'],
        events: 'تم القبض على بولس هنا وبداية رحلة المحاكمات.'
      },
      {
        id: 'caesarea4',
        name: 'قيصرية',
        x: 88, y: 72,
        companions: ['لوقا', 'أرسترخس'],
        events: 'السجن لمدة سنتين والمحاكمات. بولس يرفع دعواه إلى قيصر.'
      },
      {
        id: 'tyre',
        name: 'صور',
        x: 88, y: 67,
        companions: ['لوقا', 'أرسترخس'],
        events: 'المرور بصور في بداية الرحلة بحراً.',
        labelPosition: 'left'
      },
      {
        id: 'myra',
        name: 'ميرا ليكيا',
        x: 67, y: 48,
        companions: ['لوقا', 'أرسترخس'],
        events: 'الانتقال إلى سفينة إسكندرية متجهة لإيطاليا.',
        labelPosition: 'top-left'
      },
      {
        id: 'cnidus',
        name: 'كنيدوس',
        x: 59, y: 46,
        companions: ['لوقا', 'أرسترخس'],
        events: 'ساروا ببطء أياماً كثيرة وبالجهد وصلوا بقرب كنيدوس.'
      },
      {
        id: 'fair-havens',
        name: 'لاسائية (الموانئ الجميلة)',
        x: 53, y: 59,
        companions: ['لوقا', 'أرسترخس'],
        events: 'تحذير بولس من خطورة السفر ولكنهم لم يستمعوا له، فهبت ريح أوروكليدون العنيفة.',
        image: '/assets/paul-ship.png',
        labelPosition: 'bottom'
      },
      {
        id: 'clauda',
        name: 'كلودا',
        x: 48, y: 62,
        companions: ['لوقا', 'أرسترخس'],
        events: 'جرتهم الريح تحت جزيرة كلودا وبالجهد تمكنوا من القارب.'
      },
      {
        id: 'malta',
        name: 'مالطا',
        x: 14, y: 53,
        companions: ['لوقا', 'أرسترخس'],
        events: 'انكسار السفينة. لدغة الأفعى لبولس ولم يتضرر، وشفاء أبو بوبليوس.',
        image: '/assets/paul-miracle.png',
        labelPosition: 'bottom'
      },
      {
        id: 'syracuse',
        name: 'سراكوسا',
        x: 17, y: 44,
        companions: ['لوقا', 'أرسترخس'],
        events: 'المكوث 3 أيام في هذه المدينة الواقعة في جزيرة صقلية.',
        labelPosition: 'left'
      },
      {
        id: 'rhegium',
        name: 'ريغيون',
        x: 19, y: 37,
        companions: ['لوقا', 'أرسترخس'],
        events: 'الطواف من هناك والوصول إلى ريغيون.'
      },
      {
        id: 'puteoli',
        name: 'بوطيولي',
        x: 15, y: 16,
        companions: ['لوقا', 'أرسترخس'],
        events: 'لقاء إخوة مؤمنين والمكوث عندهم 7 أيام.',
        labelPosition: 'top-left'
      },
      {
        id: 'rome',
        name: 'روما',
        x: 10, y: 8,
        companions: ['لوقا', 'أرسترخس'],
        events: 'تحديد إقامة بولس في بيت مستأجر لمدة سنتين.',
        labelPosition: 'top-right'
      }
    ]
  }`;

// Find the start of journey4 block and end of it.
const j4Start = content.indexOf("id: 'journey4'");
if (j4Start !== -1) {
  // Back up to the opening brace of journey4
  const blockStart = content.lastIndexOf("  {\n    id: 'journey4'", j4Start);
  if (blockStart !== -1) {
    // We want to replace from blockStart until the end of the file or the next journey (there is none, this is the last element).
    // The file ends with:
    //     ]
    //   }
    // ];
    // We will just replace everything from blockStart to the end with newJourney4 + "\n];\n"
    
    // Find the end of locations array
    content = content.substring(0, blockStart) + newJourney4 + "\n];\n";
    fs.writeFileSync('src/lib/journeysData.ts', content);
    console.log('Journey 4 updated!');
  }
}
