const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

// Run with Playwright installed: node tests/offline.cjs
// Set BROWSER_PATH if a system Chromium browser should be used.
const root = process.env.CANTEEN_ROOT || path.resolve(__dirname, '..');
const output = path.join(root, 'docs', 'screenshots');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
  try {
    const context = await browser.newContext({ offline: true });
    const page = await context.newPage();
    const errors = [];
    const remoteRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', request => { if (/^https?:/.test(request.url())) remoteRequests.push(request.url()); });
    const text = id => page.locator('#' + id).innerText();
    const click = id => page.locator('#' + id).click();
    const assertInitial = async () => {
      assert.equal(await page.locator('#waiting-line li').count(), 0);
      assert.equal(await text('waiting-count'), '0');
      assert.equal(await text('served-count'), '0');
      assert.equal(await text('next-student'), 'None');
      assert.equal(await text('last-served'), 'None');
      assert.equal(await text('feedback-message'), '');
      assert.equal(await page.locator('#add-student').isEnabled(), true);
      assert.equal(await page.locator('#serve-student').isEnabled(), true);
    };
    for (const width of [1280, 375]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
      await page.waitForFunction(() => typeof jQuery === 'function');
      await assertInitial();
      assert.equal(await page.locator('#waiting-empty').isVisible(), true);
      assert.equal(await page.locator('#served-portrait').isVisible(), false);
      assert.equal(await page.locator('img').evaluateAll(imgs => imgs.every(img => img.complete && img.naturalWidth > 0)), true);
      assert.equal(await page.evaluate(() => new Promise(resolve => {
        const image = new Image(); image.onload = () => resolve(image.naturalWidth > 0);
        image.onerror = () => resolve(false); image.src = 'assets/student-portraits.png';
      })), true);
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#add-student')).getPropertyValue('--bs-btn-bg').trim().length > 0), true);
      await click('serve-student');
      assert.equal(await text('feedback-message'), 'No students waiting. Add a student first.');
      assert.equal(await text('served-count'), '0');
      for (let i = 0; i < 4; i++) await click('add-student');
      assert.deepEqual(await page.locator('#waiting-line .student-number').allTextContents(),
        ['Student #1', 'Student #2', 'Student #3', 'Student #4']);
      assert.equal(await text('next-student'), '#1');
      assert.deepEqual(await page.locator('#waiting-line .student-mood').allTextContents(),
        ['May saging kayo?', 'Nasaan ang sabaw?!', 'Walang kanen busseng??', 'Awake in spirit. Hungry in person.']);
      assert.deepEqual(await page.evaluate(async () => Promise.all(
        ['member-1-meme.jpg', 'member-2-meme.jpg', 'member-3-meme.png'].map(file =>
          new Promise(resolve => {
            const image = new Image(); image.onload = () => resolve(image.naturalWidth > 0);
            image.onerror = () => resolve(false); image.src = 'assets/' + file;
          }))
      )), [true, true, true]);
      for (let i = 0; i < 3; i++) {
        const background = await page.locator('#waiting-line .student-portrait').nth(i)
          .evaluate(element => getComputedStyle(element).backgroundImage);
        assert.ok(background.includes('member-' + (i + 1) + '-meme.'));
      }
      await page.screenshot({ path: path.join(output, `meme-line-${width}.png`), fullPage: true });
      assert.equal(await page.locator('#waiting-empty').isVisible(), false);
      assert.equal(await page.locator('#waiting-line .student-portrait').count(), 4);
      assert.equal(await text('waiting-count'), '4');
      assert.deepEqual(await page.evaluate(() => {
        const before = JSON.stringify(queue);
        const first = peekCustomer().number;
        const second = peekCustomer().number;
        return [first, second, before === JSON.stringify(queue)];
      }), [1, 1, true]);
      await click('serve-student');
      assert.equal(await text('last-served'), '#1');
      assert.equal(await text('served-joke'), 'May saging kayo?');
      assert.equal(await page.locator('#served-portrait').isVisible(), true);
      assert.match(await page.locator('#served-portrait').getAttribute('class'), /portrait-0/);
      assert.equal(await text('next-student'), '#2');
      assert.equal(await text('waiting-count'), '3');
      assert.equal(await text('served-count'), '1');
      await click('add-student');
      assert.deepEqual(await page.locator('#waiting-line .student-number').allTextContents(),
        ['Student #2', 'Student #3', 'Student #4', 'Student #5']);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: path.join(output, `playing-${width}.png`), fullPage: true });
      await click('reset-game');
      await assertInitial();
      await click('add-student');
      assert.equal(await text('next-student'), '#1');
      await click('serve-student');
      await click('serve-student');
      assert.equal(await text('last-served'), '#1');
      assert.equal(await text('served-count'), '1');
      assert.equal(await text('waiting-count'), '0');
      await click('reset-game');
      for (let i = 0; i < 12; i++) await click('add-student');
      for (let i = 1; i <= 10; i++) {
        await click('serve-student');
        assert.equal(await text('last-served'), '#' + i);
        assert.equal(await text('served-count'), String(i));
      }
      assert.equal(await text('waiting-count'), '2');
      assert.equal(await text('next-student'), '#11');
      assert.match(await text('feedback-message'), /^Success!/);
      assert.equal(await page.locator('#add-student').isDisabled(), true);
      assert.equal(await page.locator('#serve-student').isDisabled(), true);
      assert.equal(await page.evaluate(() => {
        const before = JSON.stringify([queue, nextQueueNumber, servedCount]);
        const add = enqueueCustomer();
        const serve = dequeueCustomer();
        return add === null && serve === null &&
          before === JSON.stringify([queue, nextQueueNumber, servedCount]);
      }), true);
      if (width === 1280) await page.screenshot({ path: path.join(output, 'success.png'), fullPage: true });
      await click('reset-game');
      await assertInitial();
      await click('reset-game');
      await assertInitial();
      await click('add-student');
      await page.reload();
      await assertInitial();
      console.log(`PASS: offline ${width}px — FIFO, peek, counts, empty queue, completion, reset, refresh`);
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(remoteRequests, []);
    console.log('PASS: no browser errors or HTTP requests; local Bootstrap and jQuery loaded.');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
