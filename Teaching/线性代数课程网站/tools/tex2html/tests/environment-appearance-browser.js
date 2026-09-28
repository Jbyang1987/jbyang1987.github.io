/* Uses an isolated browser workspace; never changes the user's saved data. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),C=require('../core'),{chromium}=require('playwright'),{createServer}=require('../server');
async function main(){
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const tex=String.raw`\begin{frame}{环境配色}`+Object.keys(C.labels).map(name=>String.raw`\begin{${name}}[线性运算]正文 $a+b$.\end{${name}}`).join('\n')+String.raw`\end{frame}`;
  await page.route('**/api/lecture-manifest',r=>r.fulfill({json:{sections:['sections/01 vectors.tex'],style:'theme.sty',pictures:[]}}));
  await page.route('**/api/lecture-file?*',r=>r.fulfill({body:new URL(r.request().url()).searchParams.get('path').endsWith('.tex')?tex:'',contentType:'text/plain; charset=utf-8'}));
  await page.goto((process.env.TEX2HTML_BROWSER_BASE||'http://127.0.0.1:'+server.address().port)+'/tools/tex2html/');await page.waitForFunction(()=>document.querySelectorAll('.math-block').length===11);
  await page.waitForFunction(async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('tex2html-workspace');r.onsuccess=()=>resolve(r.result);});const value=await new Promise(resolve=>{const r=db.transaction('workspaces').objectStore('workspaces').get('current');r.onsuccess=()=>resolve(r.result);});db.close();return value?.config?.environmentPaletteVersion===1;});
  // Recreate saved legacy settings, page overrides, numbering and custom CSS.
  await page.evaluate(async()=>{
   const db=await new Promise(resolve=>{const r=indexedDB.open('tex2html-workspace');r.onsuccess=()=>resolve(r.result);});const saved=await new Promise(resolve=>{const r=db.transaction('workspaces').objectStore('workspaces').get('current');r.onsuccess=()=>resolve(r.result);});
   delete saved.config.environmentPaletteVersion;for(const env of Object.values(saved.config.environments))Object.assign(env,{light:'#000000',dark:'#ffffff',background:'#ffffff',darkBackground:'#000000',border:'#000000',darkBorder:'#ffffff',numbered:true});
   saved.model.pages[0].rules={environments:{definition:{light:'#000000',dark:'#ffffff',numbered:true}}};saved.model.pages[0].title='保留旧页面编排';saved.model.layoutEdited=true;
   for(const b of saved.model.pages[0].blocks)if(b.environment)b.number='9.99';saved.cssText='.user-note{padding:7px}\n.tex-converted .math-block-heading{color:black!important}\n.tex-converted .math-block{background:white!important}';
   await new Promise((resolve,reject)=>{const tx=db.transaction('workspaces','readwrite');tx.objectStore('workspaces').put(saved,'current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();
  });
  await page.reload();await page.waitForFunction(()=>document.querySelector('.preview-heading h2')?.textContent==='保留旧页面编排');
  assert.equal(await page.locator('.math-block-number').count(),0);assert.doesNotMatch(await page.locator('#output').innerText(),/9\.99/);
  for(const theme of ['light','dark']){
   await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
   const appearances=await page.locator('.math-block').evaluateAll(blocks=>blocks.map(el=>({color:getComputedStyle(el.querySelector('.math-block-heading')).color,background:getComputedStyle(el).backgroundColor,proof:el.classList.contains('math-block-proof'),borders:['Top','Right','Bottom','Left'].map(side=>getComputedStyle(el)['border'+side+'Width'])})));
   assert.equal(new Set(appearances.map(e=>e.color)).size,11);assert.equal(new Set(appearances.map(e=>e.background)).size,11);
   for(const e of appearances)assert.deepEqual(e.borders,e.proof?['0px','0px','0px','2px']:['1px','1px','1px','1px']);
   fs.mkdirSync('work/tex2html-environment-appearance',{recursive:true});await page.locator('#output').screenshot({path:'work/tex2html-environment-appearance/'+theme+'.png'});
  }
  await page.locator('[data-view="css"]').click();assert.match(await page.locator('#css-editor').inputValue(),/\.user-note\{padding:7px\}/);
  await page.locator('[data-rule-tab="styles"]').evaluate(el=>el.click());assert.equal(await page.locator('[data-config$=".numbered"]').count(),0);
  const picker=page.locator('[data-config="environments.theorem.light"]');await picker.evaluate(el=>{el.value='#123456';el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('#convert-all').click();await page.locator('[data-view="preview"]').click();await page.reload();await page.waitForFunction(()=>document.querySelector('.math-block-theorem'));
  await page.evaluate(()=>document.documentElement.dataset.theme='light');assert.equal(await page.locator('.math-block-theorem .math-block-heading').evaluate(el=>getComputedStyle(el).color),'rgb(18, 52, 86)');
  assert.equal(await page.locator('.math-block-number').count(),0);await page.locator('.math-block-definition').dblclick();assert.match(await page.locator('#tex-input').evaluate(el=>el.value.slice(el.selectionStart,el.selectionEnd)),/begin\{definition\}/);
  assert.deepEqual(errors,[]);console.log('Passed: 11 distinct light/dark palettes, legacy workspace/page/CSS migration, no environment numbers, frames retained, custom colors persist, source navigation.');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
