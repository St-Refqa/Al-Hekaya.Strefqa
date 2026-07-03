const fs = require('fs');
const data = JSON.parse(fs.readFileSync('map-coordinates (02).json', 'utf8'));
let ts = fs.readFileSync('src/lib/journeysData.ts', 'utf8');

for (const jId of ['journey2']) {
  if (!data[jId]) continue;
  const startStr = "id: '" + jId + "'";
  const startIdx = ts.indexOf(startStr);
  if (startIdx === -1) continue;
  
  const locStartIdx = ts.indexOf('locations: [', startIdx);
  let bracketCount = 0;
  let locEndIdx = -1;
  for (let i = locStartIdx + 11; i < ts.length; i++) {
    if (ts[i] === '[') bracketCount++;
    if (ts[i] === ']') {
      bracketCount--;
      if (bracketCount === 0) {
        locEndIdx = i;
        break;
      }
    }
  }
  
  if (locEndIdx !== -1) {
    const newLocs = JSON.stringify(data[jId], null, 6);
    ts = ts.slice(0, locStartIdx + 11) + newLocs + ts.slice(locEndIdx + 1);
  }
}
fs.writeFileSync('src/lib/journeysData.ts', ts);
console.log('Successfully updated journeysData.ts with journey2 from (02).json');
