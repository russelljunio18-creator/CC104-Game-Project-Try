const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = process.env.CANTEEN_ROOT || path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch({headless: true, args: ['--mute-audio'],
    ...(process.env.BROWSER_PATH ? {executablePath: process.env.BROWSER_PATH} : {})});
  try {
    const context = await browser.newContext({offline: true});
    const page = await context.newPage();
    const errors = [];
    const requests = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => {if(m.type() === 'error') errors.push(m.text());});
    page.on('request', r => {if(/^https?:/.test(r.url())) requests.push(r.url());});
    const audio = () => page.evaluate(() => {
      const a = document.querySelector('#character-audio');
      return {src: a.getAttribute('src'), paused: a.paused, time: a.currentTime};
    });
    for (const width of [1280, 375]) {
      await page.setViewportSize({width, height: 900});
      await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
      assert.deepEqual(await audio(), {src: null, paused: true, time: 0});
      assert.equal(await page.locator('#sound-enabled').isChecked(), true);
      for (const file of ['reden', 'baron', 'busseng', 'insan', 'neneng-b']) {
        await page.locator('#add-student').click();
        await page.waitForFunction(expected => {
          const a = document.querySelector('#character-audio');
          return a.getAttribute('src') === 'assets/audio/' + expected + '.mp3' &&
            !a.paused && a.currentTime > 0 && a.readyState >= 2;
        }, file);
        assert.equal(await page.locator('audio').count(), 1);
      }
      const lastSrc = (await audio()).src;
      await page.evaluate(() => {peekCustomer(); updateDisplay();});
      await page.locator('#serve-student').click();
      assert.equal((await audio()).src, lastSrc);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({path: path.join(root, 'docs/screenshots', `audio-${width}.png`), fullPage: true});
      await page.locator('#reset-game').click();
      assert.deepEqual(await audio(), {src: null, paused: true, time: 0});
      await page.locator('#add-student').click();
      await page.waitForFunction(() => !document.querySelector('#character-audio').paused);
      await page.locator('#sound-enabled').uncheck();
      assert.deepEqual(await audio(), {src: null, paused: true, time: 0});
      await page.locator('#add-student').click();
      assert.equal(await page.locator('#waiting-count').innerText(), '2');
      assert.equal((await audio()).src, null);
      await page.locator('#sound-enabled').check();
      assert.equal((await audio()).src, null); // No surprise playback on enabling.
      await page.locator('#reset-game').click();
      await page.locator('#add-student').click();
      await page.evaluate(() => { for(let i = 0; i < 4; i++) $('#add-student').trigger('click'); });
      await page.waitForFunction(() => {
        const a = document.querySelector('#character-audio');
        return a.src.endsWith('/neneng-b.mp3') && !a.paused && a.currentTime > 0;
      });
      assert.equal(await page.locator('#waiting-count').innerText(), '5');
      // A browser playback rejection must not prevent enqueue or leave an unhandled error.
      await page.evaluate(() => {
        const a = document.querySelector('#character-audio');
        a.play = () => Promise.reject(new DOMException('Playback blocked for test', 'NotAllowedError'));
      });
      await page.locator('#add-student').click();
      await page.waitForFunction(() => document.querySelector('#sound-status').textContent.includes('Audio could not play'));
      assert.equal(await page.locator('#waiting-count').innerText(), '6');
      await page.reload();
      assert.deepEqual(await audio(), {src: null, paused: true, time: 0});
      console.log(`PASS audio ${width}px: all five real MP3s play offline, replacement, reset, toggle, rapid adds, failure isolation, no autoplay`);
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, []);
    console.log('PASS: no remote requests, console errors, or unhandled playback errors.');
  } finally {await browser.close();}
})().catch(e => {console.error(e); process.exitCode = 1;});
