const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = process.env.CANTEEN_ROOT || path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch({headless:true,args:['--mute-audio'],...(process.env.BROWSER_PATH ? {executablePath:process.env.BROWSER_PATH}:{})});
  try {
    const context = await browser.newContext({offline:true, reducedMotion:'reduce'});
    const page = await context.newPage();
    const errors=[],remote=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    page.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
    const click=id=>page.locator('#'+id).click();
    const text=id=>page.locator('#'+id).innerText();
    const audio=()=>page.evaluate(()=>{const a=document.querySelector('#character-audio');return {src:a.getAttribute('src'),paused:a.paused};});
    const playing=async file=>page.waitForFunction(file=>{const a=document.querySelector('#character-audio');return a.src.endsWith('/'+file+'.mp3')&&!a.paused&&a.currentTime>0;},file);
    for(const width of [1280,375]) {
      await page.setViewportSize({width,height:900});
      await page.goto(pathToFileURL(path.join(root,'index.html')).href);
      assert.deepEqual(await audio(),{src:null,paused:true});
      assert.equal(await text('lunch-count'),'0');
      assert.equal(await page.locator('#lunch-empty').isVisible(),true);
      await click('serve-student');
      assert.equal(await page.locator('#lunch-guests li').count(),0);
      await click('add-student'); await playing('reden');
      const generation=await page.evaluate(()=>audioPlaybackId);
      for(let i=0;i<4;i++)await click('add-student');
      assert.equal(await page.evaluate(()=>audioPlaybackId),generation,'adding behind front must not interrupt');
      assert.equal((await audio()).src,'assets/audio/reden.mp3');
      await page.evaluate(()=>{peekCustomer();updateDisplay();updateDisplay();});
      assert.equal(await page.evaluate(()=>audioPlaybackId),generation,'peek/render must not replay');
      const names=['Reden','Baron','Busseng','Insan','Neneng B'];
      const files=['reden','baron','busseng','insan','neneng-b'];
      for(let i=0;i<5;i++) {
        await playing(files[i]);
        assert.equal(await text('next-student'),names[i]+' #'+(i+1));
        await click('serve-student');
        assert.deepEqual(await page.locator('.lunch-guest-name').allTextContents(),names.slice(0,i+1).map((n,j)=>n+' #'+(j+1)));
        assert.equal(await text('lunch-count'),String(i+1));
        assert.equal(await text('served-count'),String(i+1));
      }
      assert.deepEqual(await audio(),{src:null,paused:true});
      assert.equal(await page.locator('#lunch-empty').isVisible(),false);
      assert.equal(await page.locator('.lunch-seat .student-portrait').first().evaluate(e=>getComputedStyle(e).animationName),'none');
      await page.locator('#lunch-section').screenshot({path:path.join(root,'docs/screenshots',`lunch-table-${width}.png`)});
      await click('add-student'); await playing('reden');
      await page.locator('#sound-enabled').uncheck();
      assert.deepEqual(await audio(),{src:null,paused:true});
      await click('add-student');
      await click('serve-student'); // Baron is now front, silently.
      assert.deepEqual(await audio(),{src:null,paused:true});
      await page.locator('#sound-enabled').check(); await playing('baron');
      await click('reset-game');
      assert.equal(await page.locator('#lunch-guests li').count(),0);
      assert.equal(await text('lunch-count'),'0');
      assert.equal(await page.locator('#lunch-empty').isVisible(),true);
      assert.deepEqual(await audio(),{src:null,paused:true});
      for(let i=0;i<12;i++)await click('add-student');
      await playing('reden');
      for(let i=0;i<10;i++)await click('serve-student');
      assert.equal(await page.locator('#lunch-guests li').count(),10);
      assert.equal(await text('waiting-count'),'2');
      assert.deepEqual(await audio(),{src:null,paused:true},'completion must stop speaking even with a queue remaining');
      await page.evaluate(()=>{$('#serve-student').trigger('click');$('#add-student').trigger('click');});
      assert.equal(await page.locator('#lunch-guests li').count(),10);
      assert.deepEqual(await audio(),{src:null,paused:true});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:path.join(root,'docs/screenshots',`lunch-complete-${width}.png`),fullPage:true});
      await click('reset-game');
      // Rapid clicks resolve to the current front and leave no stale playback errors.
      await click('add-student');
      await page.evaluate(()=>{for(let i=0;i<4;i++)$('#add-student').trigger('click');for(let i=0;i<3;i++)$('#serve-student').trigger('click');});
      await playing('insan');
      assert.equal(await text('lunch-count'),'3');
      await page.evaluate(()=>{document.querySelector('#character-audio').play=()=>Promise.reject(new DOMException('Test blocked playback','NotAllowedError'));});
      await click('serve-student');
      await page.waitForFunction(()=>document.querySelector('#sound-status').textContent.includes('Audio could not play'));
      assert.equal(await text('lunch-count'),'4');
      assert.equal(await text('next-student'),'Neneng B #5');
      await page.reload();
      assert.equal(await text('lunch-count'),'0');
      assert.deepEqual(await audio(),{src:null,paused:true});
      console.log(`PASS ${width}px: front-only real audio, no rear interruption, serving transitions, mute/resume, reset, completion, ten seated students, rapid clicks and failure isolation`);
    }
    assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
