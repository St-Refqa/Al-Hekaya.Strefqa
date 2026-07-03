const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 720 });
  console.log("Going to URL...");
  await page.goto('https://prezi.com/view/bZeyG8AafffOmxD1A7a4/?referral_token=nMZcZclnB3FN', { waitUntil: 'networkidle2' });
  
  console.log("Waiting for 10 seconds for initial load...");
  await new Promise(r => setTimeout(r, 10000));
  
  try {
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const acceptBtn = buttons.find(b => b.textContent.includes('Accept') || b.textContent.includes('موافق'));
      if(acceptBtn) acceptBtn.click();
    });
  } catch(e) {}

  await new Promise(r => setTimeout(r, 3000));

  console.log("Taking screenshots...");
  for (let i = 1; i <= 15; i++) {
    await page.screenshot({ path: `C:\\Users\\ACC\\Desktop\\PreziScreenshots\\slide_${i}.png` });
    console.log(`Took slide_${i}.png`);
    await page.keyboard.press('ArrowRight');
    await new Promise(r => setTimeout(r, 3500));
  }

  await browser.close();
  console.log("Done!");
})();
