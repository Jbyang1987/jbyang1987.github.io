'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),W=require('../working-copy'),C=require('../core');
const fs=require('node:fs'),path=require('node:path');
const sources=[{name:'00 introduction.tex',text:String.raw`\section{绪论}
\begin{frame}{第一段}
重复文字。
\end{frame}`},{name:'09 quadratic forms.tex',text:String.raw`\section{二次型}
\begin{frame}{第二段}
重复文字。
\end{frame}`}];
function convert(doc){const model=C.convert(W.files(doc),[],{lectureBatch:true,frameSelection:{}});return {model,source:W.snapshot(doc)};}
test('editable extracted code retains chapter identities without changing imported snapshots',()=>{
 const before=JSON.stringify(sources),doc=W.create(sources);W.update(doc,doc.text.replace('第一段','修改后'));
 const {model}=convert(doc);assert.deepEqual(model.pages.map(p=>p.chapter),[0,9]);assert.equal(model.pages[0].title,'修改后');assert.equal(JSON.stringify(sources),before);
 // Visible filename separators are comments, never used to infer chapter identity.
 W.update(doc,doc.text.replace('% ===== 09 quadratic forms.tex =====','% 自定义注释'));
 assert.deepEqual(convert(doc).model.pages.map(p=>p.chapter),[0,9]);
});
test('double-click ranges refer to distinct occurrences of duplicate text and survive insert/delete before reconversion',()=>{
 const doc=W.create(sources),{model,source}=convert(doc),block=model.pages[1].blocks.find(b=>b.type==='text');
 const original=W.locate(doc,source,block.file,block.sourceStart,block.sourceEnd);assert.match(doc.text.slice(original.start,original.end),/重复文字/);
 const prefix='新增第一行\n新增第二行\n';W.update(doc,prefix+doc.text);
 let range=W.locate(doc,source,block.file,block.sourceStart,block.sourceEnd);assert.equal(range.start,original.start+prefix.length);
 W.update(doc,doc.text.replace('新增第一行\n',''));range=W.locate(doc,source,block.file,block.sourceStart,block.sourceEnd);
 assert.equal(range.start,original.start+'新增第二行\n'.length);assert.match(doc.text.slice(range.start,range.end),/重复文字/);assert.ok(range.start>doc.text.indexOf('09 quadratic'));
 const next=convert(doc),nextBlock=next.model.pages[1].blocks.find(b=>b.type==='text');assert.deepEqual(W.locate(doc,next.source,nextBlock.file,nextBlock.sourceStart,nextBlock.sourceEnd),range);
});
test('replacing or deleting the clicked block locates its current replacement, including after refresh',()=>{
 const doc=W.create(sources),{model,source}=convert(doc),b=model.pages[0].blocks[0],range=W.locate(doc,source,b.file,b.sourceStart,b.sourceEnd);
 W.update(doc,doc.text.slice(0,range.start)+'新的正文\n'+doc.text.slice(range.end));
 const restored=W.restore(JSON.parse(JSON.stringify(doc))),position=W.locate(restored,source,b.file,b.sourceStart,b.sourceEnd);
 assert.equal(restored.text.slice(position.start,position.end),'新的正文\n');
 W.update(restored,restored.text.slice(0,position.start)+restored.text.slice(position.end));const deleted=W.locate(restored,source,b.file,b.sourceStart,b.sourceEnd);assert.equal(deleted.start,deleted.end);
});
test('selected frame extraction converts all extracted frames, without applying original indexes again',()=>{
 const original={name:'09 quadratic forms.tex',text:String.raw`\section{二次型}
\begin{frame}{忽略}甲\end{frame}
\begin{frame}{保留}乙\end{frame}`},start=original.text.indexOf('\\begin{frame}{保留}'),doc=W.create([{...original,ranges:[{sourceStart:start,sourceEnd:original.text.length}]}]);
 const model=convert(doc).model;assert.equal(model.pages.length,1);assert.equal(model.pages[0].title,'保留');assert.doesNotMatch(doc.text,/忽略|甲/);
});
test('selection drafts remain independent and round-trip through workspace JSON',()=>{
 const config={lectureBatch:true},key=W.key(sources,config),copies={[key]:W.create(sources)};W.update(copies[key],copies[key].text.replace('重复文字','已编辑副本'));
 const otherKey=W.key([sources[1]],config);copies[otherKey]=W.create([sources[1]]);
 assert.notEqual(key,otherKey);const restored=Object.fromEntries(Object.entries(JSON.parse(JSON.stringify(copies))).map(([k,v])=>[k,W.restore(v)]));assert.match(restored[key].text,/已编辑副本/);assert.doesNotMatch(restored[otherKey].text,/已编辑副本/);
});
test('cross-chapter replacement preserves monotone partitions and rejects corrupted persisted boundaries',()=>{
 const doc=W.create(sources);W.update(doc,'新的工作副本');assert.equal(W.files(doc).map(f=>f.text).join(''),doc.text);W.restore(doc);
 W.update(doc,'');W.update(doc,'重新输入');assert.equal(W.files(doc)[0].text,'重新输入');
 const damaged=JSON.parse(JSON.stringify(doc));damaged.segments[0].end++;assert.throws(()=>W.restore(damaged),/边界/);
});
test('all ten real lecture chapters convert from independent working files with their frames intact',()=>{
 const root=path.resolve(__dirname,'../../../讲稿/tex'),names=fs.readdirSync(path.join(root,'sections')).filter(n=>/^0\d .*\.tex$/.test(n)).sort(),inputs=names.map(name=>({name,text:fs.readFileSync(path.join(root,'sections',name),'utf8')})),before=JSON.stringify(inputs);
 const styles=[{name:'theme_hanhai.sty',text:fs.readFileSync(path.join(root,'common/theme_hanhai.sty'),'utf8')}],config={lectureBatch:true},original=C.convert(inputs,styles,config),doc=W.create(inputs),model=C.convert(W.files(doc),styles,config);
 assert.equal(model.frames.length,original.frames.length);assert.deepEqual([...new Set(model.pages.map(p=>p.chapter))],[0,1,2,3,4,5,6,7,8,9]);assert.equal(JSON.stringify(inputs),before);
 for(const page of model.pages)for(const block of page.blocks){const range=W.locate(doc,W.snapshot(doc),block.file,block.sourceStart,block.sourceEnd);assert.ok(range&&range.start<=range.end&&range.end<=doc.text.length);}
});
