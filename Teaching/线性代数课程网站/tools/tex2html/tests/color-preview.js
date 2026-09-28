/* Uses the real course source, converter and browser MathJax, not string-only checks. */
(async function () {
  const status = document.getElementById('status');
  try {
    await MathJax.startup.promise;
    const manifest = await (await fetch('../api/lecture-manifest')).json();
    async function source(path) {
      const response = await fetch('../api/lecture-file?path=' + encodeURIComponent(path));
      if (!response.ok) throw Error('无法读取 ' + path);
      return response.text();
    }
    const sty = await source(manifest.style);
    const chapter = await source('sections/01 vectors.tex');
    const equation = chapter.match(/\\begin\{equation\*\}\s*\\boxed\{\\blue\{\\text\{仿射坐标系\}\}[\s\S]*?\\end\{equation\*\}/)?.[0];
    if (!equation) throw Error('讲稿中找不到待验证的原公式');
    const cases = [
      { title: '讲稿原文：仿射坐标系', tex: equation, colors: ['#0000ff'], boxed: true },
      { title: '行内公式、蓝色范围和普通正文', tex: String.raw`普通正文 \blue{蓝色文字}。$A+\blue{x}+z$`, colors: ['#0000ff'], uncolored: 'z', textColor: true },
      { title: '嵌套红、蓝颜色与作用范围', tex: String.raw`\[\blue{x+\red{y}+w}+z\]`, colors: ['#0000ff', '#ff0000'], uncolored: 'z' },
      { title: '任意 RGB 数值', tex: String.raw`\[\textcolor[rgb]{0.2,0.4,0.6}{x}+\textcolor[RGB]{255,128,0}{y}+z\]`, colors: ['#336699', '#ff8000'], uncolored: 'z' },
      { title: '命名颜色与 HTML 颜色模型', tex: String.raw`\[\textcolor{blue}{x}+\textcolor[HTML]{336699}{y}+z\]`, colors: ['blue', '#336699'], uncolored: 'z' }
    ];
    const sheet = document.createElement('style');
    sheet.textContent = Tex2HTML.pageCSS(Tex2HTML.defaults());
    document.head.append(sheet);
    let passed = 0;
    for (const example of cases) {
      const article = document.createElement('article');
      const heading = document.createElement('h2');
      heading.textContent = example.title;
      const body = document.createElement('div');
      body.className = 'formula';
      const result = document.createElement('p');
      result.className = 'result';
      article.append(heading, body, result);
      document.getElementById('cases').append(article);
      try {
        const model = Tex2HTML.convert([{ name: 'color.tex', text: String.raw`\begin{frame}\frametitle{测试}${example.tex}\end{frame}` }], [{ name: 'theme_hanhai.sty', text: sty }]);
        body.innerHTML = model.pages.map(p => p.html).join('');
        body.querySelectorAll('link').forEach(link => link.remove());
        await MathJax.typesetPromise([body]);
        if (!body.querySelector('mjx-container svg')) throw Error('没有生成 SVG 公式');
        const errors = body.querySelectorAll('[data-mjx-error], [data-mml-node="merror"], merror');
        if (errors.length) throw Error(Array.from(errors, e => e.getAttribute('data-mjx-error') || e.textContent).join('; '));
        if (/\\(?:blue|red|textcolor|color)\b|\[rgb\]/.test(body.textContent)) throw Error('仍有未识别的颜色命令');
        const fills = Array.from(body.querySelectorAll('svg [fill]'), n => n.getAttribute('fill').toLowerCase());
        for (const color of example.colors) if (!fills.includes(color)) throw Error('SVG 缺少预期颜色 ' + color);
        if (example.textColor) {
          const blue = body.querySelector('.tex-color-blue');
          if (!blue || getComputedStyle(blue).color !== 'rgb(37, 99, 235)') throw Error('普通正文蓝色丢失');
        }
        if (example.boxed && !body.querySelector('[data-mml-node="menclose"]')) throw Error('公式边框丢失');
        if (example.uncolored) {
          const tail = Array.from(body.querySelectorAll('mjx-assistive-mml mi')).find(n => n.textContent === example.uncolored);
          if (!tail) throw Error('后续公式内容丢失');
          if (tail.closest('[mathcolor]')) throw Error('颜色泄漏到后续内容');
        }
        passed++;
        result.classList.add('pass');
        result.textContent = '通过：已生成 SVG，颜色与作用范围正确';
      } catch (error) {
        result.classList.add('fail');
        result.textContent = '失败：' + error.message;
      }
    }
    status.textContent = `${passed}/${cases.length} 项浏览器实际排版验证通过`;
    status.dataset.passed = String(passed);
    status.dataset.total = String(cases.length);
  } catch (error) {
    status.textContent = '验证失败：' + error.message;
  }
})();
