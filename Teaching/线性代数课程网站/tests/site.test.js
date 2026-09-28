const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const ctx = {window:{}};
vm.runInNewContext(read('js/course.js'), ctx);
const course = ctx.window.Course;
const chapters = course.chapters.filter(chapter => chapter.path && chapter.lessons);
const relative = (from,to) => path.posix.relative(path.posix.dirname(from),to);
function walk(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry => entry.isDirectory() ? walk(path.join(dir,entry.name)) : [path.join(dir,entry.name)]); }

test('目录与正文生成的页面均已更新', () => {
 assert.match(execFileSync(process.execPath,[path.join(root,'scripts/build-lessons.js'),'--check'],{encoding:'utf8'}), /一致/);
});
test('所有页面的站内链接、图片、脚本和锚点有效，页面内 id 唯一', () => {
 const pages = [path.join(root,'index.html'), ...walk(path.join(root,'chapters')).filter(file=>file.endsWith('.html'))];
 for(const file of pages) {
  const html=fs.readFileSync(file,'utf8');
  // 匹配真正的 id 属性，不能把转换正文的 data-chapter-id 算作 DOM id。
  const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length,'重复 id: '+file);
  if(html.includes('data-page="knowledge"')) assert.ok(!html.includes('data-print-page'),file);
  else if(file!==path.join(root,'index.html') && !html.includes('data-page="legacy-redirect"')) assert.ok(html.includes('data-print-page'),file);
  assert.ok(!html.includes('版权所有 © 2026'),file);
  assert.ok(!html.includes('{{root}}'),'未替换路径: '+file);
  for(const match of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
   if(/^(?:https?:|data:|mailto:)/.test(match[1])) continue;
   const [target,hash]=match[1].split('#');
   const dest=target?path.resolve(path.dirname(file),decodeURIComponent(target)):file;
   assert.ok(fs.existsSync(dest),'缺少文件 '+match[1]+' in '+file);
   if(hash) assert.ok([...fs.readFileSync(dest,'utf8').matchAll(/\sid="([^"]+)"/g)].some(m=>m[1]===hash),'缺少锚点 '+match[1]+' in '+file);
  }
 }
});
test('全部章节的正文、编号、交互标记和边界导航与目录一致', () => {
 for(const chapter of chapters) {
  const chapterHtml=read(chapter.path);
  assert.ok(chapterHtml.includes('href="#main">回顾本章'));
  assert.ok(!chapterHtml.includes('continue-learning'));
  assert.ok(!chapterHtml.includes('data-complete-button'));
  for(const [sectionIndex,section] of chapter.lessons.entries()) {
   const indexHtml=read(section.path);
   assert.equal(section.path,section.readingPath);
   assert.ok(indexHtml.includes('id="full-reading"'));
   assert.ok(indexHtml.includes('class="chapter-top-card section-top-card"'));
   assert.ok(indexHtml.includes('data-section-resume="'+section.id+'"'));
   assert.ok(indexHtml.includes('返回课程首页'));
   assert.ok(indexHtml.includes('href="index.html#main">回顾本节</a>'));
   assert.ok(!indexHtml.includes('continue-learning'));
   assert.ok(!indexHtml.includes('knowledge-sidebar'));
   assert.ok(!fs.existsSync(path.join(root,section.path.replace('index.html','all.html'))));
   const previousSection=chapter.lessons[sectionIndex-1],nextSection=chapter.lessons[sectionIndex+1];
   if(previousSection) assert.ok(indexHtml.includes('href="'+relative(section.path,previousSection.path)+'"'));
   if(nextSection) assert.ok(indexHtml.includes('href="'+relative(section.path,nextSection.path)+'"'));
   else assert.ok(indexHtml.includes('返回章节目录'));
   for(const [i,page] of section.pages.entries()) {
    const sourceFile='content/'+chapter.id+'/section'+section.number.split('.')[1].padStart(2,'0')+'/'+page.slug+'.html';
    const source=read(sourceFile), html=read(page.path);
    for(const file of [page.path,section.path,chapter.path]) {
     const generated=read(file),prefix='../'.repeat(file.split('/').length-1);
     assert.ok(generated.includes(source.replaceAll('{{root}}',prefix)),file+' 正文不一致: '+page.id);
     assert.ok(generated.includes('data-unit-complete="'+page.id+'"'),file);
     assert.ok(!generated.includes('knowledge-step-actions">false'),file);
    }
    assert.ok(html.includes('§'+section.number+'.'+page.number+'</span>'));
    assert.ok(html.includes('data-section="'+section.id+'"'));
    assert.ok(html.includes('data-next-unlearned-link="'+page.id+'"'));
    assert.ok(html.includes('class="knowledge-step-actions"'));
    assert.ok(!html.includes('knowledge-sidebar'));
    assert.ok(!html.includes('class="breadcrumbs"'));
    if(i>0) assert.ok(html.includes('href="'+relative(page.path,section.pages[i-1].path)+'"'));
    const next=section.pages[i+1];
    const nextPath=next?next.path:nextSection?nextSection.path:chapter.path;
    assert.ok(html.includes('href="'+relative(page.path,nextPath)+'"'),page.path+' 缺少下一入口');
   }
  }
 }
});
test('正文文件全部登记，课程简介可访问，旧第一章链接保留', () => {
 const expected=new Set(course.getAllUnits().map(page=>'content/'+page.chapterId+'/section'+page.sectionNumber.split('.')[1].padStart(2,'0')+'/'+page.slug+'.html'));
 expected.add('content/chapter00/lesson-0-1.html');
 const actual=walk(path.join(root,'content')).filter(file=>file.endsWith('.html')).map(file=>path.relative(root,file).split(path.sep).join('/'));
 assert.deepEqual(new Set(actual),expected);
 assert.ok(read('index.html').includes('href="chapters/introduction.html"'));
 assert.ok(read('chapters/introduction.html').includes(read('content/chapter00/lesson-0-1.html').replaceAll('{{root}}','../')));
 for(const unit of course.legacyUnits) {
  const html=read(unit.path);
  assert.ok(html.includes('content="0;url='+relative(unit.path,unit.target)+'"'));
  assert.ok(html.includes('href="'+relative(unit.path,unit.target)+'"'));
 }
 for(const section of course.getSections()) assert.ok(read('chapters/chapter01.html').includes('id="'+section.anchor+'"'));
});
