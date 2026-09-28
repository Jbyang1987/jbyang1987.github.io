/* Isolated Edge workspace; checks the reported diagram and actual MathJax SVG. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright'),{createServer}=require('../server');
async function main(){
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  const base=process.env.TEX2HTML_BROWSER_BASE||'http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(base=>{const fetchOriginal=window.fetch;window.fetch=(url,options)=>fetchOriginal(typeof url==='string'?url.replace('http://127.0.0.1:4174',base):url,options);},base);
  await page.goto(base+'/tools/tex2html/tests/color-preview.html');await page.waitForFunction(()=>document.querySelector('#status')?.dataset.total);
  const colors=await page.locator('#status').evaluate(el=>({passed:el.dataset.passed,total:el.dataset.total,text:el.textContent}));assert.equal(colors.passed,colors.total,colors.text);assert.equal(colors.total,'7');
  const nested=page.locator('#cases article').nth(5);
  const colorScopes=await nested.evaluate(el=>[...el.querySelectorAll('mjx-assistive-mml mtext')].map(n=>({text:n.textContent,color:n.closest('[mathcolor]')?.getAttribute('mathcolor')||''})));
  assert.ok(colorScopes.some(s=>s.text.includes('蓝色')&&s.color==='#0000ff'));assert.ok(colorScopes.some(s=>s.text.includes('红色')&&s.color==='#ff0000'));assert.ok(colorScopes.some(s=>s.text.includes('后面')&&!s.color),JSON.stringify(colorScopes));
  const diagram=String.raw`\[
\xymatrix{
\text{$\bC$-线性空间} \ar@{}[r]|-{+} & \text{内积(??)} \ar@{=>}[r] & \text{??空间} \\
}
\]`,source=String.raw`\begin{frame}{中文基线与颜色}
\[\text{前面 \blue{蓝色} 后面}\]
`+diagram+String.raw`\end{frame}`;
  await page.route('**/api/lecture-manifest',r=>r.fulfill({json:{sections:['sections/00 introduction.tex'],style:'theme.sty',pictures:[]}}));
  await page.route('**/api/lecture-file?*',r=>r.fulfill({body:new URL(r.request().url()).searchParams.get('path').endsWith('.tex')?source:String.raw`\newcommand{\bC}{\mathbb C}\newcommand{\blue}[1]{{\textcolor[rgb]{0,0,1}{#1}}}`,contentType:'text/plain; charset=utf-8'}));
  await page.goto(base+'/tools/tex2html/');await page.waitForFunction(()=>document.querySelector('#stat-frames')?.textContent==='1');
  const oldSVG=fs.readFileSync(__dirname+'/fixtures/legacy-chinese-xdv.svg','utf8');
  async function injectLegacy(){await page.evaluate(async svg=>{
   const db=await new Promise(resolve=>{const r=indexedDB.open('tex2html-workspace');r.onsuccess=()=>resolve(r.result);});
   const saved=await new Promise(resolve=>{const r=db.transaction('workspaces').objectStore('workspaces').get('current');r.onsuccess=()=>resolve(r.result);});
   const figure=saved.model.pages[0].blocks.find(b=>b.kind==='xypic');Object.assign(figure,{svg,darkSvg:svg,compiler:null,origin:'',error:''});
   saved.config.figure.replacements[figure.figureId]={svg,darkSvg:svg};saved.model.pages[0].title='保留编辑和编排';saved.model.layoutEdited=true;
   await new Promise((resolve,reject)=>{const tx=db.transaction('workspaces','readwrite');tx.objectStore('workspaces').put(saved,'current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();
  },oldSVG);}
  await page.waitForFunction(async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('tex2html-workspace');r.onsuccess=()=>resolve(r.result);});const saved=await new Promise(resolve=>{const r=db.transaction('workspaces').objectStore('workspaces').get('current');r.onsuccess=()=>resolve(r.result);});db.close();return !!saved?.model?.pages[0]?.figures.length;});
  await injectLegacy();await page.reload();
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('成功 1 项'),{},{timeout:60000});
  const svg=await page.locator('img.tex-figure-light').evaluate(async el=>await(await fetch(el.src)).text());assert.ok(svg.includes('data-tex2html-format="pdf"'),svg.slice(0,250));assert.match(svg,/viewBox="0 -24\.69 203\.79 24\.69"/);
  assert.equal(await page.locator('#stat-warnings').innerText(),'0');assert.match(await page.locator('.preview-heading h2').innerText(),/保留编辑/);
  fs.mkdirSync('work/tex2html-text-colors',{recursive:true});for(const theme of ['light','dark']){await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);await page.locator('.tex-figure').screenshot({path:'work/tex2html-text-colors/repaired-'+theme+'.png'});}
  await page.locator('.tex-figure img:visible').dblclick();assert.equal(await page.locator('#tex-input').evaluate(el=>el.value.slice(el.selectionStart,el.selectionEnd)),diagram);
  // A failed repair retains the old SVG and does not loop automatically.
  let repairRequests=0;await page.route('**/convert/xypic',route=>{repairRequests++;return route.fulfill({status:422,json:{error:'测试编译失败，旧图应保留'}});});
  await injectLegacy();await page.reload();await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('失败 1 项'));
  const kept=await page.locator('img.tex-figure-light').evaluate(async el=>await(await fetch(el.src)).text());assert.match(kept,/id="g0-/);assert.equal(repairRequests,1);
  await page.locator('[data-view="css"]').click();await page.locator('[data-view="preview"]').click();assert.equal(repairRequests,1);
  assert.deepEqual(errors,[]);console.log('Passed: 7 MathJax color cases, nested text scopes, automatic legacy Chinese SVG repair in both themes, metadata, layout/source mapping retained, failed repair keeps original.');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
