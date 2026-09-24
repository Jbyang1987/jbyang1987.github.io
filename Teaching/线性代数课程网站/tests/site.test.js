const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);}
const pages=[path.join(root,'index.html'),...walk(path.join(root,'chapters')).filter(file=>file.endsWith('.html'))];
const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'js/course.js'),'utf8'),ctx);
const section=ctx.window.Course.getSections()[0];
test('目录与正文生成的页面均已更新',()=>{
 assert.match(execFileSync(process.execPath,[path.join(root,'scripts/build-lessons.js'),'--check'],{encoding:'utf8'}),/一致/);
});
test('所有页面的站内链接、图片、脚本和锚点有效，页面内 id 唯一',()=>{
 for(const file of pages){
  const html=fs.readFileSync(file,'utf8'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length,'重复 id: '+file);
  for(const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)){
   if(/^(?:https?:|data:|mailto:)/.test(match[1]))continue;
   const [target,hash]=match[1].split('#'),dest=target?path.resolve(path.dirname(file),decodeURIComponent(target)):file;
   assert.ok(fs.existsSync(dest),'缺少文件 '+match[1]+' in '+file);
   if(hash)assert.ok(fs.readFileSync(dest,'utf8').includes('id="'+hash+'"'),'缺少锚点 '+match[1]+' in '+file);
  }
 }
});
test('知识页正文与两份完整阅读页来自相同片段',()=>{
 for(const page of section.pages){
  const fragment=fs.readFileSync(path.join(root,'content/chapter01/section01',page.slug+'.html'),'utf8');
  for(const file of [page.path,section.readingPath,'chapters/chapter01.html']){
   const prefix='../'.repeat(file.split('/').length-1),html=fs.readFileSync(path.join(root,file),'utf8');
   assert.ok(html.includes(fragment.replaceAll('{{root}}',prefix)),file+' 正文不一致');
  }
 }
});
test('九页顺序和边界翻页完整，末页通向 1.2',()=>{
 assert.equal(section.pages.length,9);
 for(let i=0;i<section.pages.length;i++){
  const page=section.pages[i],html=fs.readFileSync(path.join(root,page.path),'utf8');
  assert.ok(html.includes('第 '+(i+1)+' / 9 页'));
  if(i>0)assert.ok(html.includes('href="'+section.pages[i-1].slug+'.html"'));
  if(i<8)assert.ok(html.includes('href="'+section.pages[i+1].slug+'.html"'));
  else assert.ok(html.includes('../../chapter01.html#vector-dependence'));
 }
});
