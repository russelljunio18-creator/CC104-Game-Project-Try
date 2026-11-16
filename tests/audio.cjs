const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

// Voice clip checks. Run with Playwright installed: node tests/audio.cjs
// Set BROWSER_PATH if a system Chromium browser should be used.
const root = process.env.CANTEEN_ROOT || path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch({ headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
    ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
  try {
    const context = await browser.newContext({ offline: true, viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

    // File name of the clip loaded in the single audio player ('' when silent).
    const clip = () => page.evaluate(() => {
      const src = document.getElementById('character-audio').getAttribute('src');
      return src ? src.split('/').pop() : '';
    });
    const serveFront = () => page.evaluate(() => { counterBusy = false; handleServe(peekCustomer().order); });

    await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
    await page.waitForFunction(() => typeof jQuery === 'function' && typeof SPRITES.siomai === 'string');
    assert.equal(await page.locator('audio').count(), 1);            // one player, so clips never overlap
    assert.equal(await clip(), '');
    assert.equal(await page.locator('#screen-menu .sound-toggle').innerText(), 'Sound: On');

    // The first student reaches the front and speaks.
    await page.locator('#start-shift').click();
    await page.locator('#howto-close').click();
    await page.evaluate(() => stopClock());
    assert.equal(await clip(), 'reden.mp3');
    assert.equal(await page.evaluate(() => speakingCustomerNumber), 1);

    // Students joining the rear never replace or restart the front speaker.
    const playbackBefore = await page.evaluate(() => audioPlaybackId);
    for (let i = 0; i < 3; i++) await page.evaluate(() => { handleArrival(); });
    assert.equal(await clip(), 'reden.mp3');
    assert.equal(await page.evaluate(() => audioPlaybackId), playbackBefore);

    // A wrong food keeps the same speaker; display refreshes never restart sound.
    await page.evaluate(() => { handleServe(FOODS.find(f => f.id !== peekCustomer().order).id); updateDisplay(); });
    assert.equal(await page.evaluate(() => audioPlaybackId), playbackBefore);

    // Serving cuts off the front clip and the next student speaks.
    await serveFront();
    assert.equal(await clip(), 'baron.mp3');
    assert.equal(await page.evaluate(() => speakingCustomerNumber), 2);

    // A walk-out also hands the voice to the next student.
    await page.evaluate(() => { peekCustomer().patience = 50; arrivalClock = 0; gameTick(); });
    assert.equal(await clip(), 'busseng.mp3');

    // Sound off silences the player; sound on resumes with the current front student.
    await page.locator('#hud .sound-toggle').click();
    assert.equal(await clip(), '');
    assert.equal(await page.locator('#hud .sound-toggle').innerText(), 'Sound: Off');
    await serveFront();
    assert.equal(await clip(), '');
    await page.locator('#hud .sound-toggle').click();
    assert.equal(await clip(), 'insan.mp3');
    assert.equal(await page.evaluate(() => peekCustomer().number), 4);

    // An empty line is silent.
    await serveFront();
    assert.equal(await page.evaluate(() => queue.length), 0);
    assert.equal(await clip(), '');

    // The end of a shift and the menu are silent.
    await page.evaluate(() => { handleArrival(); });
    assert.equal(await clip(), 'neneng-b.mp3');   // student #5 is the fifth profile
    await page.locator('#reset-game').click();
    assert.equal(await clip(), '');
    assert.equal(await page.evaluate(() => speakingCustomerNumber), null);

    // Every clip file exists and can be loaded.
    const loadable = await page.evaluate(() => Promise.all(STUDENT_SOUNDS.map(src => new Promise(resolve => {
      const audio = new Audio();
      audio.oncanplaythrough = () => resolve(true);
      audio.onerror = () => resolve(false);
      audio.src = src;
    }))));
    assert.deepEqual(loadable, [true, true, true, true, true]);

    assert.deepEqual(errors, []);
    console.log('PASS: one player, front-only voice, rear arrivals do not restart it, serve and walk-out hand over, sound toggle, silent when empty or closed, five clips load.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
