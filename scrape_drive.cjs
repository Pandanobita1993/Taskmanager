const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://drive.google.com/drive/folders/1v37jWiGpHgqkqog79gBjjPZhwvs3yitu?usp=sharing', { waitUntil: 'networkidle0' });
  
  const files = await page.evaluate(() => {
    // Attempt to extract file IDs from the DOM.
    // Drive usually stores these in data attributes.
    const els = document.querySelectorAll('div[data-id]');
    const results = [];
    els.forEach(el => {
      const id = el.getAttribute('data-id');
      const name = el.getAttribute('aria-label') || el.innerText || 'Unknown';
      if (id && id.length > 20) {
        results.push({ id, name });
      }
    });
    return results;
  });

  console.log(JSON.stringify(files, null, 2));
  await browser.close();
})();
