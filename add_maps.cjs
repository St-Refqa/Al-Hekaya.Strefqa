const fs = require('fs');

let c = fs.readFileSync('src/lib/journeysData.ts', 'utf8');

c = c.replace(/export interface Journey \{/, "export interface Journey {\n  mapImage?: string;");
c = c.replace(/id: 'journey1',([\s\S]*?)color: '[^']+',/, "id: 'journey1',$1color: '#d97706',\n    mapImage: '/assets/maps/journey1.jpg',");
c = c.replace(/id: 'journey2',([\s\S]*?)color: '[^']+',/, "id: 'journey2',$1color: '#059669',\n    mapImage: '/assets/maps/journey2.jpg',");
c = c.replace(/id: 'journey3',([\s\S]*?)color: '[^']+',/, "id: 'journey3',$1color: '#2563eb',\n    mapImage: '/assets/maps/journey3.jpg',");
c = c.replace(/id: 'journey4',([\s\S]*?)color: '[^']+',/, "id: 'journey4',$1color: '#7c3aed',\n    mapImage: '/assets/maps/journey4.jpg',");

fs.writeFileSync('src/lib/journeysData.ts', c);
console.log('Added mapImage properties!');
