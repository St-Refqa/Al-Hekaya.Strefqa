const https = require('https');

https.get('https://al-hekaya.strefqa.com/assessment/ns6g9pqngrfbaa4pqmija6', (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const match = data.match(/src=\"(\/assets\/index-[^\"]+\.js)\"/);
    if (match) {
      console.log('Found JS bundle:', match[1]);
      https.get('https://al-hekaya.strefqa.com' + match[1], (res2) => {
        let data2 = '';
        res2.on('data', d => data2 += d);
        res2.on('end', () => {
          console.log('Includes Math.round?', data2.includes('Math.round'));
          // Log a snippet containing Math.round around calculatePercentage if possible
        });
      });
    } else {
      console.log('No JS bundle found in index.html');
    }
  });
});
