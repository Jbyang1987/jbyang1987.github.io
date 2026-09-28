/* Optional real browser check: NODE_PATH must provide Playwright. Uses a fresh
   browser context and an ephemeral server, never the user's saved workspace. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright'),{createServer}=require('../server');
const sources={'00 introduction.tex':String.raw`\section{绪论}
\begin{frame}{第一段}
重复文字。
\end{frame}`,'09 quadratic forms.tex':String.raw`\section{二次型}
\begin{frame}{第二段}
重复文字。
\end{frame}`};
async function main(){
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(()=>{Object.defineProperty(navigator.clipboard,'writeText',{value:async text=>{window.copiedWorkingText=text;}});});
  await page.route('**/api/lecture-manifest',route=>route.fulfill({json:{sections:Object.keys(sources).map(name=>'sections/'+name),style:'theme.sty',pictures:[]}}));
  await page.route('**/api/lecture-file?*',route=>{const name=new URL(route.request().url()).searchParams.get('path').split('/').pop();return route.fulfill({body:sources[name]||'',contentType:'text/plain; charset=utf-8'});});
  await page.goto('http://127.0.0.1:'+server.address().port+'/tools/tex2html/');await page.waitForFunction(()=>document.querySelector('#stat-frames').textContent==='2'&&document.querySelector('#code-chapter-select').options.length===3);
  assert.equal(await page.locator('#code-chapter-select').inputValue(),'00 introduction.tex::section0');assert.doesNotMatch(await page.locator('#tex-input').inputValue(),/09 quadratic/);await page.locator('#code-chapter-select').selectOption('all');
  await page.locator('#page-select').selectOption('all');const extracted=await page.locator('#lecture-tex-preview').innerText();await page.locator('#edit-tex-code').click();assert.equal(await page.locator('#tex-input').inputValue(),extracted);
  const bounds=await page.locator('#tex-input').boundingBox(),box=await page.locator('.lecture-code-preview').boundingBox();assert.ok(bounds.x>=box.x&&bounds.y>=box.y&&bounds.y+bounds.height<=box.y+box.height+2,'Editor must remain inside code box');
  await page.locator('#auto-preview').evaluate(input=>{input.checked=false;input.dispatchEvent(new Event('change',{bubbles:true}));});
  const prefix='% 新增一行\n% 再新增一行\n';await page.locator('#tex-input').fill(prefix+extracted);
  await page.locator('.tex-paragraph').nth(1).dblclick();let range=await page.locator('#tex-input').evaluate(input=>({text:input.value.slice(input.selectionStart,input.selectionEnd),start:input.selectionStart}));assert.match(range.text,/重复文字/);assert.equal(await page.locator('#code-chapter-select').inputValue(),'09 quadratic forms.tex::section0');
  await page.locator('#code-chapter-select').selectOption('all');await page.locator('#tex-input').fill(extracted);await page.locator('.tex-paragraph').nth(1).dblclick();const before=await page.locator('#tex-input').evaluate(input=>input.selectionStart);assert.equal(before,range.start);
  const index=extracted.lastIndexOf('重复文字'),edited=extracted.slice(0,index)+'修改后的第二章工作副本'+extracted.slice(index+'重复文字'.length);await page.locator('#code-chapter-select').selectOption('all');await page.locator('#tex-input').fill(edited);await page.locator('#convert-all').click();await page.locator('.tex-paragraph').nth(1).waitFor();assert.match(await page.locator('.tex-paragraph').nth(1).innerText(),/修改后的第二章工作副本/);
  await page.locator('.tex-paragraph').nth(1).dblclick();assert.match(await page.locator('#tex-input').evaluate(input=>input.value.slice(input.selectionStart,input.selectionEnd)),/修改后的第二章工作副本/);
  const chapterCode=await page.locator('#tex-input').inputValue();await page.locator('#copy-tex-code').click();assert.equal(await page.evaluate(()=>window.copiedWorkingText),chapterCode);assert.doesNotMatch(chapterCode,/00 introduction/);
  for(const theme of ['dark','sepia','light']){await page.locator('[data-code-theme='+theme+']').click();assert.equal(await page.locator('.lecture-code-preview').getAttribute('data-code-theme'),theme);}
  await page.waitForFunction(async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('tex2html-workspace');r.onsuccess=()=>resolve(r.result);});const value=await new Promise(resolve=>{const r=db.transaction('workspaces').objectStore('workspaces').get('current');r.onsuccess=()=>resolve(r.result);});db.close();return value?.workingCopies?.[value.workingKey]?.text.includes('修改后的第二章工作副本');});
  await page.reload();await page.waitForFunction(()=>document.querySelector('#tex-input').value.includes('修改后的第二章工作副本'));await page.locator('#page-select').selectOption('all');await page.locator('.tex-paragraph').nth(1).dblclick();assert.match(await page.locator('#tex-input').evaluate(input=>input.value.slice(input.selectionStart,input.selectionEnd)),/修改后的第二章工作副本/);
  await page.locator('[data-lecture-ppt]').first().evaluate(input=>input.click());assert.equal(await page.locator('#stat-frames').innerText(),'1');await page.locator('[data-lecture-ppt]').first().evaluate(input=>input.click());assert.equal(await page.locator('#stat-frames').innerText(),'2');assert.equal(await page.locator('#tex-input').inputValue(),chapterCode);
  const originals=await page.evaluate(async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('tex2html-workspace');r.onsuccess=()=>resolve(r.result);});return await new Promise(resolve=>{const r=db.transaction('workspaces').objectStore('workspaces').get('current');r.onsuccess=()=>{db.close();resolve(r.result.files);};});});for(const original of originals)assert.equal(original.text,sources[original.name]);
  const downloadEvent=page.waitForEvent('download');await page.locator('#save-workspace').click();const download=await downloadEvent,backup=fs.readFileSync(await download.path()),saved=JSON.parse(backup);assert.equal(saved.workingCopies[saved.workingKey].text,edited);
  const chooserEvent=page.waitForEvent('filechooser');await page.locator('#load-workspace').click();await (await chooserEvent).setFiles({name:'test-workspace.json',mimeType:'application/json',buffer:backup});await page.waitForFunction(()=>document.querySelector('#status').textContent==='已导入并恢复。');await page.locator('.tex-paragraph').nth(1).dblclick();assert.match(await page.locator('#tex-input').evaluate(input=>input.value.slice(input.selectionStart,input.selectionEnd)),/修改后的第二章工作副本/);
  assert.deepEqual(errors,[]);console.log('Browser checks passed: edit in place, insert/delete navigation, reconversion, clipboard payload, themes, refresh, selection drafts, backup export/import, read-only originals.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
