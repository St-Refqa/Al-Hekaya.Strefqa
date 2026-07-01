const fs = require('fs');

const userCoords = JSON.parse(fs.readFileSync('user_coords3.json', 'utf8'));
let content = fs.readFileSync('src/lib/journeysData.ts', 'utf8');

for (const journeyKey of Object.keys(userCoords)) {
  const locations = userCoords[journeyKey];
  for (const loc of locations) {
    // Find the block in content for this location id.
    // We look for: id: 'loc.id',
    const regex = new RegExp(`id:\\s*'${loc.id}',\\s*name:[\\s\\S]*?x:\\s*([\\d.]+),\\s*y:\\s*([\\d.]+)`, 'g');
    
    content = content.replace(regex, (match, oldX, oldY) => {
      // Replace the old X and Y with the new ones
      return match.replace(`x: ${oldX}`, `x: ${loc.x}`).replace(`y: ${oldY}`, `y: ${loc.y}`);
    });
  }
}

fs.writeFileSync('src/lib/journeysData.ts', content);
console.log('Coordinates applied!');
