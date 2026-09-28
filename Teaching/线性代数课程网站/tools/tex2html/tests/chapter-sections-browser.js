/* Real browser checks in an isolated context. No writes to lecture files. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright'),{createServer}=require('../server');
async function main(){
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});const context=await browser.newContext({viewport:{width:1500,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await context.addInitScript(()=>{
   window.testWrittenFiles={};
   const missing=()=>{throw new DOMException('Test directory is empty','NotFoundError');};
   const directory=prefix=>({getDirectoryHandle:async(name,options)=>options?.create?directory(prefix+name+'/'):missing(),getFileHandle:async(name,options)=>options?.create?{createWritable:async()=>({write:async value=>{window.testWrittenFiles[prefix+name]=typeof value==='string'?value:new TextDecoder().decode(value);},close:async()=>{}})}:missing()});
   Object.defineProperty(window,'showDirectoryPicker',{value:async()=>directory(''),configurable:true});
  });
  // Real 00–09 manuscripts; skip optional native compilation in this UI test.
  await page.route('**/health',route=>route.fulfill({status:503,body:'UI test'}));
  await page.goto((process.env.TEX2HTML_BROWSER_BASE||'http://127.0.0.1:'+server.address().port)+'/tools/tex2html/');
  await page.waitForFunction(()=>document.querySelector('#code-chapter-select').options.length===11&&+document.querySelector('#stat-frames').textContent>100);
  const labels=await page.locator('#code-chapter-select option').allTextContents();assert.equal(labels[0],'第 00 章 · 课程简介');assert.equal(labels[9],'第 09 章 · 实二次型');
  const first=await page.locator('#tex-input').inputValue();assert.match(first,/\\section\*\{课程简介\}/);assert.doesNotMatch(first,/\\section\{向量\}/);
  await page.locator('#toggle-rules').click();await page.locator('#auto-preview').uncheck();await page.locator('#toggle-rules').click();await page.locator('#edit-tex-code').click();
  const edited=first.replace('课程考核方式','工作副本考核方式').replace('考核成绩为','工作副本考核成绩为');await page.locator('#tex-input').fill(edited);
  await page.locator('#code-chapter-select').selectOption({label:labels[9]});const ninth=await page.locator('#tex-input').inputValue();assert.match(ninth,/\\section\{实二次型\}/);assert.doesNotMatch(ninth,/课程简介/);
  await page.locator('#code-chapter-select').selectOption({label:labels[0]});assert.equal(await page.locator('#tex-input').inputValue(),edited);
  // Export also consumes pending edits when automatic conversion is disabled.
  const zipEvent=page.waitForEvent('download');await page.locator('#export-zip').click();const zip=fs.readFileSync(await(await zipEvent).path());assert.ok(zip.includes(Buffer.from('工作副本考核成绩为')),'Pending body edits must be exported');
  for(let ch=0;ch<=9;ch++)assert.ok(zip.includes(Buffer.from('converted/content/chapter'+String(ch).padStart(2,'0')+'/')));
  // Exercise directory writing through in-memory handles, without touching disk.
  await page.locator('#write-site').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('已写入 '));
  const written=await page.evaluate(()=>window.testWrittenFiles);for(let ch=0;ch<=9;ch++)assert.ok(Object.keys(written).some(p=>p.startsWith('content/chapter'+String(ch).padStart(2,'0')+'/')));
  assert.ok(Object.values(written).some(text=>text.includes('工作副本考核成绩为')));
  const backupEvent=page.waitForEvent('download');await page.locator('#save-workspace').click();const saved=JSON.parse(fs.readFileSync(await(await backupEvent).path(),'utf8'));
  assert.deepEqual(saved.model.chapters.map(ch=>ch.chapter),[0,1,2,3,4,5,6,7,8,9]);assert.equal(saved.model.chapters[0].title,'课程简介');assert.equal(saved.workingCopies[saved.workingKey].chapters.length,10);
  assert.ok(saved.files.find(f=>f.name==='00 introduction.tex').text.includes('课程考核方式'));assert.ok(!saved.files.some(f=>f.text.includes('工作副本考核方式')));
  // Persisted edit + chapter selector survive a page reload.
  await page.reload();await page.waitForFunction(()=>document.querySelector('#tex-input').value.includes('工作副本考核方式'));
  assert.equal(await page.locator('#code-chapter-select').inputValue(),'00 introduction.tex::section0');
  // Cross-chapter source navigation switches this same editor automatically.
  await page.locator('#page-select').selectOption('all');
  const target=page.locator('.preview-page').filter({has:page.locator('.preview-heading .page-number', {hasText:'§9.'})}).first().locator('[data-block-id]').first();
  await target.dblclick();assert.equal(await page.locator('#code-chapter-select').inputValue(),'09 quadratic forms.tex::section0');
  assert.ok((await page.locator('#tex-input').evaluate(input=>input.value.slice(input.selectionStart,input.selectionEnd))).trim().length>0);
  const out=path.resolve(__dirname,'../../../work/tex2html-chapter-sections');fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'chapter09-editor.png')});
  assert.deepEqual(errors,[]);console.log('Browser checks passed: real 00–09 section selectors, chapter edits, cross-chapter navigation, pending-edit ZIP, saved chapter metadata, refresh, read-only originals.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
