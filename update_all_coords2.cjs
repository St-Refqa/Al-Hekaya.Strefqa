const fs = require('fs');

const coords = {
  journey1: {
    'أنطاكية (سوريا)': { x: 91, y: 44 },
    'سلوكية': { x: 88, y: 45 },
    'سلاميس (قبرص)': { x: 82, y: 52 },
    'بافوس (قبرص)': { x: 75, y: 56 },
    'برجة بمفيلية': { x: 70, y: 40 },
    'أنطاكية بيسيدية': { x: 70, y: 31 },
    'أيقونية': { x: 74, y: 34 },
    'لسترة': { x: 74, y: 37 },
    'دربة': { x: 76, y: 40 },
    'العودة لأنطاكية': { x: 91, y: 44 }
  },
  journey2: {
    'أنطاكية (سوريا)': { x: 91, y: 44 },
    'سوريا وكيليكية': { x: 89, y: 41 },
    'دربة ولسترة': { x: 75, y: 38 },
    'فريجية وغلاطية': { x: 65, y: 32 },
    'ترواس': { x: 57, y: 24 },
    'ساموثراكي ونيابوليس': { x: 51, y: 16 },
    'فيلبي': { x: 50, y: 15 },
    'أمفيبوليس وأبولونية': { x: 48, y: 16 },
    'تسالونيكي': { x: 45, y: 18 },
    'بيرية': { x: 42, y: 21 },
    'أثينا': { x: 47, y: 39 },
    'كورنثوس': { x: 45, y: 41 },
    'كنخريا': { x: 46, y: 42 },
    'أفسس': { x: 59, y: 38 },
    'قيصرية': { x: 88, y: 72 },
    'أورشليم': { x: 88, y: 78 }
  },
  journey3: {
    'أنطاكية (سوريا)': { x: 91, y: 44 },
    'مكدونية (فيلبي)': { x: 50, y: 15 },
    'اليونان (كورنثوس)': { x: 45, y: 41 },
    'أسوس وميتيليني': { x: 55, y: 31 },
    'أفسس': { x: 59, y: 38 },
    'ميليتس': { x: 59, y: 41 },
    'باترا (ليكيا)': { x: 61, y: 48 },
    'صور': { x: 88, y: 67 },
    'بتولمايس (عكا)': { x: 88, y: 69 },
    'قيصرية': { x: 88, y: 72 },
    'أورشليم': { x: 88, y: 78 }
  },
  journey4: {
    'صيدا': { x: 88, y: 66 },
    'ميرا ليكيا': { x: 67, y: 48 },
    'المواني الحسنة (كريت)': { x: 53, y: 59 },
    'مالطة': { x: 14, y: 53 },
    'سرقوسة': { x: 17, y: 44 },
    'ريغيون': { x: 19, y: 37 },
    'بوطيولي': { x: 15, y: 16 },
    'فورن أبيوس والثلاثة حوانيت': { x: 13, y: 13 },
    'روما': { x: 10, y: 8 }
  }
};

let content = fs.readFileSync('src/lib/journeysData.ts', 'utf8');

// Also add mapImage property
content = content.replace(/export interface Journey \{/, "export interface Journey {\n  mapImage?: string;");
content = content.replace(/id: 'journey1',([\s\S]*?)color: '[^']+',/, "id: 'journey1',$1color: '#d97706',\n    mapImage: '/assets/maps/journey1.png',");
content = content.replace(/id: 'journey2',([\s\S]*?)color: '[^']+',/, "id: 'journey2',$1color: '#059669',\n    mapImage: '/assets/maps/journey2.png',");
content = content.replace(/id: 'journey3',([\s\S]*?)color: '[^']+',/, "id: 'journey3',$1color: '#2563eb',\n    mapImage: '/assets/maps/journey3.png',");
content = content.replace(/id: 'journey4',([\s\S]*?)color: '[^']+',/, "id: 'journey4',$1color: '#7c3aed',\n    mapImage: '/assets/maps/journey4.png',");

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
        const regex = new RegExp(`(name: '${name}'[\\s\\S]*?)x:\\s*\\d+,\\s*y:\\s*\\d+`, 'g');
        modifiedBlock = modifiedBlock.replace(regex, `$1x: ${pos.x}, y: ${pos.y}`);
      }
      blocks[i] = modifiedBlock;
    }
  }
}

content = blocks.join('');
fs.writeFileSync('src/lib/journeysData.ts', content);
console.log('Coordinates and mapImages updated successfully for each new map!');
