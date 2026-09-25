const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);}
const pages=[path.join(root,'index.html'),...walk(path.join(root,'chapters')).filter(file=>file.endsWith('.html'))];
const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'js/course.js'),'utf8'),ctx);
const sections=ctx.window.Course.getSections(),section=sections[0];
test('目录与正文生成的页面均已更新',()=>{
 assert.match(execFileSync(process.execPath,[path.join(root,'scripts/build-lessons.js'),'--check'],{encoding:'utf8'}),/一致/);
});
test('所有页面的站内链接、图片、脚本和锚点有效，页面内 id 唯一',()=>{
 for(const file of pages){
  const html=fs.readFileSync(file,'utf8'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  if(file!==path.join(root,'index.html'))assert.ok(html.includes('data-print-page'),'页面缺少保存 PDF 按钮：'+file);
  assert.ok(!html.includes('版权所有 © 2026'),'版权文字仍显示年份：'+file);
  assert.equal(new Set(ids).size,ids.length,'重复 id: '+file);
  for(const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)){
   if(/^(?:https?:|data:|mailto:)/.test(match[1]))continue;
   const [target,hash]=match[1].split('#'),dest=target?path.resolve(path.dirname(file),decodeURIComponent(target)):file;
   assert.ok(fs.existsSync(dest),'缺少文件 '+match[1]+' in '+file);
   if(hash)assert.ok(fs.readFileSync(dest,'utf8').includes('id="'+hash+'"'),'缺少锚点 '+match[1]+' in '+file);
  }
 }
});
test('所有知识页、整节阅读和章节页均使用 content 中的同一正文片段',()=>{
 for(const info of sections){
  const sourceFolder='section'+info.number.split('.')[1].padStart(2,'0');
  for(const page of info.pages){
   const source=fs.readFileSync(path.join(root,'content','chapter01',sourceFolder,page.slug+'.html'),'utf8');
   for(const file of [page.path,info.readingPath,'chapters/chapter01.html']){
    const prefix='../'.repeat(file.split('/').length-1),html=fs.readFileSync(path.join(root,file),'utf8');
    const chapterHref=path.posix.relative(path.posix.dirname(file),'chapters/chapter01.html')+'#linear-operation-laws';
    const fragment=source.replaceAll('{{root}}',prefix).replaceAll('src="../assets/',`src="${prefix}assets/`).replaceAll('href="#linear-operation-laws"',`href="${chapterHref}"`);
    assert.ok(html.includes(fragment),file+' 正文不一致：'+page.id);
    if(file===page.path) {
     assert.ok(!html.includes('knowledge-sidebar'),'知识页仍显示左侧目录栏：'+file);
     assert.ok(!html.includes('class="breadcrumbs"'));
    }
   }
  }
 }
});
test('九页顺序和边界翻页完整，末页通向 1.2',()=>{
 assert.equal(section.pages.length,9);
 for(let i=0;i<section.pages.length;i++){
  const page=section.pages[i],html=fs.readFileSync(path.join(root,page.path),'utf8');
  assert.ok(html.includes('<span class="knowledge-page-number">§1.1.'+(i+1)+'</span>'));
  assert.ok(html.includes('>标记本页为已学会</button>'),'知识页缺少完成标记按钮：'+page.id);
  assert.ok(html.includes('class="knowledge-step-actions"'),'知识页缺少知识点翻页按钮：'+page.id);
  assert.ok(html.includes('>上一知识点</a>') || i===0,'知识页缺少上一知识点按钮：'+page.id);
  assert.ok(html.includes('>下一知识点</a>'),'知识页缺少下一知识点按钮：'+page.id);
  assert.ok(html.includes('>继续学习</a>'),'知识页缺少继续学习按钮：'+page.id);
  assert.ok(html.includes('data-next-unlearned-link="'+page.id+'"'),'知识页缺少下一未学会跳转：'+page.id);
  assert.ok(!html.includes('知识编号 1.1.'+(i+1)));
  if(i>0)assert.ok(html.includes('href="'+section.pages[i-1].slug+'.html"'));
  if(i<8)assert.ok(html.includes('href="'+section.pages[i+1].slug+'.html"'));
  else assert.ok(html.includes('section02/index.html'));
 }
});
test('1.2–1.5 的知识页、整节阅读和目录合并在子节首页',()=>{
  const chapterHtml=fs.readFileSync(path.join(root,'chapters/chapter01.html'),'utf8');
  assert.ok(chapterHtml.includes('href="#main">回顾本章'),'本章回顾应返回顶部');
  assert.ok(!chapterHtml.includes('knowledge-step-actions">false'),'章节页不应显示 false');
  for(const info of sections.slice(1)){
  assert.ok(fs.existsSync(path.join(root,info.path)));
  const indexHtml=fs.readFileSync(path.join(root,info.path),'utf8');
  assert.ok(!indexHtml.includes('knowledge-step-actions">false'),'子节页不应显示 false：'+info.id);
  assert.match(indexHtml,/class="chapter-top-card section-top-card"/);
  assert.match(indexHtml,new RegExp('data-section-resume="'+info.id+'"'));
  assert.ok(!indexHtml.includes('knowledge-sidebar'),'子节首页仍显示左侧知识页栏：'+info.id);
  assert.equal(info.path,info.readingPath,'整节阅读未合并到子节首页：'+info.id);
  assert.ok(indexHtml.includes('id="full-reading"'),'缺少整节阅读区域：'+info.id);
  assert.ok(!indexHtml.includes('整节阅读与打印'));
  assert.ok(!indexHtml.includes('整节阅读 · 共'));
  assert.ok(!indexHtml.includes('完整阅读本节，或使用浏览器的打印功能保存。'));
  assert.ok(!indexHtml.includes('data-next-unlearned='));
  assert.ok(indexHtml.includes('返回课程首页'),'缺少底部课程主页导航：'+info.id);
  const sectionIndex=sections.indexOf(info);
  if (sectionIndex > 0) {
   const previousSection=sections[sectionIndex-1];
   assert.ok(indexHtml.includes('上一节 · '+previousSection.number+' '+previousSection.title),'缺少上一子节导航：'+info.id);
  }
  if (sectionIndex < sections.length - 1) {
   const nextSection=sections[sectionIndex+1];
   assert.ok(indexHtml.includes('下一节 · '+nextSection.number+' '+nextSection.title),'缺少下一节导航：'+info.id);
  } else assert.ok(indexHtml.includes('返回第一章目录'),'最后一节未提供章节目录入口');
  assert.ok(indexHtml.includes('href="index.html#main">回顾本节</a>'),'回顾本节未返回子节页顶部：'+info.id);
  assert.ok(!fs.existsSync(path.join(root,info.path.replace('index.html','all.html'))),'仍生成独立整节页面：'+info.id);
  for(const page of info.pages){
   const sourceFolder='section'+info.number.split('.')[1].padStart(2,'0');
   assert.ok(fs.existsSync(path.join(root,'content','chapter01',sourceFolder,page.slug+'.html')),'缺少正文源文件：'+page.id);
   const file=path.join(root,page.path),html=fs.readFileSync(file,'utf8');
   assert.ok(html.includes('<span class="knowledge-page-number">§'+info.number+'.'+page.number+'</span>'));
   assert.ok(html.includes('data-unit-complete="'+page.id+'"'));
   assert.ok(html.includes('data-section="'+info.id+'"'));
   assert.ok(chapterHtml.includes('data-unit-complete="'+page.id+'"'),'章节页缺少独立标记按钮：'+page.id);
  }
 }
});
