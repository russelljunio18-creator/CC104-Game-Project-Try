const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

// One-screen layout checks. Run with Playwright installed: node tests/layout.cjs
// Set BROWSER_PATH if a system Chromium browser should be used.
const root = process.env.CANTEEN_ROOT || path.resolve(__dirname, '..');
const output = path.join(root, 'docs', 'screenshots');
fs.mkdirSync(output, { recursive: true });

// Laptop, projector-style, the stage's own size, and a phone held sideways.
const SIZES = [[1280, 720], [1920, 1080], [960, 540], [667, 375]];

(async () => {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
  try {
    const context = await browser.newContext({ offline: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

    // True when the element's box sits fully inside the browser window.
    const inside = selector => page.locator(selector).evaluateAll(elements => elements.every(element => {
      const box = element.getBoundingClientRect();
      return box.width > 0 && box.left >= -1 && box.top >= -1
        && box.right <= window.innerWidth + 1 && box.bottom <= window.innerHeight + 1;
    }));
    const noScroll = () => page.evaluate(() =>
      document.documentElement.scrollWidth <= window.innerWidth
      && document.documentElement.scrollHeight <= window.innerHeight);

    for (const [width, height] of SIZES) {
      await page.setViewportSize({ width, height });
      await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
      await page.waitForFunction(() => typeof jQuery === 'function' && typeof SPRITES.siomai === 'string');
      const label = width + 'x' + height;

      // Menu: everything fits with no scrolling.
      assert.equal(await inside('#stage'), true, 'stage fits at ' + label);
      assert.equal(await noScroll(), true, 'no scrolling at ' + label);
      assert.equal(await inside('#start-shift, .mode-button, #open-howto, #screen-menu .sound-toggle'), true, 'menu buttons at ' + label);
      const scale = await page.evaluate(() => document.getElementById('stage').getBoundingClientRect().width / 960);
      assert.ok(Math.abs(scale - Math.min(width / 960, height / 540)) < 0.01, 'stage scale at ' + label);

      // How to Play fits.
      await page.locator('#screen-menu .sound-toggle').click();
      await page.locator('#start-shift').click();
      assert.equal(await inside('#screen-howto .dialog, #howto-close'), true, 'how to play at ' + label);
      await page.locator('#howto-close').click();
      await page.evaluate(() => stopClock());

      // A full line of six stays on screen, in order, between counter and door.
      for (let i = 0; i < 5; i++) await page.evaluate(() => { handleArrival(); });
      await page.waitForTimeout(750);
      assert.equal(await page.locator('#line .student').count(), 6);
      assert.equal(await inside('#line .student'), true, 'six students at ' + label);
      assert.equal(await inside('.food-button'), true, 'food buttons at ' + label);
      assert.equal(await inside('#hud .hud-pill, #hud .px-btn, #peek-panel, #order-bubble, #feedback-panel, #tag-front, #tag-rear'), true, 'panels at ' + label);
      const lefts = await page.locator('#line .student').evaluateAll(elements => elements
        .sort((a, b) => a.dataset.number - b.dataset.number).map(element => element.getBoundingClientRect().left));
      for (let i = 1; i < lefts.length; i++) assert.ok(lefts[i] > lefts[i - 1], 'arrival order left to right at ' + label);
      const overlap = await page.evaluate(() => {
        const students = $('#line .student').get().map(element => element.getBoundingClientRect());
        const counter = document.querySelector('.counter').getBoundingClientRect();
        const door = document.querySelector('.door').getBoundingClientRect();
        return students.some(box => box.left < counter.right || box.right > door.left);
      });
      assert.equal(overlap, false, 'line sits between counter and door at ' + label);
      // FRONT tag is under the first student, REAR tag under the last.
      const tags = await page.evaluate(() => {
        const left = selector => Math.round(document.querySelector(selector).getBoundingClientRect().left);
        return [left('#tag-front') - left('#student-1'), left('#tag-rear') - left('#student-6')];
      });
      assert.ok(Math.abs(tags[0]) <= 2 && Math.abs(tags[1]) <= 2, 'tags follow front and rear at ' + label);
      if (width === 667) await page.screenshot({ path: path.join(output, 'full-line-phone-landscape.png') });
      if (width === 1280) await page.screenshot({ path: path.join(output, 'full-line.png') });

      // End screen fits.
      await page.evaluate(() => { handleArrival(); });
      await page.locator('#screen-end').waitFor({ state: 'visible' });
      assert.equal(await inside('#end-dialog, #play-again, #back-to-menu'), true, 'end screen at ' + label);
    }

    // Resizing the window rescales the stage.
    await page.setViewportSize({ width: 800, height: 700 });
    await page.waitForTimeout(100);
    assert.equal(await inside('#stage'), true);

    assert.deepEqual(errors, []);
    console.log('PASS: one-screen layout at ' + SIZES.map(size => size.join('x')).join(', ') + '; menu, how to play, full line of six, tags, end screen, resize.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
