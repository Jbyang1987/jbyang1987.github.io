'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('../core'),{wrap,validate,compile}=require('../server'),table=require('./table-fixture');
test('complex table stays intact for LaTeX, with working-source positions and cached export',()=>{
 const source='前言\n\n'+table+'\n\n结语',model=C.convert([{name:'00 introduction.tex',text:source}],[],{lectureBatch:true});
 const f=model.pages[0].figures[0];assert.equal(f.kind,'table');assert.equal(f.raw,table);assert.equal(source.slice(f.sourceStart,f.sourceEnd),table);
 assert.equal(model.pages[0].warnings.length,1);assert.match(f.error,/LaTeX/);assert.match(f.caption,/表格/);
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><path d="M0 0"/></svg>';
 const restored=C.convert([{name:'00 introduction.tex',text:source}],[],{lectureBatch:true,figure:{replacements:{[f.figureId]:{svg,darkSvg:svg}}}});
 const files=C.exportFiles(restored);assert.equal(restored.pages[0].figures[0].error,'');assert.ok(files.some(f=>f.path.startsWith('assets/chapter00/')&&f.path.endsWith('-dark.svg')));
 assert.ok(files.some(f=>f.path.endsWith('.tex')&&f.text===table));
});
test('simple tabular stays HTML; complex standalone and nested tables use LaTeX',()=>{
 const simple=C.convert([{name:'test.tex',text:String.raw`\begin{tabular}{cc}a & b\\\hline c & d\end{tabular}`}],[]);
 assert.match(simple.pages[0].html,/<table/);assert.equal(simple.pages[0].figures.length,0);
 for(const tex of [table.replace(/\\begin\{table\}\[\]|\\end\{table\}/g,''),String.raw`\begin{example}[比较]`+table+String.raw`\end{example}`]){
  const model=C.convert([{name:'test.tex',text:tex}],[]);assert.equal(model.pages[0].figures[0].kind,'table');
 }
});
test('table wrapper removes floats while preserving merged cells and file restrictions',()=>{
 const doc=wrap(table,'table',{},false);assert.doesNotMatch(doc,/\\begin\{table\}/);assert.match(doc,/\\multicolumn\{2\}/);assert.match(doc,/\\cline/);assert.match(doc,/mathtools/);
 validate(table,{});assert.throws(()=>validate(table+String.raw`\input{private.tex}`,{}));
});
test('legacy example CSS acquires a full frame without losing user CSS or duplicating patches',()=>{
 const config=C.defaults();config.environments.example.presentation='proof';
 const model=C.convert([{name:'test.tex',text:String.raw`\begin{example}[线性运算]正文\end{example}`}],[],config);
 assert.match(model.pages[0].html,/<fieldset/);assert.doesNotMatch(model.pages[0].html,/math-block-proof-style/);
 const old='.tex-converted .math-block-example{border:0!important}\n.user-note{color:red}';
 const upgraded=C.ensureExampleFrameCSS(old,config);assert.ok(upgraded.startsWith(old));assert.match(upgraded,/border:1px solid #[a-f\d]{6}!important/);
 assert.equal(C.ensureExampleFrameCSS(upgraded,config),upgraded);assert.match(C.exportFiles({...model,cssText:old})[0].text,/Example frame compatibility/);
});
test('real LaTeX table compiles both themes',{skip:process.env.TEX2HTML_LATEX_TEST!=='1',timeout:180000},async()=>{
 const result=await compile(table,'table',{dark:true});assert.match(result.svg,/<svg/);assert.match(result.darkSvg,/<svg/);assert.match(result.svg,/<(?:path|use)/);
});
