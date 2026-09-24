/* 从统一目录与正文片段生成静态网页。运行：node scripts/build-lessons.js
   学生访问与上传网站无需 Node.js；所有生成文件一并保存。 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const checkOnly = process.argv.includes('--check');
const stale = [];
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'js/course.js'), 'utf8'), context);
const course = context.window.Course;
const chapter = course.chapters[0];
const section = chapter.lessons[0];
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const relative = (from, to) => path.posix.relative(path.posix.dirname(from), to.split('#')[0]) + (to.includes('#') ? '#' + to.split('#')[1] : '');
const prefix = file => '../'.repeat(file.split('/').length - 1);
const link = (file, target, text, attrs = '') => `<a href="${relative(file, target)}"${attrs}>${text}</a>`;
const content = (page, file) => fs.readFileSync(path.join(root, 'content/chapter01/section01', page.slug + '.html'), 'utf8').replaceAll('{{root}}', prefix(file));
const completion = (page, label = '本页') => `<div class="unit-completion"><button class="button button-primary" type="button" data-unit-complete="${page.id}" data-unit-label="${label}" disabled>标记${label}为已学会</button><p class="completion-message" data-unit-message="${page.id}" role="status" aria-live="polite"></p></div>`;
function sidebar(file, current) {
  return `<aside class="chapter-sidebar knowledge-sidebar" aria-label="本节目录">
    <details class="knowledge-menu" open><summary>本节目录 · 共 ${section.pages.length} 页</summary>
    <nav aria-label="知识页导航"><ol class="knowledge-list">${section.pages.map(page => `<li>${link(file, page.path, `<span class="knowledge-index">${String(page.number).padStart(2,'0')}</span><span>${escape(page.title)}<span class="knowledge-status" data-unit-status="${page.id}">未标记</span></span>`, current === page.id ? ' aria-current="page"' : '')}</li>`).join('\n')}</ol></nav></details>
    <div class="sidebar-footer"><p data-section-progress="${section.id}">已学会 0 / ${section.pages.length} 页</p><progress data-section-meter="${section.id}" max="${section.pages.length}" value="0" aria-label="本节学习进度"></progress><p>${link(file, section.path, '本节概览')} · ${link(file, section.readingPath, '整节阅读')}</p></div>
  </aside>`;
}
function shell(file, title, body, current = '', kind = 'knowledge') {
  const p = prefix(file);
  return `<!doctype html>
<html lang="zh-CN"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escape(title)}；1.1 向量及其运算，线性代数课程。">
  <title>${escape(title)} | 1.1 向量及其运算 | 线性代数</title>
  <link rel="icon" href="${p}assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${p}css/style.css"><link rel="stylesheet" href="${p}css/chapter01.css"><link rel="stylesheet" href="${p}css/lessons.css">
  <script defer src="${p}js/course.js"></script><script defer src="${p}js/progress.js"></script><script defer src="${p}js/main.js"></script>
  <script defer src="${p}js/mathjax-config.js"></script><script defer src="${p}assets/vendor/mathjax/tex-svg.js"></script>
</head><body data-page="${kind}" data-root="${p}" data-chapter="${chapter.id}" data-section="${section.id}"${current ? ` data-unit="${current}"` : ''}>
  <!-- 由 scripts/build-lessons.js 生成；正文请修改 content/chapter01/section01 中对应的片段。 -->
  <a class="skip-link" href="#main">跳到正文</a>
  <header class="site-header page-width"><a class="brand" href="${p}index.html" aria-label="线性代数课程首页"><img class="brand-mark" src="${p}assets/favicon.svg" width="36" height="36" alt=""><span>线性代数</span></a><nav class="header-nav" aria-label="课程导航">${link(file, chapter.path, '第一章目录')} ${link(file, 'index.html', '课程首页')}</nav></header>
  <div class="chapter-layout page-width">${sidebar(file,current)}<main id="main" class="chapter-content">
    <nav class="breadcrumbs" aria-label="当前位置">${link(file, chapter.path, '第一章 · 向量')}<span aria-hidden="true">/</span>${link(file, section.path, '1.1 向量及其运算')}</nav>
    <p class="storage-notice" data-storage-notice role="status" hidden></p>
    <noscript><p class="notice">正文、目录和翻页仍可使用。公式排版和学习记录需要在浏览器中允许脚本运行。</p></noscript>
    ${body}
  </main></div>
  <footer class="site-footer page-width"><span>线性代数 · 第一章 · 1.1</span><span>学习记录仅保存在你的浏览器中</span></footer>
</body></html>\n`;
}
function write(file, html) {
  const target = path.join(root,file);
  if (checkOnly) {
    if (!fs.existsSync(target) || fs.readFileSync(target,'utf8').replaceAll('\r\n','\n') !== html.replaceAll('\r\n','\n')) stale.push(file);
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target,html);
  }
}
function parts(file, includeCompletion = true) {
  return section.pages.map(page => `<section class="lesson knowledge-part" id="part-${page.slug}" data-reading-unit="${page.id}"><div class="lesson-heading"><span class="lesson-number">${page.number} / ${section.pages.length}</span><h2>${escape(page.title)}</h2></div>${content(page,file)}${includeCompletion ? completion(page) : ''}<p class="part-link">${link(file,page.path,'单独阅读这一页 →')}</p></section>`).join('\n');
}
section.pages.forEach((page,index) => {
  const prev = section.pages[index-1], next = section.pages[index+1];
  const nav = `<nav class="page-navigation" aria-label="前后翻页">${prev ? link(page.path,prev.path,`<span>← 上一页</span><strong>${escape(prev.title)}</strong>`) : link(page.path,section.path,'<span>← 返回本节目录</span><strong>1.1 向量及其运算</strong>')}${next ? link(page.path,next.path,`<span>下一页 →</span><strong>${escape(next.title)}</strong>`,' rel="next"') : link(page.path,chapter.lessons[1].path,'<span>下一节 →</span><strong>1.2 向量线性相关性</strong>',' rel="next"')}</nav>`;
  const body = `<header class="knowledge-intro"><p class="eyebrow">第 ${page.number} / ${section.pages.length} 页</p><h1>${escape(page.title)}</h1><p class="knowledge-goal">${escape(page.description)}</p></header>
    <article class="lesson knowledge-lesson">${content(page,page.path)}</article>
    ${completion(page)}${nav}<div class="reading-options">${link(page.path,section.path,'返回本节目录')}${link(page.path,section.readingPath+'#part-'+page.slug,'整节阅读')}</div>`;
  write(page.path,shell(page.path,page.title,body,page.id));
});
const cards = section.pages.map(page => `<li>${link(section.path,page.path,`<span class="knowledge-index">${String(page.number).padStart(2,'0')}</span><span><strong>${escape(page.title)}</strong><span class="card-description">${escape(page.description)}</span><span class="knowledge-status" data-unit-status="${page.id}">未标记</span></span><span aria-hidden="true">→</span>`)}</li>`).join('\n');
write(section.path,shell(section.path,'本节目录',`<header class="knowledge-intro"><p class="eyebrow">一页一个核心问题</p><h1>1.1 向量及其运算</h1><p>从认识向量开始，逐步理解加法、减法、数乘及其基本性质。按顺序阅读，也可以直接回到需要复习的一页。</p></header><div class="section-start"><a class="button button-primary" data-section-resume="${section.id}" href="${relative(section.path,section.pages[0].path)}">开始本节学习 →</a>${link(section.path,section.readingPath,'整节阅读与打印')}</div><p class="fine-print">翻页会记住阅读位置；点击“已学会”才计入完成进度。</p><ol class="knowledge-cards">${cards}</ol>`, '', 'section-index'));
write(section.readingPath,shell(section.readingPath,'整节阅读',`<header class="knowledge-intro" id="vector-operations"><p class="eyebrow">整节阅读 · 共 ${section.pages.length} 个部分</p><h1 id="title-operations">1.1 向量及其运算</h1><p>完整阅读本节，或使用浏览器的打印功能保存。${link(section.readingPath,section.pages[0].path,'切换到分页学习 →')}</p></header>${parts(section.readingPath)}<nav class="lesson-navigation" aria-label="下一节">${link(section.readingPath,section.path,'← 本节目录')}${link(section.readingPath,chapter.lessons[1].path,'下一节 · 1.2 →')}</nav>`, '', 'section-reading'));
// 旧的整章页面保留全部锚点；1.1 同样由上述正文生成，避免维护重复内容。
const chapterFile=path.join(root,chapter.path);
let chapterHtml=fs.readFileSync(chapterFile,'utf8');
const start='      <!-- 1.1 对应讲稿：向量及其运算 -->';
const end='      <!-- 1.2 对应讲稿：向量线性相关性 -->';
if(!chapterHtml.includes(start)||!chapterHtml.includes(end))throw new Error('找不到原章的 1.1 / 1.2 边界');
const first=chapterHtml.indexOf(start),last=chapterHtml.indexOf(end);
const replacement=`${start}
      <section class="lesson" id="vector-operations" aria-labelledby="title-operations"><div class="lesson-heading"><span class="lesson-number">1.1</span><h2 id="title-operations">向量及其运算</h2></div><div class="section-entry"><p>本节已拆成 ${section.pages.length} 个知识页，可以逐页学习。</p>${link(chapter.path,section.path,'打开本节目录 →',' class="button button-primary"')} ${link(chapter.path,section.readingPath,'整节阅读与打印')}<p data-section-progress="${section.id}">已学会 0 / ${section.pages.length} 页</p></div>${parts(chapter.path)}<nav class="lesson-navigation" aria-label="第 1.1 节前后导航"><a href="../index.html">← 返回课程首页</a><a href="#vector-dependence">下一节 · 1.2 →</a></nav></section>\n\n`;
chapterHtml=chapterHtml.slice(0,first)+replacement+chapterHtml.slice(last);
write(chapter.path,chapterHtml);
if (stale.length) throw new Error('请重新生成以下页面：' + stale.join('、'));
console.log(checkOnly ? '生成页面与正文、目录一致。' : `已生成 ${section.pages.length} 个知识页、本节目录和整节阅读，并同步原章的 1.1。`);
