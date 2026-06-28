const https = require('https');

https.get('https://al-hekaya.strefqa.com/assessment/n5th8167rueg8h3d78lx38', (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const match = data.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if (match) {
      console.log("JS FILE:", match[1]);
      https.get('https://al-hekaya.strefqa.com' + match[1], (jsRes) => {
        let jsData = '';
        jsRes.on('data', d => jsData += d);
        jsRes.on('end', () => {
          console.log("speechSynthesis found:", jsData.includes('window.speechSynthesis.onvoiceschanged='));
          console.log("Array.isArray found:", jsData.includes('Array.isArray('));
        });
      });
    } else {
      console.log('not found');
    }
  });
});
