const fs = require('fs');
let c = fs.readFileSync('src/lib/journeysData.ts', 'utf8');

const positions = {
  // Journey 1
  'أنطاكية (سوريا)': 'top-right',
  'سلوكية': 'bottom',
  'سلاميس (قبرص)': 'right',
  'بافوس (قبرص)': 'bottom',
  'برجة بمفيلية': 'bottom-left',
  'أنطاكية بيسيدية': 'top-left',
  'أيقونية': 'top-right',
  'لسترة': 'bottom',
  'دربة': 'top-right',
  'العودة لأنطاكية': 'bottom-right',

  // Journey 2
  'سوريا وكيليكية': 'bottom-right',
  'دربة ولسترة': 'bottom',
  'فريجية وغلاطية': 'top-left',
  'ترواس': 'top',
  'فيلبي': 'top-left',
  'تسالونيكي': 'bottom-left',
  'بيرية': 'bottom-right',
  'أثينا': 'top-right',
  'كورنثوس': 'bottom-left',
  'أفسس': 'bottom',
  'قيصرية وأورشليم': 'bottom-left',

  // Journey 3
  'مكدونية (فيلبي)': 'top-left',
  'اليونان (كورنثوس)': 'bottom-left',
  'ميليتس': 'bottom-right',
  'صور': 'left',
  'قيصرية': 'left',
  'أورشليم': 'bottom',

  // Journey 4
  'صيدا': 'left',
  'ميرا ليكيا': 'top-left',
  'المواني الحسنة (كريت)': 'bottom',
  'مالطة': 'bottom',
  'سرقوسة': 'left',
  'بوطيولي': 'top-left',
  'فورن أبيوس والثلاثة حوانيت': 'top',
  'روما': 'top-left'
};

for (const [name, pos] of Object.entries(positions)) {
  const regex = new RegExp(`(name: '${name}',[^}]*?events: '[^']*'(?:,\\s*image: '[^']*')?)\\r?\\n\\s*}`, 'g');
  c = c.replace(regex, `$1,\n        labelPosition: '${pos}'\n      }`);
}

fs.writeFileSync('src/lib/journeysData.ts', c);
console.log("Done");
