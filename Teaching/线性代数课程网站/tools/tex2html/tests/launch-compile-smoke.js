'use strict';
// Run after the real Windows launcher: exercises the same HTTP compiler as the UI.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../core');
const root = path.resolve(__dirname, '../../..');
const base = 'http://127.0.0.1:4174';

async function main() {
  assert.equal((await fetch(base + '/tools/tex2html/')).status, 200);
  const health = await (await fetch(base + '/health')).json();
  assert.equal(health.ok, true);
  const manifest = await (await fetch(base + '/api/lecture-manifest')).json();
  const style = fs.readFileSync(path.join(root, '讲稿/tex', manifest.style), 'utf8');
  const tex = fs.readFileSync(path.join(root, '讲稿/tex/sections/01 vectors.tex'), 'utf8');
  const model = C.convert([{name: '01 vectors.tex', text: tex}], [{name: '_hanhai.sty', text: style}], {figure: {engine: 'local'}});
  const figures = model.pages.flatMap(page => page.figures).slice(0,7);
  assert.equal(figures.length,7);
  for (const marker of ['\\tikzmath', '\\tkzMarkRightAngle', '固定一个点']) {
    assert.ok(figures.some(f=>f.raw.includes(marker)), 'Missing figure: ' + marker);
  }
  // Reproduce a real saved workspace larger than the server's request limit.
  model.config.figure.replacements.old={svg:'<svg>'+' '.repeat(300000)+'</svg>'};
  assert.ok(Buffer.byteLength(JSON.stringify(model.config.figure))>260000);
  for (const figure of figures) {
    const request=C.figureCompileRequest(figure.raw,model.registry.macros,model.config.figure);
    if(figure.raw.includes('固定一个点'))assert.ok(request.source.includes('$O$(原点)'));
    const body=JSON.stringify(request);
    assert.ok(Buffer.byteLength(body)<260000);
    const response = await fetch(base + '/convert/' + figure.kind, {
      method: 'POST', headers: {'Content-Type': 'application/json', 'X-Tex2HTML-Token': health.token},
      body,
      signal: AbortSignal.timeout(150000)
    });
    const result = await response.json();
    assert.equal(response.status, 200, result.error + '\n' + (result.log || '').slice(-2000));
    for (const key of ['svg', 'darkSvg']) {
      assert.match(result[key], /<svg/);
      assert.match(result[key], /<(?:path|use)\b/);
    }
    model.config.figure.replacements[figure.figureId]={svg:result.svg,darkSvg:result.darkSvg};
    console.log('PASS ' + figure.figureId + ': request ' + Buffer.byteLength(body) + ' bytes; light ' + result.svg.length + ' bytes, dark ' + result.darkSvg.length + ' bytes');
  }
  console.log('PASS: all 7 figures compiled with a saved SVG cache exceeding 260 KB.');
}
main().catch(error => {console.error(error); process.exitCode = 1;});
