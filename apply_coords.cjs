const fs = require('fs');

const userCoords = JSON.parse(fs.readFileSync('user_coords_final.json', 'utf8'));
let content = fs.readFileSync('src/lib/journeysData.ts', 'utf8');

for (const journeyKey of Object.keys(userCoords)) {
  const locations = userCoords[journeyKey];
  for (const loc of locations) {
    // We match the block from id up to y: ...
    const regex = new RegExp(`(id:\\s*'${loc.id}',[\\s\\S]*?y:\\s*[\\d.]+)(?:,\\s*cx:\\s*[\\d.]+,\\s*cy:\\s*[\\d.]+)?`, 'g');
    
    content = content.replace(regex, (match, prefix) => {
      let updatedPrefix = prefix
        .replace(/x:\s*[\d.]+/, `x: ${loc.x}`)
        .replace(/y:\s*[\d.]+/, `y: ${loc.y}`);
        
      if (loc.name) {
        updatedPrefix = updatedPrefix.replace(/name:\s*['"][^'"]+['"]/, `name: '${loc.name}'`);
      }

      if (loc.cx !== undefined && loc.cy !== undefined) {
        return `${updatedPrefix}, cx: ${loc.cx}, cy: ${loc.cy}`;
      }
      return updatedPrefix;
    });

    // Handle labelPosition which might be further down in the block
    if (loc.labelPosition) {
      // Look for the block again
      const blockRegex = new RegExp(`(id:\\s*'${loc.id}'[\\s\\S]*?)(labelPosition:\\s*['"][^'"]+['"])?(\\s*})`, 'g');
      content = content.replace(blockRegex, (match, before, existingLabel, after) => {
        if (existingLabel) {
          return `${before}labelPosition: '${loc.labelPosition}'${after}`;
        } else {
          return `${before}labelPosition: '${loc.labelPosition}',\n  ${after}`;
        }
      });
    }
  }
}

fs.writeFileSync('src/lib/journeysData.ts', content);
console.log('Coordinates applied!');
