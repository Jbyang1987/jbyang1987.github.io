'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../core');
const root=path.resolve(__dirname,'../../..');
const sty={name:'theme_hanhai.sty',text:fs.readFileSync(path.join(root,'讲稿/tex/common/theme_hanhai.sty'),'utf8')};
const convert=text=>C.convert([{name:'colors.tex',text:String.raw`\begin{frame}\frametitle{颜色}${text}\end{frame}`}],[sty]);

test('real lecture blue macro keeps native textcolor, RGB arguments and nested content',()=>{
  const chapter=fs.readFileSync(path.join(root,'讲稿/tex/sections/01 vectors.tex'),'utf8');
  const equation=chapter.match(/\\begin\{equation\*\}\s*\\boxed\{\\blue\{\\text\{仿射坐标系\}\}[\s\S]*?\\end\{equation\*\}/)[0];
  const model=convert(equation),html=model.pages[0].html;
  assert.match(html,/\\boxed\{/);
  assert.match(html,/\\textcolor\[rgb\]\{0,0,1\}\{\\text\{仿射坐标系\}\}/);
  assert.match(html,/\\textcolor\[rgb\]\{0,0,1\}\{\[O;/);
  assert.doesNotMatch(html,/\\blue\b|\\color\b/);
  assert.equal(model.pages[0].warnings.length,0);
});

test('nested colors keep each textcolor group and trailing mathematical content',()=>{
  const model=convert(String.raw`\[\blue{x+\red{y}+w}+z\]`),html=model.pages[0].html;
  assert.match(html,/\\textcolor\[rgb\]\{0,0,1\}\{x\+\{\\textcolor\[rgb\]\{1,0,0\}\{y\}\}\+w\}\}\+z/);
  assert.doesNotMatch(html,/\\color\b/);
  assert.equal(model.pages[0].warnings.length,0);
});

test('math color models preserve named/RGB colors and normalize HTML without dropping arguments',()=>{
  const html=convert(String.raw`\[\textcolor{blue}{x}+\textcolor[RGB]{255,128,0}{y}+\textcolor[HTML]{336699}{z}\]`).pages[0].html;
  assert.match(html,/\\textcolor\{blue\}\{x\}/);
  assert.match(html,/\\textcolor\[RGB\]\{255,128,0\}\{y\}/);
  assert.match(html,/\\textcolor\{#336699\}\{z\}/);
});

test('text color models distinguish RGB from rgb and reject unsafe CSS values',()=>{
  const model=convert(String.raw`\textcolor[rgb]{0,0,1}{蓝} \textcolor[RGB]{255,128,0}{橙} \textcolor[HTML]{336699}{色} \textcolor[HTML]{red;position:fixed}{保留文字}`);
  assert.match(model.pages[0].html,/color:#0000ff/);
  assert.match(model.pages[0].html,/color:#ff8000/);
  assert.match(model.pages[0].html,/color:#336699/);
  assert.doesNotMatch(model.pages[0].html,/position:fixed/);
  assert.match(model.pages[0].html,/保留文字/);
  assert.equal(model.pages[0].warnings.length,1);
});

test('shared MathJax config loads pinned local color and boldsymbol extensions at nested site paths',()=>{
  const source=fs.readFileSync(path.join(root,'js/mathjax-config.js'),'utf8');
  const context={window:{},document:{currentScript:{src:'https://example.test/Teaching/course/js/mathjax-config.js'}},URL};
  vm.runInNewContext(source,context);
  const config=context.window.MathJax;
  assert.ok(config.tex.packages.includes('color'));
  assert.ok(config.tex.packages.includes('boldsymbol'));
  assert.ok(config.tex.packages.includes('mathtools'));
  assert.ok(config.loader.load.includes('[tex]/color'));
  assert.ok(config.loader.load.includes('[tex]/boldsymbol'));
  assert.ok(config.loader.load.includes('[tex]/mathtools'));
  assert.equal(config.loader.paths.mathjax,'https://example.test/Teaching/course/assets/vendor/mathjax');
  const extension=fs.readFileSync(path.join(root,'assets/vendor/mathjax/input/tex/extensions/color.js'),'utf8');
  assert.match(extension,/3\.2\.2/);
  const boldsymbol=fs.readFileSync(path.join(root,'assets/vendor/mathjax/input/tex/extensions/boldsymbol.js'),'utf8');
  assert.match(boldsymbol,/3\.2\.2/);
  const mathtools=fs.readFileSync(path.join(root,'assets/vendor/mathjax/input/tex/extensions/mathtools.js'),'utf8');
  assert.match(mathtools,/3\.2\.2/);
});
