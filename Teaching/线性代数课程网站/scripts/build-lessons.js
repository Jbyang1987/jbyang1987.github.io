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
const link = (file, target, text, attrs = '') => `<a href="${relative(file, target)}"${attrs}>${String(text).replace(/<span aria-hidden="true">[↗→←↑]<\/span>/g, '').replace(/[↗→←↑]/g, '')}</a>`;
const pageNumber = (info, page) => `${info.number}.${page.number}`;
const content = (page, file) => fs.readFileSync(path.join(root, 'content/chapter01/section01', page.slug + '.html'), 'utf8').replaceAll('{{root}}', prefix(file));
const completion = (page, label = '本页', includeNext = true) => `<div class="unit-completion"><button class="button button-primary" type="button" data-unit-complete="${page.id}" data-unit-label="${label}" disabled>标记${label}为已学会</button><p class="completion-message" data-unit-message="${page.id}" role="status" aria-live="polite"></p>${includeNext ? `<p class="completion-next" data-next-unlearned="${page.id}" aria-live="polite"></p>` : ''}</div>`;
function sidebar(file, current) {
  return `<aside class="chapter-sidebar knowledge-sidebar" aria-label="本节目录">
    <details class="knowledge-menu" open><summary>本节目录 · 共 ${section.pages.length} 页</summary>
    <nav aria-label="知识页导航"><ol class="knowledge-list">${section.pages.map(page => `<li>${link(file, page.path, `<span class="knowledge-index">${pageNumber(section,page)}</span><span>${escape(page.title)}<span class="knowledge-status" data-unit-status="${page.id}">未标记</span></span>`, current === page.id ? ' aria-current="page"' : '')}</li>`).join('\n')}</ol></nav></details>
    <div class="sidebar-footer"><p data-section-progress="${section.id}">已学会 0 / ${section.pages.length} 页</p><progress data-section-meter="${section.id}" max="${section.pages.length}" value="0" aria-label="本节学习进度"></progress><p>${link(file, section.path, '本节概览')} · ${link(file, section.readingPath, '整节阅读')}</p></div>
  </aside>`;
}
function sectionPathNav(file, info, includeSection = true) {
  const sectionCrumb = includeSection ? `<span aria-hidden="true">/</span>${link(file,info.path,`${info.number} ${escape(info.title)}`)}` : '';
  return `<nav class="header-nav breadcrumb-header-nav" aria-label="当前位置"><span class="header-path">${link(file,'index.html','线性代数')}<span aria-hidden="true">/</span>${link(file,chapter.path,'第一章 · 向量')}${sectionCrumb}</span><button class="header-print-button" type="button" data-print-page title="在打印窗口中选择另存为 PDF">保存 PDF</button></nav>`;
}
function shell(file, title, body, current = '', kind = 'knowledge') {
  const p = prefix(file);
  const indexPage = kind === 'section-index';
  const layoutClass = indexPage ? 'chapter-home-layout' : 'chapter-knowledge-layout';
  const sidebarHtml = '';
  const breadcrumbs = '';
  return `<!doctype html>
<html lang="zh-CN"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escape(title)}；${section.number} ${escape(section.title)}，线性代数课程。">
  <title>${escape(title)}${indexPage ? "" : " | " + section.number + " " + escape(section.title)} | 线性代数</title>
  <link rel="icon" href="${p}assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${p}css/style.css"><link rel="stylesheet" href="${p}css/chapter01.css"><link rel="stylesheet" href="${p}css/lessons.css">
  <script defer src="${p}js/course.js"></script><script defer src="${p}js/progress.js"></script><script defer src="${p}js/main.js"></script>
  <script defer src="${p}js/mathjax-config.js"></script><script defer src="${p}assets/vendor/mathjax/tex-svg.js"></script>
</head><body data-page="${kind}" data-root="${p}" data-chapter="${chapter.id}" data-section="${section.id}"${current ? ` data-unit="${current}"` : ''}>
  <!-- 由 scripts/build-lessons.js 生成；正文请修改 content/chapter01/section01 中对应的片段。 -->
  <a class="skip-link" href="#main">跳到正文</a>
  <header class="site-header page-width"><a class="brand" href="${p}index.html" aria-label="线性代数课程首页"><img class="brand-mark" src="${p}assets/favicon.svg" width="36" height="36" alt=""><span>线性代数</span></a>${sectionPathNav(file,section,kind !== 'section-index')}</header>
  <div class="${layoutClass} page-width">${sidebarHtml}<main id="main" class="chapter-content">
    ${breadcrumbs}
    <p class="storage-notice" data-storage-notice role="status" hidden></p>
    <noscript><p class="notice">正文、目录和翻页仍可使用。公式排版和学习记录需要在浏览器中允许脚本运行。</p></noscript>
    ${body}
  </main></div>
  <footer class="site-footer page-width"><span>版权所有 © 线性代数课程</span></footer>
</body></html>\n`;
}
function write(file, html) {
  html = html.replaceAll('开始本节学习 →', '开始本节学习');
  const target = path.join(root,file);
  if (checkOnly) {
    if (!fs.existsSync(target) || fs.readFileSync(target,'utf8').replaceAll('\r\n','\n') !== html.replaceAll('\r\n','\n')) stale.push(file);
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target,html);
  }
}
function parts(file, includeCompletion = true, includeNext = true) {
  return section.pages.map(page => `<section class="lesson knowledge-part" id="part-${page.slug}" data-reading-unit="${page.id}"><div class="lesson-heading"><span class="lesson-number knowledge-index-number">§${pageNumber(section,page)}</span><h2><a class="heading-link" href="${relative(file,page.path)}">${escape(page.title)}</a></h2></div>${content(page,file)}${includeCompletion ? completion(page, '本页', includeNext) : ''}</section>`).join('\n');
}
function sectionIndexBody(info, file) {
  const first = info.pages[0];
  const entries = info.pages.map(page => `<li>${link(file,page.path,`${pageNumber(info,page)} ${escape(page.title)}`)}<span data-unit-status="${page.id}">未标记</span></li>`).join('');
  return `<section class="chapter-top-card section-top-card" aria-label="${info.number} ${escape(info.title)}简介、进度与目录"><header class="chapter-intro"><h1>${info.number} ${escape(info.title)}</h1><p>${escape(info.description)}</p><div class="chapter-hero-actions"><div class="chapter-resume"><a class="button button-primary" data-section-resume="${info.id}" href="${relative(file,first.path)}"><span data-section-resume-action>开始学习</span></a><p class="chapter-resume-title" data-section-resume-title>${pageNumber(info,first)} · ${escape(first.title)}</p></div><div class="chapter-progress"><div class="chapter-progress-heading"><div class="chapter-progress-heading-main"><span>学习进度</span><strong data-section-progress-percent>0%</strong></div><span data-section-progress-count>已学会 0 / ${info.pages.length} 页</span></div><progress data-section-meter="${info.id}" max="${info.pages.length}" value="0" aria-label="${info.number}学习进度">0%</progress></div></div></header><nav class="chapter-outline" aria-label="${info.number}知识页目录"><h2>本节目录</h2><ul>${entries}</ul></nav></section>`;
}
function fullReadingBody(info, file) {
  const partsHtml = info.pages.map(page => {
    const fragment = info === section ? content(page,file) : additionalContent(page,file);
    return `<section class="lesson knowledge-part" id="part-${page.slug}" data-reading-unit="${page.id}"><div class="lesson-heading"><span class="lesson-number knowledge-index-number">§${pageNumber(info,page)}</span><h2><a class="heading-link" href="${relative(file,page.path)}">${escape(page.title)}</a></h2></div>${fragment}${info === section ? completion(page,'本页',false) : additionalCompletion(page,false)}</section>`;
  }).join('');
  const sectionIndex = chapter.lessons.indexOf(info), previousSection = chapter.lessons[sectionIndex - 1], nextSection = chapter.lessons[sectionIndex + 1];
  const previousLink = previousSection
    ? link(file,previousSection.path,`上一节 · ${previousSection.number} ${escape(previousSection.title)}`)
    : '';
  const reviewLink = link(file,info.path+'#main','回顾本节');
  const nextLink = nextSection
    ? link(file,nextSection.path,`下一节 · ${nextSection.number} ${escape(nextSection.title)}`)
    : link(file,chapter.path,'返回第一章目录');
  return `<section class="section-full-reading" id="full-reading" aria-label="本节正文">${partsHtml}<nav class="lesson-navigation" aria-label="子节导航">${link(file,'index.html','返回课程首页')}${previousLink}${reviewLink}${nextLink}</nav></section>`;
}
section.pages.forEach((page,index) => {
  const prev = section.pages[index-1], next = section.pages[index+1];
  const nav = `<nav class="page-navigation" aria-label="前后翻页">${prev ? link(page.path,prev.path,`<span>← 上一页</span><strong>${escape(prev.title)}</strong>`) : link(page.path,section.path,'<span>← 返回本节目录</span><strong>1.1 向量及其运算</strong>')}${next ? link(page.path,next.path,`<span>下一页 →</span><strong>${escape(next.title)}</strong>`,' rel="next"') : link(page.path,chapter.lessons[1].path,'<span>下一节 →</span><strong>1.2 向量线性相关性</strong>',' rel="next"')}</nav>`;
  const body = `<header class="knowledge-intro"><h1 class="knowledge-page-title"><span class="knowledge-page-number">§${pageNumber(section,page)}</span><span>${escape(page.title)}</span></h1><p class="knowledge-goal">${escape(page.description)}</p></header>
    <article class="lesson knowledge-lesson">${content(page,page.path)}</article>
    ${completion(page)}${nav}<div class="reading-options">${index > 0 ? link(page.path,section.path,'返回本节目录') : ''}${link(page.path,section.readingPath+'#part-'+page.slug,'整节阅读')}</div>`;
  write(page.path,shell(page.path,page.title,body,page.id));
});
write(section.path,shell(section.path,`${section.number} ${section.title}`,sectionIndexBody(section,section.path)+fullReadingBody(section,section.path),'','section-index'));
// 旧的整章页面保留全部锚点；1.1 同样由上述正文生成，避免维护重复内容。
const chapterFile=path.join(root,chapter.path);
let chapterHtml=fs.readFileSync(chapterFile,'utf8');
const start='      <!-- 1.1 对应讲稿：向量及其运算 -->';
const end='      <!-- 1.2 对应讲稿：向量线性相关性 -->';
if(!chapterHtml.includes(start)||!chapterHtml.includes(end))throw new Error('找不到原章的 1.1 / 1.2 边界');
const first=chapterHtml.indexOf(start),last=chapterHtml.indexOf(end);
const replacement=`${start}
      <section class="lesson" id="vector-operations" aria-labelledby="title-operations"><div class="lesson-heading"><span class="lesson-number chapter-section-index">§1.1</span><h2 id="title-operations"><a class="heading-link" href="${relative(chapter.path,section.path)}">向量及其运算</a></h2></div>${parts(chapter.path, true, false)}</section>\n\n`;
chapterHtml=chapterHtml.slice(0,first)+replacement+chapterHtml.slice(last);
// 章节目录优先进入分页目录；旧的 #anchor 仍保留在正文中供收藏链接使用。
const outlineStart = chapterHtml.indexOf('<nav class="chapter-outline"');
const outlineEnd = outlineStart < 0 ? -1 : chapterHtml.indexOf('</nav>', outlineStart);
if (outlineStart >= 0 && outlineEnd >= 0) {
  let outline = chapterHtml.slice(outlineStart, outlineEnd);
  chapter.lessons.slice(1).forEach(function (info) {
    outline = outline.replace(`href="#${info.anchor}"`, `href="${relative(chapter.path, info.path)}"`)
      .replace(`href="chapter01.html#${info.anchor}"`, `href="${relative(chapter.path, info.path)}"`)
      .replace(`>${info.number} ${info.title}</a> · 整节阅读`, `>${info.number} ${info.title}</a> · ${info.pages.length} 个知识页`);
  });
  chapterHtml = chapterHtml.slice(0, outlineStart) + outline + chapterHtml.slice(outlineEnd);
}
/* 1.2–1.5 使用原整节页面作为内容来源，按 sourceRanges 拆成知识页。
   这样旧的整节阅读和锚点继续存在，同时新页面不复制另一份手写正文。 */
function directBlocks(inner) {
  const token = /<\/?[A-Za-z][^>]*>/g;
  const voidTags = /^(img|br|hr|input|meta|link)$/i;
  let depth = 0, start = -1, match, blocks = [];
  while ((match = token.exec(inner))) {
    const tag = match[0];
    if (/^<\//.test(tag)) {
      if (depth > 0) { depth -= 1; if (depth === 0) { blocks.push(inner.slice(start, token.lastIndex)); start = -1; } }
      continue;
    }
    const name = (tag.match(/^<([A-Za-z][\w-]*)/) || [])[1];
    if (!name || voidTags.test(name) || /\/\s*>$/.test(tag)) continue;
    if (depth === 0) start = match.index;
    depth += 1;
  }
  return blocks;
}
function sourceBlocks(sectionInfo) {
  const html = fs.readFileSync(path.join(root, chapter.path), 'utf8');
  const start = html.indexOf(`<section class="lesson" id="${sectionInfo.anchor}"`);
  const end = html.indexOf('\n      </section>', start);
  if (start < 0 || end < 0) throw new Error(`找不到 ${sectionInfo.anchor}`);
  const sectionHtml = html.slice(start, end);
  const bodyStart = sectionHtml.indexOf('>') + 1;
  const body = sectionHtml.slice(bodyStart);
  return directBlocks(body).filter(block => !/class="lesson-heading"/.test(block));
}
function writeAdditional(file, html) {
  html = html.replaceAll('开始本节学习 →', '开始本节学习');
  const target = path.join(root, file);
  if (checkOnly) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8').replaceAll('\r\n','\n') !== html.replaceAll('\r\n','\n')) stale.push(file);
  } else { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, html); }
}
function additionalSidebar(file, info, current) {
  return `<aside class="chapter-sidebar knowledge-sidebar" aria-label="本节目录"><details class="knowledge-menu" open><summary>${info.number} ${escape(info.title)} · 共 ${info.pages.length} 页</summary><nav aria-label="知识页导航"><ol class="knowledge-list">${info.pages.map(page => `<li>${link(file,page.path,`<span class="knowledge-index">${pageNumber(info,page)}</span><span>${escape(page.title)}<span class="knowledge-status" data-unit-status="${page.id}">未标记</span></span>`, current === page.id ? ' aria-current="page"' : '')}</li>`).join('')}</ol></nav></details><div class="sidebar-footer"><p data-section-progress="${info.id}">已学会 0 / ${info.pages.length} 页</p><progress data-section-meter="${info.id}" max="${info.pages.length}" value="0" aria-label="本节学习进度"></progress><p>${link(file,info.path,'本节概览')} · ${link(file,info.readingPath,'整节阅读')}</p></div></aside>`;
}
function additionalShell(file, info, title, body, current = '', kind = 'knowledge') {
  const p = prefix(file);
  const indexPage = kind === 'section-index';
  const layoutClass = indexPage ? 'chapter-home-layout' : 'chapter-knowledge-layout';
  const sidebarHtml = '';
  const breadcrumbs = '';
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${escape(title)}；${info.number} ${escape(info.title)}，线性代数课程。"><title>${escape(title)}${indexPage ? "" : " | " + info.number + " " + escape(info.title)} | 线性代数</title><link rel="icon" href="${p}assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="${p}css/style.css"><link rel="stylesheet" href="${p}css/chapter01.css"><link rel="stylesheet" href="${p}css/lessons.css"><script defer src="${p}js/course.js"></script><script defer src="${p}js/progress.js"></script><script defer src="${p}js/main.js"></script><script defer src="${p}js/mathjax-config.js"></script><script defer src="${p}assets/vendor/mathjax/tex-svg.js"></script></head><body data-page="${kind}" data-root="${p}" data-chapter="${chapter.id}" data-section="${info.id}"${current ? ` data-unit="${current}"` : ''}><a class="skip-link" href="#main">跳到正文</a><header class="site-header page-width"><a class="brand" href="${p}index.html" aria-label="线性代数课程首页"><img class="brand-mark" src="${p}assets/favicon.svg" width="36" height="36" alt=""><span>线性代数</span></a>${sectionPathNav(file,info,kind !== 'section-index')}</header><div class="${layoutClass} page-width">${sidebarHtml}<main id="main" class="chapter-content">${breadcrumbs}<p class="storage-notice" data-storage-notice role="status" hidden></p><noscript><p class="notice">正文、目录和翻页仍可使用。公式排版和学习记录需要在浏览器中允许脚本运行。</p></noscript>${body}</main></div><footer class="site-footer page-width"><span>版权所有 © 线性代数课程</span></footer></body></html>\n`;
}
function additionalContent(page, file) {
  return fs.readFileSync(path.join(root, 'content/chapter01', page.sectionId, page.slug + '.html'), 'utf8')
    .replaceAll('{{root}}', prefix(file)).replaceAll('src="../assets/', `src="${prefix(file)}assets/`)
    .replaceAll('href="#linear-operation-laws"', `href="${relative(file, 'chapters/chapter01.html#linear-operation-laws')}"`);
}
function additionalCompletion(page, includeNext = true) { return `<div class="unit-completion"><button class="button button-primary" type="button" data-unit-complete="${page.id}" data-unit-label="本页" disabled>标记本页为已学会</button><p class="completion-message" data-unit-message="${page.id}" role="status" aria-live="polite"></p>${includeNext ? `<p class="completion-next" data-next-unlearned="${page.id}" aria-live="polite"></p>` : ''}</div>`; }
function generateAdditional(info) {
  let blocks; const sectionFolder = info.path.replace(/index\.html$/, '');
  info.pages.forEach((page, index) => {
    page.sectionId = info.id; page.chapterId = chapter.id; page.sectionNumber = info.number; page.number = index + 1; page.path = sectionFolder + page.slug + '.html';
    const fragmentPath = `content/chapter01/${info.id}/${page.slug}.html`;
    let fragment;
    if (fs.existsSync(path.join(root, fragmentPath))) {
      fragment = fs.readFileSync(path.join(root, fragmentPath), 'utf8');
    } else {
      if (!blocks) blocks = sourceBlocks(info);
      const range = info.sourceRanges[index];
      if (!range) throw new Error(`${info.id} 缺少第 ${index + 1} 页的 sourceRanges`);
      fragment = blocks.slice(range[0], range[1] + 1).join('\n');
      if (!checkOnly) { fs.mkdirSync(path.dirname(path.join(root, fragmentPath)), { recursive: true }); fs.writeFileSync(path.join(root, fragmentPath), fragment); }
      else stale.push(fragmentPath);
    }
    const prev = info.pages[index - 1], next = info.pages[index + 1];
    const previousLink = prev ? link(page.path, prev.path, `<span>← 上一页</span><strong>${escape(prev.title)}</strong>`) : link(page.path, info.path, `<span>← 返回本节目录</span><strong>${info.number} ${escape(info.title)}</strong>`);
    const followingSection = chapter.lessons[chapter.lessons.indexOf(info) + 1];
    const nextLink = next ? link(page.path, next.path, `<span>下一页</span><strong>${escape(next.title)}</strong>`, ' rel="next"') : followingSection ? link(page.path, followingSection.path, `<span>下一节</span><strong>${followingSection.number} ${escape(followingSection.title)}</strong>`, ' rel="next"') : link(page.path, chapter.path, '<span>返回本章目录</span><strong>第一章 · 向量</strong>');
    const pageFragment = fragment.replaceAll('{{root}}', prefix(page.path)).replaceAll('src="../assets/', `src="${prefix(page.path)}assets/`).replaceAll('href="#linear-operation-laws"', `href="${relative(page.path, 'chapters/chapter01.html#linear-operation-laws')}"`);
    const body = `<header class="knowledge-intro"><h1 class="knowledge-page-title"><span class="knowledge-page-number">§${pageNumber(info,page)}</span><span>${escape(page.title)}</span></h1><p class="knowledge-goal">${escape(page.description)}</p></header><article class="lesson knowledge-lesson">${pageFragment}</article>${additionalCompletion(page)}<nav class="page-navigation" aria-label="前后翻页">${previousLink}${nextLink}</nav><div class="reading-options">${index > 0 ? link(page.path,info.path,'返回本节目录') : ''}${link(page.path,info.readingPath+'#part-'+page.slug,'整节阅读')}</div>`;
    writeAdditional(page.path, additionalShell(page.path, info, page.title, body, page.id));
  });
  writeAdditional(info.path, additionalShell(info.path, info, `${info.number} ${info.title}`, sectionIndexBody(info,info.path)+fullReadingBody(info,info.path), '', 'section-index'));
}
chapter.lessons.slice(1).forEach(generateAdditional);
// 在原章页面中也按知识页展示 1.2–1.5，每页对应独立的学习标记。
function embeddedAdditionalParts(info, file) {
  return info.pages.map(page => {
    const fragment = fs.readFileSync(path.join(root, 'content/chapter01', info.id, page.slug + '.html'), 'utf8')
      .replaceAll('{{root}}', prefix(file)).replaceAll('src="../assets/', `src="${prefix(file)}assets/`)
      .replaceAll('href="#linear-operation-laws"', `href="${relative(file, 'chapters/chapter01.html#linear-operation-laws')}"`);
    return `<section class="lesson knowledge-part" id="part-${info.id}-${page.slug}" data-reading-unit="${page.id}"><div class="lesson-heading"><span class="lesson-number knowledge-index-number">§${pageNumber(info,page)}</span><h2><a class="heading-link" href="${relative(file,page.path)}">${escape(page.title)}</a></h2></div>${fragment}${completion(page,'本页',false)}</section>`;
  }).join('\n');
}
for (let index = chapter.lessons.length - 1; index >= 1; index--) {
  const info = chapter.lessons[index], marker = `      <!-- ${info.number} 对应讲稿`;
  const startAt = chapterHtml.indexOf(marker);
  const nextInfo = chapter.lessons[index + 1];
  const endAt = nextInfo
    ? chapterHtml.indexOf(`      <!-- ${nextInfo.number} 对应讲稿`, startAt)
    : chapterHtml.indexOf('<section class="chapter-completion"', startAt);
  if (startAt < 0 || endAt < 0) throw new Error(`找不到 ${info.number} 小节边界`);
  const commentEnd = chapterHtml.indexOf('\n', startAt);
  const comment = chapterHtml.slice(startAt, commentEnd);
  const rendered = `${comment}\n      <section class="lesson" id="${info.anchor}" aria-labelledby="title-${info.anchor}"><div class="lesson-heading"><span class="lesson-number chapter-section-index">§${info.number}</span><h2 id="title-${info.anchor}"><a class="heading-link" href="${relative(chapter.path,info.path)}">${escape(info.title)}</a></h2></div>${embeddedAdditionalParts(info,chapter.path)}</section>\n\n`;
  chapterHtml = chapterHtml.slice(0, startAt) + rendered + chapterHtml.slice(endAt);
}
write(chapter.path,chapterHtml);
if (stale.length) throw new Error('请重新生成以下页面：' + [...new Set(stale)].join('、'));
console.log(checkOnly ? '生成页面与正文、目录一致。' : `已生成第一章 1.1–1.5 的知识页、本节目录和整节阅读，并同步原章页面。`);
