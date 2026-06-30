const fs = require('fs');
let c = fs.readFileSync('src/lib/journeysData.ts', 'utf8');

const positions = {
  // Journey 1
  'أنطاكية بيسيدية': 'top-left',
  'أيقونية': 'bottom',
  'لسترة': 'right',
  'دربة': 'right',
  'سلوكية': 'bottom',
  'سلاميس (قبرص)': 'bottom-right',
  'بافوس (قبرص)': 'bottom-left',
  'العودة لأنطاكية': 'right',

  // Journey 2
  'دربة ولسترة': 'bottom',
  'تسالونيكي': 'top',
  'بيرية': 'left',
  'أثينا': 'top-left',
  'كورنثوس': 'bottom-left',

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
  const regex = new RegExp(`(name: '${name}',[^}]*?events: '[^']*'(?:,\\s*image: '[^']*')?)\\n\\s*}`, 'g');
  c = c.replace(regex, `$1,\n        labelPosition: '${pos}'\n      }`);
}

fs.writeFileSync('src/lib/journeysData.ts', c);
console.log("Done");
