const fs = require('fs');
let c = fs.readFileSync('src/lib/journeysData.ts', 'utf8');
const imgMap = {
  'antioch-syria': '/assets/cities/antioch_syria.png',
  'seleucia': '/assets/cities/seleucia.png',
  'salamis': '/assets/cities/salamis_cyprus.png',
  'paphos': '/assets/cities/paphos_cyprus.png',
  'perga': '/assets/cities/perga.png',
  'antioch-pisidia': '/assets/cities/antioch_pisidia.png',
  'iconium': '/assets/cities/iconium.png',
  'lystra': '/assets/cities/lystra.png',
  'derbe': '/assets/cities/derbe.png',
  'derbe-lystra': '/assets/cities/derbe.png',
  'troas': '/assets/cities/troas.png',
  'philippi': '/assets/cities/philippi.png',
  'thessalonica': '/assets/cities/thessalonica.png',
  'berea': '/assets/cities/berea.png',
  'athens': '/assets/cities/athens.png',
  'corinth': '/assets/cities/corinth.png',
  'ephesus': '/assets/cities/ephesus.png',
  'miletus': '/assets/cities/miletus.png'
};

Object.keys(imgMap).forEach(id => {
  const r = new RegExp(`(id:\\s*'${id}',(?:[^{}]*?))image:\\s*'[^']+'`, 'g');
  if (c.match(r)) {
    c = c.replace(r, `$1image: '${imgMap[id]}'`);
  } else {
    const r2 = new RegExp(`(id:\\s*'${id}',[^{}]*?events:\\s*'[^']+')(,?)`, 'g');
    c = c.replace(r2, `$1,\n        image: '${imgMap[id]}'$2`);
  }
});
fs.writeFileSync('src/lib/journeysData.ts', c);
