/* Real Edge and local LaTeX check in a fresh browser context. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright'),{createServer}=require('../server'),table=require('./table-fixture');
async function main(){
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  const base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  // Keep compiler requests on this isolated server instead of the user's 4174 instance.
  await context.addInitScript(base=>{const defaults=window.fetch;window.fetch=(url,options)=>defaults(typeof url==='string'?url.replace('http://127.0.0.1:4174',base):url,options);},base);
  const source=String.raw`\begin{frame}{排版检查}
\[\begin{pmatrix}0 & & 1\\ & \iddots & \\1 & & 0\end{pmatrix}\]
\begin{example}[线性运算]例题正文。\end{example}
`+table+String.raw`
\end{frame}`;
  await page.route('**/api/lecture-manifest',route=>route.fulfill({json:{sections:['sections/00 introduction.tex'],style:'theme.sty',pictures:[]}}));
  await page.route('**/api/lecture-file?*',route=>route.fulfill({body:new URL(route.request().url()).searchParams.get('path').endsWith('.tex')?source:'',contentType:'text/plain; charset=utf-8'}));
  await page.goto(base+'/tools/tex2html/');
  await page.waitForFunction(()=>document.querySelector('#stat-frames').textContent==='1');
  await page.waitForFunction(()=>document.querySelector('.tex-display mjx-container svg'));
  const math=await page.locator('.tex-display mjx-container').evaluate(el=>({errors:el.querySelectorAll('[data-mml-node="merror"],[data-mjx-error]').length,text:el.textContent,raised:[...el.querySelectorAll('[data-mml-node="mpadded"]')].map(n=>n.querySelector('[data-mml-node="mo"]')?.getBoundingClientRect().y)}));
  assert.equal(math.errors,0);assert.doesNotMatch(math.text,/iddots/);assert.equal(math.raised.length,3);assert.ok(math.raised[0]>math.raised[1]&&math.raised[1]>math.raised[2],JSON.stringify(math));
  await page.waitForFunction(()=>document.querySelector('img.tex-figure-light')?.complete&&document.querySelector('img.tex-figure-light')?.naturalWidth>0,{},{timeout:60000});
  assert.equal(await page.locator('img.tex-figure-dark').count(),1);assert.equal(await page.locator('#stat-warnings').innerText(),'0');
  await page.locator('.math-block-example').evaluate(el=>{const css=document.createElement('style');css.id='test-legacy';css.textContent='.tex-converted .math-block-example{border:0!important}';document.head.append(css);});
  // Save legacy CSS via the actual CSS editor so persistence and conversion use it.
  await page.locator('[data-view="css"]').click();const oldCSS=await page.locator('#css-editor').inputValue();
  await page.locator('#css-editor').fill(oldCSS.replace(/\n{0,2}\/\* Example frame compatibility \*\/[\s\S]*?\/\* End example frame compatibility \*\//,'')+'\n.tex-converted .math-block-example{border:0!important}\n.user-note{color:red}');
  await page.locator('#save-css').click();await page.evaluate(()=>document.querySelector('#test-legacy').remove());await page.locator('#convert-all').click();await page.locator('[data-view="preview"]').click();
  for(const dark of [false,true]){
   await page.evaluate(dark=>document.documentElement.dataset.theme=dark?'dark':'light',dark);
   const frame=await page.locator('.math-block-example').evaluate(el=>{const s=getComputedStyle(el);return {borders:['Top','Right','Bottom','Left'].map(side=>s['border'+side+'Width']),tag:el.tagName,heading:el.querySelector('legend')?.textContent};});
   assert.deepEqual(frame.borders,['1px','1px','1px','1px']);assert.equal(frame.tag,'FIELDSET');assert.match(frame.heading,/例题.*线性运算/);
  }
  await page.locator('.tex-figure img:visible').dblclick();assert.equal(await page.locator('#tex-input').evaluate(el=>el.value.slice(el.selectionStart,el.selectionEnd)),table);
  fs.mkdirSync('work/tex2html-table-example',{recursive:true});await page.screenshot({path:'work/tex2html-table-example/browser-dark.png',fullPage:true});await page.locator('.tex-figure').screenshot({path:'work/tex2html-table-example/table-dark.png'});
  await page.locator('[data-view="css"]').click();assert.match(await page.locator('#css-editor').inputValue(),/\.user-note\{color:red\}/);
  // Restore an old table block and ensure refresh upgrades it without rebuilding pages.
  await page.evaluate(async()=>{
   const db=await new Promise(resolve=>{const r=indexedDB.open('tex2html-workspace');r.onsuccess=()=>resolve(r.result);});
   const saved=await new Promise(resolve=>{const r=db.transaction('workspaces').objectStore('workspaces').get('current');r.onsuccess=()=>resolve(r.result);});
   const f=saved.model.pages[0].blocks.find(b=>b.kind==='table');delete saved.config.figure.replacements[f.figureId];
   f.type='container';delete f.kind;delete f.svg;delete f.darkSvg;f.children=[];saved.model.layoutEdited=true;saved.model.pages[0].title='保留页面编排';
   await new Promise((resolve,reject)=>{const tx=db.transaction('workspaces','readwrite');tx.objectStore('workspaces').put(saved,'current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();
  });
  await page.reload();await page.waitForFunction(()=>document.querySelector('img.tex-figure-light')?.complete&&document.querySelector('img.tex-figure-light')?.naturalWidth>0,{},{timeout:60000});
  assert.match(await page.locator('.preview-heading h2').innerText(),/保留页面编排/);assert.equal(await page.locator('#stat-warnings').innerText(),'0');
  assert.deepEqual(errors,[]);console.log('Passed: iddots MathJax SVG, automatic real LaTeX table light/dark, legacy example borders, warnings cleared, source double-click, user CSS retained.');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
