const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../core'),{compile}=require('../server');
const convert=text=>C.convert([{name:'test.tex',text:String.raw`\begin{frame}${text}\end{frame}`}],[],{figure:{engine:'local'}});
const warnings=m=>m.pages.flatMap(p=>p.warnings);
test('rightline keeps formatted text and reports missing arguments',()=>{
 const m=convert(String.raw`正文\rightline{------\textbf{维基百科}}`);
 assert.match(m.pages[0].html,/text-align:right[^]*<strong>维基百科<\/strong>/);
 assert.ok(!warnings(m).some(w=>w.command==='rightline'));
 assert.ok(warnings(convert(String.raw`\rightline`)).some(w=>w.command==='rightline'));
});
test('XY spacing options and balanced bodies remain a single located diagram',()=>{
 const raw=String.raw`\xymatrix@R=4mm@C=1cm{A \ar@{|->}[r] & {\frac{B}{C}}}`;
 const m=convert('before\n'+raw+'\nafter');
 assert.equal(m.pages[0].figures.length,1);
 assert.equal(m.pages[0].figures[0].raw,raw);
 assert.equal(m.pages[0].figures[0].sourceStartLine,2);
 assert.ok(!warnings(m).some(w=>/^ar|xymatrix@/.test(w.command)));
 assert.ok(C.parse(String.raw`\xymatrix@R=1mm{A`).warnings.some(w=>/未闭合/.test(w.reason)));
});
test('boxed XY and TikZ inside math or text stay intact and retain mathematical context',()=>{
 for(const raw of [String.raw`\begin{equation*}\boxed{\xymatrix@R=1mm{A\ar[r]&B}}\end{equation*}`,String.raw`\boxed{\begin{tikzpicture}\draw (0,0) circle (1);\end{tikzpicture}}`,String.raw`$\boxed{\begin{tikzpicture}\node {$x$};\end{tikzpicture}}$`]){
  const m=convert(raw);assert.equal(m.pages[0].figures.length,1);
  assert.match(m.pages[0].figures[0].raw,/\\boxed/);
  assert.ok(!warnings(m).some(w=>/^(ar|draw|node|boxed)/.test(w.command)&&/未转换|尚未实现/.test(w.reason)));
  assert.ok(C.exportFiles(m).some(e=>e.path.endsWith('.tex')&&e.text.includes('\\boxed')));
 }
});
test('harpoon fallback preserves both labels without unsupported-math warnings',()=>{
 const m=convert(String.raw`$A\xrightleftharpoons[下]{上}B$`);
 assert.match(m.pages[0].html,/\\underset\{下\}\{\\overset\{上\}\{\\rightleftharpoons\}\}/);
 assert.ok(!warnings(m).some(w=>w.command==='rightleftharpoons'));
});
test('columns supports command and environment syntax and preserves nested assets and order',()=>{
 const m=convert(String.raw`\begin{columns}[c]\column{.4\textwidth}左\rightline{署名}\begin{column}[t]{.6\textwidth}右\begin{tikzpicture}\draw(0,0)--(1,1);\end{tikzpicture}\end{column}\end{columns}`);
 const columns=m.pages[0].blocks.find(b=>b.type==='columns');assert.equal(columns.children.length,2);
 assert.ok(Math.abs(columns.children[0].weight/columns.children[1].weight-2/3)<1e-12);
 assert.equal(m.pages[0].figures.length,1);
 assert.ok(m.pages[0].html.indexOf('左')<m.pages[0].html.indexOf('右'));
 assert.match(m.pages[0].html,/flex-wrap:wrap/);
 assert.ok(!warnings(m).some(w=>w.command==='columns'));
});
const root=path.resolve(__dirname,'../../..');
function lectureModel(){const dir=path.join(root,'讲稿/tex/sections'),style=path.join(root,'讲稿/tex/common/theme/_hanhai.sty'),fallback=path.join(root,'讲稿/tex/common/theme_hanhai.sty');return C.convert(fs.readdirSync(dir).filter(n=>/^0[0-9] /.test(n)).map(name=>({name,text:fs.readFileSync(path.join(dir,name),'utf8')})),[{name:'theme.sty',text:fs.readFileSync(fs.existsSync(style)?style:fallback,'utf8')}],{lectureBatch:true,figure:{engine:'local'}});}
test('real 00–09 lectures no longer emit reported parser and layout warnings',()=>{
 const m=lectureModel();assert.ok(m.pages.length>100);
 assert.deepEqual(warnings(m).filter(w=>/^(rightline|xymatrix@R|xymatrix@C|ar@?|draw|filldraw|node|rightleftharpoons|columns)$/.test(w.command)),[]);
 const figures=m.pages.flatMap(p=>p.figures);
 assert.ok(figures.some(f=>f.raw.includes('复数的代数表示')));
 assert.ok(figures.some(f=>f.raw.includes('复平面')));
 assert.ok(figures.some(f=>f.raw.includes('xRightarrow')));
});
test('real reported diagrams compile both light and dark SVG',{skip:process.env.TEX2HTML_LATEX_TEST!=='1',timeout:300000},async()=>{
 const m=lectureModel();const figures=m.pages.flatMap(p=>p.figures).filter(f=>/复数的代数表示|复平面|xRightarrow|xymatrix@/.test(f.raw));
 assert.ok(figures.length>=10);
 for(const f of figures){const req=C.figureCompileRequest(f.raw,m.registry.macros,m.config.figure);try {const r=await compile(req.source,f.kind,req.options);assert.match(r.svg,/<(?:path|use)\b/);assert.match(r.darkSvg,/<(?:path|use)\b/);console.log('Compiled '+f.file+':'+f.sourceStartLine);}catch(e){throw Error(f.file+':'+f.sourceStartLine+' '+e.message+'\n'+(e.log||'').slice(-2500));}}
});
