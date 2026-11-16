const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

// Gameplay and queue checks. Run with Playwright installed: node tests/offline.cjs
// Set BROWSER_PATH if a system Chromium browser should be used.
const root = process.env.CANTEEN_ROOT || path.resolve(__dirname, '..');
const output = path.join(root, 'docs', 'screenshots');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
  try {
    const context = await browser.newContext({ offline: true, viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    const errors = [];
    const remoteRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', request => { if (/^https?:/.test(request.url())) remoteRequests.push(request.url()); });

    const text = id => page.locator('#' + id).innerText();
    const state = () => page.evaluate(() => ({
      numbers: queue.map(c => c.number), served: servedCount, angry: angryCount,
      shift: shiftState, reason: lostReason, next: nextQueueNumber }));
    // Students on screen, sorted left to right (FRONT first).
    const lineOnScreen = () => page.evaluate(() => $('#line .student[id]').get()
      .sort((a, b) => parseFloat(a.style.left) - parseFloat(b.style.left))
      .map(el => Number(el.dataset.number)));
    const frontOrder = () => page.evaluate(() => peekCustomer().order);
    const wrongOrder = () => page.evaluate(() => FOODS.find(f => f.id !== peekCustomer().order).id);
    const freeCounter = () => page.evaluate(() => { counterBusy = false; updateDisplay(); });
    const serveFrontCorrectly = async () => {
      await freeCounter();
      await page.locator(`[data-food="${await frontOrder()}"]`).click();
    };
    // Opens a shift with the clock stopped, so the test controls every arrival.
    const openShift = async mode => {
      await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
      await page.waitForFunction(() => typeof jQuery === 'function' && typeof SPRITES.siomai === 'string');
      await page.locator('#screen-menu .sound-toggle').click();          // sound off
      await page.locator(`.mode-button[data-mode="${mode}"]`).click();
      await page.locator('#start-shift').click();
      assert.equal(await page.locator('#screen-howto').isVisible(), true); // tutorial before first shift
      await page.locator('#howto-close').click();
      await page.evaluate(() => stopClock());
    };

    // ---------- Menu and assets ----------
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
    await page.waitForFunction(() => typeof jQuery === 'function' && typeof SPRITES.siomai === 'string');
    assert.equal(await page.locator('#screen-menu').isVisible(), true);
    assert.equal(await page.locator('.food-button').count(), 4);
    assert.deepEqual(await page.locator('.food-button-name').allTextContents(),
      ['Siomai Rice', 'Chicken Adobo', 'Pancit Canton', "Sago't Gulaman"]);
    assert.equal(await page.locator('.food-button').first().isDisabled(), true);
    assert.equal(await page.locator('img').evaluateAll(imgs => imgs.every(img => img.hidden || (img.complete && img.naturalWidth > 0))), true);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.dialog-buttons')).display), 'flex'); // Bootstrap utility
    assert.equal(await page.evaluate(() => serveFood('siomai')), 'closed');
    await page.screenshot({ path: path.join(output, 'menu.png') });
    await page.locator('#open-howto').click();
    await page.screenshot({ path: path.join(output, 'how-to-play.png') });
    await page.locator('#howto-close').click();
    assert.equal(await page.locator('#screen-menu').isVisible(), true);

    // ---------- Enqueue, arrival order, peek ----------
    await openShift('normal');
    assert.deepEqual((await state()).numbers, [1]);            // first student walks in right away
    assert.equal(await text('mode-label'), 'Normal');
    for (let i = 0; i < 3; i++) await page.evaluate(() => { handleArrival(); });
    assert.deepEqual((await state()).numbers, [1, 2, 3, 4]);   // unique numbers, arrival order
    await page.waitForTimeout(750);
    assert.deepEqual(await lineOnScreen(), [1, 2, 3, 4]);      // drawn in the same order
    assert.equal(await text('waiting-count'), '4');
    assert.equal(await text('next-student'), 'Reden #1');
    assert.equal(await page.locator('#tag-front').isVisible(), true);
    assert.equal(await page.locator('#tag-rear').isVisible(), true);
    assert.equal(await page.evaluate(() => peekCustomer() === peekCustomer() && queue.length), 4); // peek removes nobody
    const wanted = await page.evaluate(() => foodName(peekCustomer().order));
    assert.equal(await text('next-order'), 'Wants: ' + wanted);
    assert.equal((await text('order-text')).includes(wanted), true);
    await page.screenshot({ path: path.join(output, 'playing.png') });

    // ---------- Wrong food: nobody leaves ----------
    await page.locator(`[data-food="${await wrongOrder()}"]`).click();
    let s = await state();
    assert.deepEqual(s.numbers, [1, 2, 3, 4]);
    assert.equal(s.served, 0);
    assert.equal(await page.evaluate(() => peekCustomer().annoyed), true);
    assert.match(await text('feedback-message'), /^Wrong food! Reden #1 wants /);
    await page.screenshot({ path: path.join(output, 'wrong-food.png') });

    // ---------- FIFO: only the front student is served ----------
    await serveFrontCorrectly();
    s = await state();
    assert.deepEqual(s.numbers, [2, 3, 4]);
    assert.equal(s.served, 1);
    assert.equal(await text('served-count'), '1');
    assert.equal(await text('next-student'), 'Baron #2');
    assert.match(await text('feedback-message'), /^Served Reden #1\./);
    // While the meal is handed over the counter is busy and extra taps do nothing.
    assert.equal(await page.locator('.food-button').first().isDisabled(), true);
    assert.equal(await page.evaluate(() => serveFood(peekCustomer().order)), 'busy');
    assert.equal((await state()).served, 1);
    await page.waitForTimeout(1300);
    assert.equal(await page.locator('.food-button').first().isEnabled(), true);

    // ---------- Empty queue guard ----------
    for (let i = 0; i < 3; i++) await serveFrontCorrectly();
    await freeCounter();
    s = await state();
    assert.deepEqual(s.numbers, []);
    assert.equal(s.served, 4);
    await page.locator('.food-button').first().click();
    assert.equal(await text('feedback-message'), 'No students waiting. Nobody to serve yet.');
    assert.equal((await state()).served, 4);
    assert.equal(await text('next-student'), 'None');
    assert.equal(await page.evaluate(() => dequeueCustomer()), null);
    assert.equal(await page.evaluate(() => peekCustomer()), null);

    // ---------- Patience: only the front student drains, and walks out at zero ----------
    for (let i = 0; i < 2; i++) await page.evaluate(() => { handleArrival(); });
    const before = await page.evaluate(() => queue.map(c => c.patience));
    await page.evaluate(() => { arrivalClock = 0; gameTick(); });
    const after = await page.evaluate(() => queue.map(c => c.patience));
    assert.equal(after[0], before[0] - 100);
    assert.equal(after[1], before[1]);
    await page.evaluate(() => { peekCustomer().patience = 50; arrivalClock = 0; gameTick(); });
    s = await state();
    assert.deepEqual(s.numbers, [6]);
    assert.equal(s.angry, 1);
    assert.equal(s.served, 4);
    assert.equal(await text('angry-count'), '1');
    assert.match(await text('feedback-message'), /^Neneng B #5 waited too long and walked out\.$/);

    // ---------- Lose: three walk-outs ----------
    await page.evaluate(() => { handleArrival(); });
    for (let i = 0; i < 2; i++) await page.evaluate(() => { peekCustomer().patience = 50; arrivalClock = 0; gameTick(); });
    s = await state();
    assert.equal(s.angry, 3);
    assert.equal(s.shift, 'lost');
    assert.equal(s.reason, 'angry');
    assert.equal(await page.evaluate(() => enqueueCustomer()), null);   // closed shift takes no arrivals
    await page.locator('#screen-end').waitFor({ state: 'visible' });
    assert.equal(await text('end-title'), 'Shift over...');
    assert.equal(await text('end-served'), '4/10');
    assert.equal(await text('end-angry'), '3/3');
    await page.screenshot({ path: path.join(output, 'shift-over.png') });

    // ---------- Play again resets everything ----------
    await page.locator('#play-again').click();
    await page.evaluate(() => stopClock());
    s = await state();
    assert.deepEqual(s.numbers, [1]);
    assert.deepEqual([s.served, s.angry, s.shift, s.next], [0, 0, 'playing', 2]);
    assert.equal(await page.locator('#screen-end').isVisible(), false);
    assert.equal(await text('served-count'), '0');
    assert.equal(await text('angry-count'), '0');

    // ---------- Lose: a 7th student finds the line full ----------
    for (let i = 0; i < 5; i++) await page.evaluate(() => { handleArrival(); });
    s = await state();
    assert.deepEqual(s.numbers, [1, 2, 3, 4, 5, 6]);
    assert.equal(s.shift, 'playing');
    assert.equal(await text('waiting-count'), '6');
    await page.evaluate(() => { handleArrival(); });
    s = await state();
    assert.deepEqual(s.numbers, [1, 2, 3, 4, 5, 6]);
    assert.deepEqual([s.shift, s.reason], ['lost', 'line']);
    await page.locator('#screen-end').waitFor({ state: 'visible' });
    assert.match(await text('end-reason'), /line was already full/);

    // ---------- Win: ten students served ----------
    await page.locator('#play-again').click();
    await page.evaluate(() => stopClock());
    for (let i = 0; i < 10; i++) {
      if ((await state()).numbers.length === 0) await page.evaluate(() => { handleArrival(); });
      assert.equal((await state()).shift, 'playing');
      const front = (await state()).numbers[0];
      await serveFrontCorrectly();
      assert.equal((await state()).numbers.includes(front), false);
    }
    s = await state();
    assert.deepEqual([s.served, s.shift], [10, 'won']);
    assert.equal(await page.evaluate(() => { counterBusy = false; return serveFood('siomai'); }), 'closed');
    await page.locator('#screen-end').waitFor({ state: 'visible' });
    assert.equal(await text('end-title'), 'Shift complete!');
    assert.equal(await text('end-served'), '10/10');
    assert.equal(await page.locator('.food-button').first().isDisabled(), true);
    await page.screenshot({ path: path.join(output, 'shift-complete.png') });

    // ---------- Back to menu resets ----------
    await page.locator('#back-to-menu').click();
    s = await state();
    assert.deepEqual([s.numbers.length, s.served, s.angry, s.shift, s.next], [0, 0, 0, 'menu', 1]);
    assert.equal(await page.locator('#screen-menu').isVisible(), true);
    assert.equal(await page.locator('#line .student').count(), 0);
    assert.equal(await text('feedback-message'), '');

    // ---------- The real clock: students arrive on their own, keys serve ----------
    await page.locator('#start-shift').click();              // tutorial already seen: starts at once
    assert.equal(await page.locator('#screen-howto').isVisible(), false);
    await page.waitForFunction(() => queue.length >= 3, null, { timeout: 4000 }); // opening rush
    const key = await page.evaluate(() => String(FOODS.findIndex(f => f.id === peekCustomer().order) + 1));
    await page.keyboard.press(key);
    assert.equal((await state()).served, 1);
    await page.locator('#reset-game').click();

    // ---------- Modes ----------
    assert.deepEqual(await page.evaluate(() => [MODES.easy, MODES.normal, MODES.hard]
      .map(m => [m.arrivalMs, m.patienceMs, m.wrongPenalty])),
      [[4000, 14000, 1.5], [3000, 10000, 2], [2000, 7000, 2.5]]);
    await page.locator('.mode-button[data-mode="hard"]').click();
    await page.locator('#start-shift').click();
    assert.equal(await text('mode-label'), 'Hard');
    assert.equal(await page.evaluate(() => peekCustomer().patience <= 7000), true);

    assert.deepEqual(errors, []);
    assert.deepEqual(remoteRequests, []);
    console.log('PASS: menu, tutorial, enqueue, arrival order, peek, wrong food, FIFO serve, busy counter, empty guard, patience, walk-outs, both lose conditions, win at 10, restart, menu reset, live clock, keyboard, modes, offline.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
