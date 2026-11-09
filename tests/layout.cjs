const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

// Checks for the redesigned interface (Front/Back tags, progress bar, success state,
// phone layout, keyboard use, reduced motion, no distortion, no remote files).
// Run with Playwright installed: node tests/layout.cjs
// Set BROWSER_PATH if a system Chromium browser should be used.
const root = process.env.CANTEEN_ROOT || path.resolve(__dirname, '..');
const url = pathToFileURL(path.join(root, 'index.html')).href;

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--mute-audio'],
    ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
  try {
    const context = await browser.newContext({ offline: true });
    const page = await context.newPage();
    const errors = [];
    const remote = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('request', r => { if (/^https?:/.test(r.url())) remote.push(r.url()); });

    const text = id => page.locator('#' + id).innerText();
    const click = id => page.locator('#' + id).click();
    const open = async (width, height) => {
      await page.setViewportSize({ width, height });
      await page.goto(url);
      await page.locator('#sound-enabled').uncheck();
      await page.evaluate(() => window.scrollTo(0, 0));
    };
    const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    const progress = () => page.evaluate(() => {
      const track = document.getElementById('served-progress-track');
      return [track.getAttribute('aria-valuenow'), track.getAttribute('aria-valuemax'),
        document.getElementById('served-progress-bar').style.width];
    });

    // ---- Every width: no sideways page scrolling in any state, queue + controls reachable
    for (const [width, height] of [[1280, 900], [768, 900], [390, 844], [360, 640], [320, 640]]) {
      await open(width, height);
      assert.equal(await noOverflow(), true, `empty @${width}`);

      // Empty states
      assert.equal(await page.locator('#waiting-empty').isVisible(), true);
      assert.equal(await page.locator('#waiting-line').isVisible(), false);
      assert.equal(await page.locator('#peek-placeholder').isVisible(), true);
      assert.equal(await page.locator('#served-placeholder').isVisible(), true);
      assert.equal(await page.locator('#success-banner').isVisible(), false);
      assert.deepEqual(await progress(), ['0', '10', '0%']);
      assert.match(await page.locator('#progress-caption').innerText(), /Serve 10 students/);
      assert.match(await page.evaluate(() => getComputedStyle(document.getElementById('feedback-message'), '::before').content),
        /Add Student/);
      for (const id of ['add-student', 'serve-student', 'reset-game']) {
        assert.equal(await page.locator('#' + id).isVisible(), true);
      }

      // Invalid action: amber feedback, nothing changes
      await click('serve-student');
      assert.equal(await text('feedback-message'), 'No students waiting. Add a student first.');
      assert.match(await page.locator('#feedback-message').getAttribute('class'), /feedback-warn/);
      assert.equal(await text('served-count'), '0');

      // One student is both Front and Back
      await click('add-student');
      assert.match(await page.locator('#feedback-message').getAttribute('class'), /feedback-ok/);
      assert.deepEqual(await page.locator('#waiting-line .position-tag').allTextContents(), ['Front', 'Back']);
      assert.equal(await page.locator('#waiting-line li').first().evaluate(e => e.classList.contains('is-front') && e.classList.contains('is-back')), true);
      assert.equal(await page.locator('#peek-placeholder').isVisible(), false);

      // Three students: Front only on the first, Back only on the last, nothing in the middle
      await click('add-student');
      await click('add-student');
      const tagsPerCard = () => page.locator('#waiting-line li').evaluateAll(
        cards => cards.map(c => [...c.querySelectorAll('.position-tag')].map(t => t.textContent).join('+')));
      assert.deepEqual(await tagsPerCard(), ['Front', '', 'Back']);

      // Serving moves the FRONT tag to the next student and updates progress
      await click('serve-student');
      assert.deepEqual(await tagsPerCard(), ['Front', 'Back']);
      assert.equal(await page.locator('#waiting-line .student-number').first().innerText(), 'Student #2');
      assert.deepEqual(await progress(), ['1', '10', '10%']);
      assert.equal(await text('progress-caption'), '9 more to go!');
      assert.equal(await noOverflow(), true, `active @${width}`);

      // Phones: the front of the line and the pinned controls are on the same first screen
      if (width <= 390) {
        const dock = await page.locator('#controls').boundingBox();
        assert.equal(await page.locator('#controls').evaluate(e => getComputedStyle(e).position), 'fixed');
        assert.ok(Math.abs(dock.y + dock.height - height) <= 1, 'controls pinned to bottom');
        const card = await page.locator('#waiting-line li').first().boundingBox();
        // 320px-wide phones are the known limit: the controls bar is pinned and usable there,
        // but only the top of the front card fits above it on a 640px-tall screen.
        if (width >= 360) assert.ok(card.y >= 0 && card.y + 100 < dock.y, `front card visible above controls @${width}x${height}`);
        if (height >= 800) assert.ok(card.y + card.height <= dock.y, 'whole front card visible');
      } else if (width >= 992) {
        assert.equal(await page.locator('#controls').evaluate(e => getComputedStyle(e).position), 'static');
        const controls = await page.locator('#controls').boundingBox();
        const lane = await page.locator('#waiting-section').boundingBox();
        assert.ok(controls.y < height && controls.x > lane.x + lane.width - 5, 'controls beside the line, on screen');
      }

      // Completion
      await click('reset-game');
      for (let i = 0; i < 12; i++) await click('add-student');
      for (let i = 0; i < 10; i++) await click('serve-student');
      assert.equal(await page.locator('#success-banner').isVisible(), true);
      assert.equal(await page.locator('#progress-section').evaluate(e => e.classList.contains('is-complete')), true);
      assert.deepEqual(await progress(), ['10', '10', '100%']);
      assert.equal(await text('progress-caption'), 'Lunch rush complete!');
      assert.equal(await page.locator('#add-student').isDisabled(), true);
      assert.equal(await page.locator('#serve-student').isDisabled(), true);
      assert.equal(await noOverflow(), true, `complete @${width}`);

      // Reset clears the success state as well
      await click('reset-game');
      assert.equal(await page.locator('#success-banner').isVisible(), false);
      assert.equal(await page.locator('#progress-section').evaluate(e => e.classList.contains('is-complete')), false);
      assert.deepEqual(await progress(), ['0', '10', '0%']);
      assert.equal(await text('feedback-message'), '');
      console.log(`PASS layout ${width}x${height}: empty/active/complete states, Front/Back tags, progress, placement`);
    }

    // ---- Long line: scrolls sideways, hint appears, Add shows the Back, Serve returns to the Front
    const reduced = await browser.newContext({ offline: true, reducedMotion: 'reduce' });
    const slow = await reduced.newPage();
    await slow.setViewportSize({ width: 375, height: 812 });
    await slow.goto(url);
    await slow.locator('#sound-enabled').uncheck();
    for (let i = 0; i < 14; i++) await slow.locator('#add-student').click();
    const lane = () => slow.locator('#waiting-line').evaluate(e => [e.scrollLeft, e.scrollWidth, e.clientWidth]);
    let [left, scrollW, clientW] = await lane();
    assert.ok(scrollW > clientW, 'long line overflows sideways inside its own box');
    assert.ok(left > 0, 'Add scrolled the new Back student into view');
    assert.equal(await slow.locator('#lane-hint').isVisible(), true);
    assert.equal(await slow.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await slow.locator('#serve-student').click();
    [left] = await lane();
    assert.equal(left, 0, 'Serve scrolled back to the Front');
    assert.equal(await slow.locator('#waiting-line .student-number').first().innerText(), 'Student #2');
    // Reduced motion: no pop-in animation on the newest card
    assert.equal(await slow.locator('#waiting-line li').last().evaluate(e => getComputedStyle(e).animationName), 'none');
    await slow.locator('#reset-game').click();
    assert.equal(await slow.locator('#lane-hint').isVisible(), false);
    await reduced.close();

    // ...and with motion allowed the newest card does animate
    await open(1280, 900);
    await click('add-student');
    assert.equal(await page.locator('#waiting-line li').last().evaluate(e => getComputedStyle(e).animationName), 'card-pop');
    console.log('PASS long line: sideways scroll, hint, scroll to Back on Add / Front on Serve, reduced motion');

    // ---- Keyboard: skip link, Tab order, Space/Enter on buttons, visible focus
    // Fresh load (no toggle click first) so the first Tab starts at the top of the page.
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(url);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.className.includes('skip-link')), true);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'add-student');
    await page.keyboard.press('Space');
    assert.equal(await text('waiting-count'), '1');
    await page.keyboard.press('Enter');          // Add is still focused
    assert.equal(await text('waiting-count'), '2');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'serve-student');
    const focus = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement);
      return [s.outlineStyle, parseFloat(s.outlineWidth)];
    });
    assert.deepEqual(focus, ['solid', 3], 'visible focus ring');
    await page.keyboard.press('Space');
    assert.equal(await text('served-count'), '1');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'reset-game');
    await page.keyboard.press('Enter');
    assert.equal(await text('waiting-count'), '0');
    // A scrollable long line can be reached by keyboard (arrow keys scroll it)
    await click('add-student');
    assert.equal(await page.locator('#waiting-line').getAttribute('tabindex'), '0');
    console.log('PASS keyboard: skip link, Tab order, Space/Enter, visible focus');

    // ---- Pictures are never stretched or cropped
    await open(1280, 900);
    for (let i = 0; i < 5; i++) await click('add-student');
    const sizes = await page.evaluate(() => [...document.querySelectorAll('.student-portrait')].map(e => {
      const s = getComputedStyle(e);
      return [s.backgroundSize, s.backgroundRepeat];
    }));
    assert.ok(sizes.length >= 6 && sizes.every(([size, repeat]) => size === 'contain' && repeat === 'no-repeat'));
    const imageRatios = await page.evaluate(() => [...document.querySelectorAll('img')].map(img => ({
      natural: img.naturalWidth / img.naturalHeight,
      shown: img.getBoundingClientRect().width / img.getBoundingClientRect().height,
      fit: getComputedStyle(img).objectFit })));
    assert.ok(imageRatios.length === 2 && imageRatios.every(i => Math.abs(i.natural - i.shown) < 0.02 && i.fit === 'contain'));
    console.log('PASS pictures: background-size contain on every portrait; mascots keep their aspect ratio');

    // ---- Offline: no remote files referenced anywhere in the source
    for (const file of ['index.html', 'css/style.css', 'js/game.js']) {
      const source = fs.readFileSync(path.join(root, file), 'utf8').replace(/http:\/\/www\.w3\.org\/2000\/svg/g, '');
      assert.equal(/https?:\/\//.test(source), false, `${file} has a remote URL`);
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(remote, []);
    console.log('PASS: no remote URLs in the source, no browser errors, no HTTP requests.');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
