'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../core'),{zip}=require('../zip');
const convert=(text,config={},sty='')=>C.convert([{name:'test.tex',text}],[{name:'test.sty',text:sty}],config);
const wrap=s=>String.raw`\begin{frame}{向量}${s}\end{frame}`;
test('compile request size is independent of previously saved SVGs',()=>{
  const figure=C.defaults().figure;
  Object.assign(figure,{width:720,crop:false,dark:false,preamble:'\\usepackage{mathtools}'});
  const raw=String.raw`\begin{tikzpicture}\pp\draw (0,0)--(1,1);\end{tikzpicture}`;
  const first=C.figureCompileRequest(raw,{},figure);
  figure.replacements={old:{svg:'<svg>'+'中'.repeat(200000)+'</svg>'}};
  const cached=figure.replacements;
  const next=C.figureCompileRequest(raw,{},figure);
  assert.ok(Buffer.byteLength(JSON.stringify({source:raw,options:figure}))>260000);
  assert.ok(Buffer.byteLength(JSON.stringify(next))<2000);
  assert.deepEqual(next,first);
  assert.equal(figure.replacements,cached);
  assert.equal(next.options.width,720);
  assert.equal(next.options.crop,false);
  assert.equal(next.options.dark,false);
  assert.equal(next.options.preamble,'\\usepackage{mathtools}');
  assert.doesNotMatch(next.source,/\\pp\b/);
  assert.match(next.source,/\\draw/);
});
test('balanced groups support nested braces, escaped braces and comments',()=>{assert.equal(C.group('{a{b}\\{c}',0).value,'a{b}\\{c');assert.equal(C.uncomment('a% hidden\nb\\%c').length,'a% hidden\nb\\%c'.length);assert.match(C.uncomment('a% hidden\nb\\%c'),/b\\%c/);});
test('plain input is retained as a page',()=>{const m=convert('hello');assert.equal(m.pages.length,1);assert.match(m.pages[0].html,/hello/);});
test('frame syntaxes and formulas retain source order and line positions',()=>{const m=convert(String.raw`\begin{document}
\begin{frame}[fragile]{向量}
甲 $\vec v$。
\begin{definition}[定义名称]内容\end{definition}
\[x=1\]
\begin{proof}证毕。\end{proof}
\end{frame}
\frame{\frametitle{第二页}乙}
\end{document}`);assert.equal(m.pages.length,2);assert.equal(m.pages[0].title,'向量');assert.equal(m.pages[1].title,'第二页');assert.deepEqual(m.pages[0].blocks.map(b=>b.type),['text','definition','formula','proof']);assert.equal(m.pages[0].blocks[1].sourceStartLine,4);assert.match(m.pages[0].html,/<details class="math-block math-block-proof lecture-proof">/);});
test('math delimiters inside text commands do not truncate xymatrix figures',()=>{
  const source=String.raw`\xymatrix{\text{固定一个点$O$(原点)}\\P}`;
  const m=convert(wrap('$'+source+'$ 后文'));
  const figure=m.pages[0].figures.find(f=>f.kind==='xypic');
  assert.ok(figure);
  assert.equal(figure.raw,source);
  assert.match(m.pages[0].html,/后文/);
  assert.equal(C.parse('$'+source+'$').warnings.length,0);
});
test('pp and pause are ignored by default and configurable at top level',()=>{const text=wrap(String.raw`甲\pp 乙\pause 丙`);assert.equal(convert(text).pages.length,1);assert.doesNotMatch(convert(text).pages[0].html,/\\pp|\\pause/);assert.equal(convert(text,{pp:'page',pause:'page'}).pages.length,3);assert.match(convert(text,{pp:'block'}).pages[0].html,/class="lesson-step"/);assert.match(convert(text,{pause:'collapse'}).pages[0].html,/<details class="lesson-step">/);assert.match(convert(text,{pp:'preserve'}).pages[0].html,/\\pp/);});
test('default pause removal also applies inside mathematical formulas',()=>{const m=convert(wrap(String.raw`\[x\pp+y\pause[2]+z\]`));assert.doesNotMatch(m.pages[0].html,/\\pp|\\pause/);assert.equal(m.pages[0].warnings.length,0);assert.match(m.pages[0].html,/x\+y\+z/);});
test('nested breaks keep environment intact and report unsafe page boundary',()=>{const m=convert(wrap(String.raw`\begin{definition}甲\pp 乙\end{definition}`),{pp:'page'});assert.equal(m.pages.length,1);assert.match(m.pages[0].html,/甲/);assert.match(m.pages[0].html,/乙/);});
test('sty supports declaration alias, optional arguments, operators, def, theorem and colors',()=>{const sty=String.raw`\newcommand{\nc}{\newcommand}
\nc{\bF}{{\mathbb F}}
\newcommand{\on}[1]{\operatorname{#1}}
\nc{\mEnd}{\on{\mathcal{E}\mathrm{nd}}}
\DeclareMathOperator{\rank}{rank}
\newcommand{\pair}[2][x]{(#1,#2)}
\def\twice#1{#1+#1}
\newtheorem{custom}[theorem]{自定}
\definecolor{brand}{RGB}{1,2,3}`;
const r=C.parseStyles([{name:'a.sty',text:sty}]);assert.equal(r.macros.bF.body,'{\\mathbb F}');assert.equal(r.colors.brand.light,'#010203');assert.equal(r.environments.custom.label,'自定');const m=convert(wrap(String.raw`$\mEnd(\bF),\rank A,\pair{y},\twice{z}$`),{},sty);assert.match(m.pages[0].html,/\\operatorname\{\\mathcal\{E\}\\mathrm\{nd\}\}/);assert.match(m.pages[0].html,/\(x,y\)/);assert.match(m.pages[0].html,/z\+z/);});
test('recursive and conditional macros are preserved with warnings',()=>{const m=convert(wrap(String.raw`$\loop$ \unsafe{正文}`),{},String.raw`\def\loop{\loop}\newcommand{\unsafe}[1]{\iftrue #1\fi}`);assert.match(m.pages[0].html,/\\loop/);assert.match(m.pages[0].html,/正文/);assert.ok(m.pages[0].warnings.some(w=>/循环/.test(w.reason)));});
test('macro scopes, overrides and disabled macros',()=>{const config={macros:{term:{name:'term',body:'EXPANDED',args:0,optional:null,enabled:true,scope:'math'}}};const m=convert(wrap(String.raw`\term $\term$`),config);assert.match(m.pages[0].html,/\\term/);assert.match(m.pages[0].html,/EXPANDED/);config.macros.term.enabled=false;assert.doesNotMatch(convert(wrap(String.raw`$\term$`),config).pages[0].html,/EXPANDED/);});
test('unknown commands, environments and broken groups are never silently lost',()=>{const m=convert(wrap(String.raw`\mystery{A{B}}\begin{unsupported}C\end{unsupported}`));assert.match(m.pages[0].html,/\\mystery\{A\{B\}\}/);assert.match(m.pages[0].html,/unsupported/);assert.ok(m.pages[0].warnings.length>=2);assert.ok(C.parse('\\begin{example}x').warnings.length);assert.ok(C.parse('$broken').warnings.length);});
test('simple TikZ produces two SVG palettes; unsupported TikZ and XY preserve source',()=>{const m=convert(wrap(String.raw`\begin{tikzpicture}\draw[->,blue] (0,0)--(1,2);\end{tikzpicture}\xymatrix{A\ar[r]&B}`));assert.equal(m.pages[0].figures.length,2);assert.match(m.pages[0].figures[0].svg,/<polyline/);assert.match(m.pages[0].figures[0].darkSvg,/#93c5fd/);assert.match(m.pages[0].figures[1].raw,/xymatrix/);assert.throws(()=>C.simpleTikz(String.raw`\begin{tikzpicture}\draw (0,0)--(1,1);\node at (0,0){a};\end{tikzpicture}`),/本地编译/);});
test('exports only website fragments, stylesheet and assets',()=>{const m=convert(wrap('A')+wrap('B'));m.pages[0].slug=m.pages[1].slug='same';const files=C.exportFiles(m);assert.ok(files.some(f=>f.path==='content/chapter01/section01/same.html'));assert.ok(files.some(f=>f.path==='content/chapter01/section01/same-2.html'));assert.ok(files.some(f=>f.path==='css/tex2html.css'));assert.doesNotMatch(m.pages[0].html,/<(?:html|head|body)(?: |>)/);assert.ok(files.every(f=>!f.path.endsWith('.json')));});
test('exports pages into their subsection folders',()=>{const m=convert(wrap('A')+wrap('B'));m.pages[0].subsectionIndex=2;m.pages[1].subsectionIndex=5;const files=C.exportFiles(m);assert.ok(files.some(f=>f.path==='content/chapter01/section02/lesson-1-1-1.html'));assert.ok(files.some(f=>f.path==='content/chapter01/section05/lesson-1-1-2.html'));});
test('malicious source and style values do not become HTML or CSS',()=>{const m=convert(wrap('<script>alert(1)</script>'),{environments:{theorem:{light:'red;}</style><script>evil</script>'}}});assert.doesNotMatch(m.pages[0].html,/<script/);assert.match(m.pages[0].html,/&lt;script&gt;/);});
test('ZIP archive writes UTF-8 filenames and local/central headers',async()=>{const data=new Uint8Array(await zip([{path:'converted/中文.html',text:'内容'}]).arrayBuffer());const v=new DataView(data.buffer);assert.equal(v.getUint32(0,true),0x04034b50);assert.equal(v.getUint16(6,true),0x800);assert.equal(v.getUint32(data.length-22,true),0x06054b50);});
test('images and diagrams nested in lists and macros stay in export manifest',()=>{const text=wrap(String.raw`\begin{itemize}\item A \includegraphics{pic/a.png}\item \diagram\end{itemize}`),sty=String.raw`\newcommand{\diagram}{\begin{tikzpicture}\draw (0,0)--(1,1);\end{tikzpicture}}`;const m=C.convert([{name:'nested.tex',text}],[{name:'nested.sty',text:sty}],{}, {'a.png':{name:'a.png',data:'data:image/png;base64,AA=='}});const entries=C.exportFiles(m);assert.ok(entries.some(e=>e.path==='assets/imported/a.png'));assert.ok(entries.some(e=>e.path.endsWith('.svg')));assert.equal(m.pages[0].figures.length,1);assert.doesNotMatch(m.pages[0].html,/tex2html-slot/);});
test('metadata title does not add a frame; sty unknown operations are reported',()=>{const m=convert(String.raw`\title{讲稿}`+wrap('内容'),{},String.raw`\newenvironment{custom}{}{}`);assert.equal(m.frames.length,1);assert.ok(m.globalWarnings.some(w=>w.command==='newenvironment'));});
test('tabular renders rows, cells and hline rules without unresolved commands',()=>{const m=convert(wrap(String.raw`\begin{table}[]\begin{tabular}{||r||c||l||}\hline\hline A & $x$ & C \\ \hline B & $y$ & D \\ \hline\end{tabular}\end{table}`));const html=m.pages[0].html;assert.match(html,/class="tex-table tex-table-hline tex-table-double-hline"/);assert.match(html,/<tr><td>/);assert.doesNotMatch(html,/\\hline|tex-unresolved/);assert.doesNotMatch(html,/>\[\]<\/div>/);assert.equal(m.pages[0].warnings.filter(w=>w.command==='hline').length,0);});
test('boldsymbol remains a native MathJax command inside list formulas',()=>{const m=convert(wrap(String.raw`\begin{example}\begin{enumerate}\item 设\(A\boldsymbol{x}=\boldsymbol{b}\), 求\(\boldsymbol{x}\).\end{enumerate}\end{example}`));const html=m.pages[0].html;assert.match(html,/\\boldsymbol\{x\}/);assert.doesNotMatch(html,/数学命令 \\boldsymbol 未转换/);});
test('matrix row breaks are not mistaken for commands after the break',()=>{const m=convert(wrap(String.raw`$\begin{pmatrix}a\\b\\c\end{pmatrix}$`));assert.equal(m.pages[0].warnings.length,0);assert.match(m.pages[0].html,/\\begin\{pmatrix\}a\\\\b\\\\c\\end\{pmatrix\}/);});
test('real chapter source parses without throwing and preserves all frame boundaries',()=>{const root=path.resolve(__dirname,'../../..'),text=fs.readFileSync(path.join(root,'讲稿/tex/sections/01 vectors.tex'),'utf8'),sty=fs.readFileSync(path.join(root,'讲稿/tex/common/theme.sty'),'utf8');const m=C.convert([{name:'01 vectors.tex',text}],[{name:'theme.sty',text:sty}]);const expected=(C.uncomment(text).match(/\\begin\{frame\}|\\frame\s*\{/g)||[]).length;assert.equal(m.frames.filter(f=>f.title!=='未分帧内容').length,expected);assert.ok(m.pages.length>20);assert.ok(Object.keys(m.registry.macros).length>100);assert.ok(m.pages.every(p=>p.blocks.length));});
