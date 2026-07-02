const fs = require('fs');

const userCoords = JSON.parse(fs.readFileSync('user_coords_final.json', 'utf8'));
let content = fs.readFileSync('src/lib/journeysData.ts', 'utf8');

for (const journeyKey of Object.keys(userCoords)) {
  const locations = userCoords[journeyKey];
  for (const loc of locations) {
    const regex = new RegExp(`(id:\\s*'${loc.id}',[\\s\\S]*?y:\\s*[\\d.]+)(?:,\\s*cx:\\s*[\\d.]+,\\s*cy:\\s*[\\d.]+)?`, 'g');
    
    content = content.replace(regex, (match, prefix) => {
      let updatedPrefix = prefix.replace(/x:\s*[\d.]+/, `x: ${loc.x}`).replace(/y:\s*[\d.]+/, `y: ${loc.y}`);
      if (loc.cx !== undefined && loc.cy !== undefined) {
        return `${updatedPrefix}, cx: ${loc.cx}, cy: ${loc.cy}`;
      }
      return updatedPrefix;
    });
  }
}

fs.writeFileSync('src/lib/journeysData.ts', content);
console.log('Coordinates applied!');
