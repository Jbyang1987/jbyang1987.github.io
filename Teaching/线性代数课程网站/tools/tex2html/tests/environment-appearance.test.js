'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('../core');
test('all built-in environments have distinct light/dark palettes and no counters',()=>{
 const config=C.defaults(),environments=Object.values(config.environments);
 for(const key of ['light','dark','background','darkBackground','border','darkBorder'])assert.equal(new Set(environments.map(e=>e[key])).size,environments.length,key);
 assert.ok(environments.every(e=>e.numbered===false));
 const tex=Object.keys(config.environments).map(name=>String.raw`\begin{${name}}[线性运算]正文\end{${name}}`).join('\n');
 const model=C.convert([{name:'03 matrices.tex',text:tex}],[],{lectureBatch:true,environments:{theorem:{numbered:true}}});
 assert.equal(model.pages[0].chapter,3);assert.equal(model.pages[0].number,'3.1.1');
 assert.doesNotMatch(model.pages[0].html,/math-block-number/);assert.match(model.pages[0].html,/（线性运算）/);
 C.walkBlocks(model.pages[0].blocks,b=>{if(b.environment)assert.equal(b.number,undefined);});
});
test('legacy numbering cannot return from global, page or declared environment settings',()=>{
 const model=C.convert([{name:'test.tex',text:String.raw`\begin{observation}[标题]内容\end{observation}`}],[{name:'test.sty',text:String.raw`\newtheorem{observation}{观察}`}],{environments:{theorem:{numbered:true}}});
 model.pages[0].rules={environments:{observation:{...model.config.environments.observation,numbered:true}}};model.pages[0].blocks[0].number='8.99';C.refresh(model);
 assert.doesNotMatch(model.pages[0].html,/8\.99|math-block-number/);assert.match(model.pages[0].html,/观察/);
});
test('palette updates retain layout, labels, collapse and conversion settings',()=>{
 const upgraded=C.applyEnvironmentPaletteDefaults({chapter:8,pp:'page',figure:{width:777},environments:{theorem:{label:'结论',padding:25,collapsed:true,light:'#000000',numbered:true}}});
 assert.equal(upgraded.chapter,8);assert.equal(upgraded.pp,'page');assert.equal(upgraded.figure.width,777);assert.equal(upgraded.environments.theorem.label,'结论');assert.equal(upgraded.environments.theorem.padding,25);assert.equal(upgraded.environments.theorem.collapsed,true);
 assert.equal(upgraded.environments.theorem.light,C.defaults().environments.theorem.light);assert.equal(upgraded.environmentPaletteVersion,1);
});
test('managed CSS preserves unrelated rules, supports page palettes, and stays stable',()=>{
 const model=C.convert([{name:'test.tex',text:String.raw`\begin{definition}内容\end{definition}`}],[]);model.pages[0].rules={environments:{definition:{light:'#123456',dark:'#abcdef'}}};
 const original='.user-note{padding:7px}\n.tex-converted .math-block-definition{background:red!important}';
 const update=css=>C.ensureExampleFrameCSS(C.ensureEnvironmentPaletteCSS(css,model),model.config),css=update(original);
 assert.ok(css.startsWith(original));assert.equal(update(css),css);assert.match(css,/color:#123456!important/);assert.match(css,/color:#abcdef!important/);
 model.cssText=css;assert.equal(C.exportFiles(model)[0].text,css);
});
