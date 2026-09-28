'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../core'),S=require('../server');
const raw=String.raw`\xymatrix{
\text{$\mathbb C$-线性空间} \ar@{}[r]|-{+} & \text{内积(??)} \ar@{=>}[r] & \text{??空间} \\
}`;
test('old dvisvgm uses PDF while fixed versions keep XDV',()=>{
 for(const version of ['2.14','3.0.3','3.0.4'])assert.equal(S.compilerFormat('dvisvgm '+version),'pdf');
 for(const version of ['3.1','3.1.2','3.10.1','4.0'])assert.equal(S.compilerFormat('dvisvgm '+version),'xdv');
 assert.throws(()=>S.compilerFormat('unknown'));
 const pdf=S.wrap(raw,'xypic',{},false,'pdf'),xdv=S.wrap(raw,'xypic',{},false);
 assert.match(pdf,/pgfsys-xetex\.def/);assert.match(pdf,/\\usepackage\[xetex\]\{xcolor\}/);
 assert.match(xdv,/pgfsys-dvisvgm\.def/);
});
test('standalone diagram cache survives math wrappers and Windows line endings',()=>{
 const variants=[raw,raw.replace(/\n/g,'\r\n'),`\\[\n${raw}\n\\]`,`$${raw}$`,`\\begin{equation*}${raw}\\end{equation*}`];
 const canonical=C.figureCacheKeys(raw)[0];
 for(const saved of variants)for(const current of variants){
  const id=C.figureKey(saved),svg='<svg viewBox="0 0 1 1"><path d="M0 0L1 1"/></svg>',replacements={[id]:{svg}};
  // Lookup includes the actual historical wrapper, not arbitrary equivalent wrappers.
  if(!C.figureCacheKeys(current).includes(id))continue;
  const m=C.convert([{name:'test.tex',text:String.raw`\begin{frame}`+current+String.raw`\end{frame}`}],[],{figure:{engine:'local',replacements}});
  assert.equal(m.pages[0].figures[0].figureId,canonical);
  assert.equal(m.pages[0].figures[0].svg,svg);
 }
 assert.ok(C.figureCacheKeys(`\\[\n${raw}\n\\]`).includes(C.figureKey(raw.replace(/\n/g,'\r\n'))));
});
test('boxed diagrams and surrounding formulas must not reuse the unboxed picture',()=>{
 const id=C.figureCacheKeys(raw)[0];
 assert.notEqual(C.figureCacheKeys(`$\\boxed{${raw}}$`)[0],id);
 assert.notEqual(C.figureCacheKeys(`$A+${raw}$`)[0],id);
 assert.notEqual(C.figureCacheKeys(`$${raw}${raw}$`)[0],id);
});

test('legacy Chinese XDV caches need repair; PDF, fixed XDV, uploads and plain SVG do not',()=>{
 const svg=fs.readFileSync(path.join(__dirname,'fixtures/legacy-chinese-xdv.svg'),'utf8'),figure={raw,svg,kind:'xypic'};
 assert.equal(C.figureNeedsBaselineRepair(figure),true);
 assert.equal(C.figureNeedsBaselineRepair({...figure,compiler:{format:'xdv',version:'dvisvgm 3.0.3'}}),true);
 for(const patch of [{origin:'upload'},{path:'custom.svg'},{compiler:{format:'pdf',version:'dvisvgm 3.0.3'}},{compiler:{format:'xdv',version:'dvisvgm 3.1'}},{svg:svg.replace('<svg ','<svg data-tex2html-format="pdf" ')},{svg:svg.replace('<svg ','<svg data-tex2html-version="dvisvgm 3.1" ')},{svg:'<svg viewBox="0 0 1 1"><path d="M0 0L1 1"/></svg>'},{raw:String.raw`\xymatrix{U \ar[r]&V}`}])assert.equal(C.figureNeedsBaselineRepair({...figure,...patch}),false);
});
test('reported Chinese diagram compiles with the version-selected route in both themes',{skip:process.env.TEX2HTML_LATEX_TEST!=='1',timeout:90000},async()=>{
 const result=await S.compile(raw,'xypic',{dark:true});
 assert.equal(result.compiler.format,S.compilerFormat(result.compiler.version));
 for(const svg of [result.svg,result.darkSvg]){assert.match(svg,/<svg/);assert.ok((svg.match(/<path\b/g)||[]).length>=10);assert.doesNotMatch(svg,/<image\b/);}
 if(result.compiler.format==='pdf')assert.match(result.warnings.join(' '),/PDF.*中文基线/);
 // Saved only for manual visual review; normal tests do not modify course assets.
 if(process.env.TEX2HTML_BASELINE_ARTIFACTS==='1'){
  const dir=path.resolve(__dirname,'../../../work/diagnostics-preview');fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'reported-fixed.svg'),result.svg);fs.writeFileSync(path.join(dir,'reported-fixed-dark.svg'),result.darkSvg);
 }
});
