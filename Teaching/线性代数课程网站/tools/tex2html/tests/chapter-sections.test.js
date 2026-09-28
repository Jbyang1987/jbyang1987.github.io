'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('../core'),W=require('../working-copy');
const fs=require('node:fs'),path=require('node:path');
test('section boundaries ignore comments, macros, frames and math; starred chapters start at zero',()=>{
 const text=String.raw`% \section{注释}
\newcommand{\fake}{\section{宏}}
\begin{document}
\section*[短名]{课程\textbf{简介}}
\begin{frame}{A}甲 $\text{\section{公式}}$ \section{帧内}\end{frame}
\section{向量}
\begin{frame}{B}乙\end{frame}
\end{document}`;
 const chapters=C.chapterSections([{name:'combined.tex',text}]);
 assert.deepEqual(chapters.map(ch=>[ch.chapter,ch.title]),[[0,'课程简介'],[1,'向量']]);
 assert.equal(chapters[0].end,chapters[1].start);assert.equal(chapters[1].end,text.length);
 const m=C.convert([{name:'combined.tex',text}]);assert.deepEqual(m.pages.map(p=>p.chapter),[0,1]);
});
test('repeated section names cannot merge pages; subsection counts and export resources restart per chapter',()=>{
 const part=String.raw`\section{同名章}\subsection{同名节}\subsubsection{同名知识点}
\begin{frame}内容\includegraphics{a.png}\begin{tikzpicture}\draw (0,0)--(1,1);\end{tikzpicture}\end{frame}`;
 const m=C.convert([{name:'combined.tex',text:part+'\n'+part}],[],{}, {'a.png':{name:'a.png',data:'data:image/png;base64,AA=='}});
 assert.equal(m.pages.length,2);assert.deepEqual(m.pages.map(p=>p.number),['0.1.1','1.1.1']);
 assert.notEqual(m.pages[0].chapterId,m.pages[1].chapterId);
 const entries=C.exportFiles(m);
 for(const ch of [0,1]){
  const directory='chapter'+String(ch).padStart(2,'0');
  assert.ok(entries.some(e=>e.path===`content/${directory}/section01/lesson-${ch}-1-1.html`));
  assert.ok(entries.some(e=>e.path===`assets/${directory}/a.png`));
  assert.ok(entries.some(e=>e.path.startsWith(`assets/${directory}/`)&&e.path.endsWith('.svg')));
  assert.match(m.pages[ch].html,new RegExp(`data-chapter="${ch}"`));
  assert.match(m.pages[ch].html,new RegExp(`assets/${directory}/`));
 }
});
test('plain section content is separated without requiring frames',()=>{
 const m=C.convert([{name:'combined.tex',text:String.raw`\section*{课程简介}简介正文。\section{向量}向量正文。`}]);
 assert.deepEqual(m.pages.map(p=>[p.chapter,p.sectionTitle]),[[0,'课程简介'],[1,'向量']]);
 assert.match(m.pages[0].html,/简介正文/);assert.doesNotMatch(m.pages[0].html,/向量正文/);
});
test('real extracted 00–09 section boundaries retain complete text, identities and source positions after editing',()=>{
 const dir=path.resolve(__dirname,'../../../讲稿/tex/sections'),inputs=fs.readdirSync(dir).filter(n=>/^0\d .*\.tex$/.test(n)).sort().map(name=>({name,text:fs.readFileSync(path.join(dir,name),'utf8')}));
 const doc=W.create(inputs),before=JSON.stringify(inputs),chapters=C.chapterSections(W.files(doc));
 assert.deepEqual(chapters.map(ch=>ch.chapter),[0,1,2,3,4,5,6,7,8,9]);assert.equal(chapters[0].title,'课程简介');
 assert.equal(chapters.map(ch=>W.files(doc).find(f=>f.name===ch.file).text.slice(ch.start,ch.end)).join(''),doc.text);
 const target=chapters[7],segment=doc.segments.find(s=>s.name===target.file),start=segment.start+target.start,end=segment.start+target.end;
 W.update(doc,doc.text.slice(0,start)+'新增副本注释\n'+doc.text.slice(start,end)+doc.text.slice(end));
 const model=C.convert(W.files(W.restore(JSON.parse(JSON.stringify(doc)))),[],{lectureBatch:true});
 assert.deepEqual(model.chapters.map(ch=>ch.chapter),[0,1,2,3,4,5,6,7,8,9]);assert.equal(JSON.stringify(inputs),before);
 const snapshot=W.snapshot(doc);for(const page of model.pages){const b=page.blocks[0],range=W.locate(doc,snapshot,b.file,b.sourceStart,b.sourceEnd);assert.ok(range&&range.start>=0&&range.end<=doc.text.length);}
});
test('selecting only chapter 09 preserves its number, and explicit 10–11 stay available',()=>{
 const files=['09 quadratic forms.tex','10 tensors.tex','11 applications.tex'].map(name=>({name,text:String.raw`\section{章}\begin{frame}正文\end{frame}`}));
 assert.deepEqual(C.chapterSections([files[0]]).map(ch=>ch.chapter),[9]);
 assert.deepEqual(C.convert(files,[],{lectureBatch:true,lectureSelection:files.map(f=>f.name)}).chapters.map(ch=>ch.chapter),[9,10,11]);
});
test('appending at the end of one chapter keeps new code in that file and moves the next source boundary',()=>{
 const doc=W.create([{name:'00 introduction.tex',text:'简介'},{name:'01 vectors.tex',text:'向量'}]),source=W.snapshot(doc),first=doc.segments[0],end=first.end,addition='新增内容';
 W.update(doc,doc.text.slice(0,end)+addition+doc.text.slice(end),first.name);
 assert.ok(W.files(doc)[0].text.endsWith(addition));assert.ok(!W.files(doc)[1].text.includes(addition));
 assert.equal(W.locate(doc,source,'01 vectors.tex',0,1).start,source.segments[1].start+addition.length);
 W.restore(doc);
});
