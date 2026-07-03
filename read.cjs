const fs = require('fs');
const content = fs.readFileSync('public/assets/maps/الاحداثيات.txt', 'utf8');
const j2start = content.indexOf('"journey2"');
console.log(content.substring(j2start, j2start + 500));
