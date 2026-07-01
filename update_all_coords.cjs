const fs = require('fs');

const coords = {
  journey1: {
    'أنطاكية (سوريا)': { x: 84, y: 38 },
    'سلوكية': { x: 77, y: 38 },
    'سلاميس (قبرص)': { x: 65, y: 48 },
    'بافوس (قبرص)': { x: 52, y: 55 },
    'برجة بمفيلية': { x: 39, y: 38 },
    'أنطاكية بيسيدية': { x: 39, y: 22 },
    'أيقونية': { x: 48, y: 24 },
    'لسترة': { x: 48, y: 30 },
    'دربة': { x: 54, y: 32 },
    'العودة لأنطاكية': { x: 84, y: 38 }
  },
  journey2: {
    'أنطاكية (سوريا)': { x: 82, y: 55 },
    'سوريا وكيليكية': { x: 80, y: 51 },
    'دربة ولسترة': { x: 63, y: 46 },
    'فريجية وغلاطية': { x: 56, y: 42 },
    'ترواس': { x: 35, y: 35 },
    'ساموثراكي ونيابوليس': { x: 29, y: 26 },
    'فيلبي': { x: 25, y: 23 },
    'أمفيبوليس وأبولونية': { x: 23, y: 25 },
    'تسالونيكي': { x: 20, y: 27 },
    'بيرية': { x: 18, y: 30 },
    'أثينا': { x: 24, y: 48 },
    'كورنثوس': { x: 18, y: 49 },
    'كنخريا': { x: 19, y: 50 },
    'أفسس': { x: 40, y: 44 },
    'قيصرية': { x: 81, y: 83 },
    'أورشليم': { x: 82, y: 86 }
  },
  journey3: {
    'أنطاكية (سوريا)': { x: 82, y: 53 },
    'مكدونية (فيلبي)': { x: 28, y: 14 },
    'اليونان (كورنثوس)': { x: 18, y: 45 },
    'أسوس وميتيليني': { x: 37, y: 35 },
    'أفسس': { x: 40, y: 42 },
    'ميليتس': { x: 40, y: 47 },
    'باترا (ليكيا)': { x: 51, y: 55 },
    'صور': { x: 82, y: 74 },
    'بتولمايس (عكا)': { x: 81, y: 78 },
    'قيصرية': { x: 80, y: 83 },
    'أورشليم': { x: 81, y: 87 }
  },
  journey4: {
    'صيدا': { x: 88, y: 64 },
    'ميرا ليكيا': { x: 69, y: 49 },
    'المواني الحسنة (كريت)': { x: 48, y: 59 },
    'مالطة': { x: 14, y: 56 },
    'سرقوسة': { x: 23, y: 48 },
    'ريغيون': { x: 23, y: 40 },
    'بوطيولي': { x: 18, y: 19 },
    'فورن أبيوس والثلاثة حوانيت': { x: 14, y: 15 },
    'روما': { x: 11, y: 11 }
  }
};

let content = fs.readFileSync('src/lib/journeysData.ts', 'utf8');

// split the content by "id: 'journey" to isolate each journey block
const blocks = content.split(/(?=id: 'journey\d')/);

for (let i = 1; i < blocks.length; i++) {
  const block = blocks[i];
  const journeyIdMatch = block.match(/id: '(journey\d)'/);
  if (journeyIdMatch) {
    const journeyId = journeyIdMatch[1];
    const journeyCoords = coords[journeyId];
    if (journeyCoords) {
      let modifiedBlock = block;
      for (const [name, pos] of Object.entries(journeyCoords)) {
        // Find the specific city block inside this journey
        const regex = new RegExp(`(name: '${name}'[\\s\\S]*?)x:\\s*\\d+,\\s*y:\\s*\\d+`, 'g');
        modifiedBlock = modifiedBlock.replace(regex, `$1x: ${pos.x}, y: ${pos.y}`);
      }
      blocks[i] = modifiedBlock;
    }
  }
}

content = blocks.join('');
fs.writeFileSync('src/lib/journeysData.ts', content);
console.log('Coordinates updated successfully for each specific map!');
