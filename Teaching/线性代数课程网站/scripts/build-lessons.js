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
const sectionOrdinal = info => Number(info.number.split('.')[1]);
const sectionFolder = info => `section${info.number.split('.')[1].padStart(2, '0')}`;
const fragmentPath = (info, page) => path.join(root, 'content/chapter01', sectionFolder(info), page.slug + '.html');
const content = (info, page, file) => fs.readFileSync(fragmentPath(info, page), 'utf8')
  .replaceAll('{{root}}', prefix(file))
  .replaceAll('src="../assets/', `src="${prefix(file)}assets/`)
  .replaceAll('href="#linear-operation-laws"', `href="${relative(file, 'chapters/chapter01.html#linear-operation-laws')}"`);
const difficultyControls = page => `<div class="unit-difficulty"><span class="unit-difficulty-label">这页感觉如何？</span><div class="unit-difficulty-options" role="group" aria-label="${escape(page.title)}的难度评价（可选）"><button type="button" class="difficulty-button" data-unit-difficulty="easy" data-difficulty-unit="${page.id}" aria-pressed="false">很轻松</button><button type="button" class="difficulty-button" data-unit-difficulty="okay" data-difficulty-unit="${page.id}" aria-pressed="false">正合适</button><button type="button" class="difficulty-button" data-unit-difficulty="hard" data-difficulty-unit="${page.id}" aria-pressed="false">有点难</button></div></div>`;
const completion = (page, label = '本页', previousLink = '', nextLink = '', includeContinue = true) => `<div class="unit-completion">${difficultyControls(page)}<div class="knowledge-completion-row">${previousLink || nextLink ? `<div class="knowledge-step-actions">${previousLink}${nextLink}</div>` : ''}<div class="unit-action-row"><button class="button button-primary complete-knowledge-button" type="button" data-unit-complete="${page.id}" data-unit-label="${label}" disabled>标记为已学会</button>${includeContinue ? `<a class="button button-primary knowledge-action-button continue-learning" data-next-unlearned-link="${page.id}" hidden>继续学习</a>` : ''}</div></div><p class="completion-message" data-unit-message="${page.id}" role="status" aria-live="polite"></p></div>`;
function sidebar(file, current) {
  return `<aside class="chapter-sidebar knowledge-sidebar" aria-label="本节目录">
    <details class="knowledge-menu" open><summary>本节目录 · 共 ${section.pages.length} 页</summary>
    <nav aria-label="知识页导航"><ol class="knowledge-list">${section.pages.map(page => `<li>${link(file, page.path, `<span class="knowledge-index">${pageNumber(section,page)}</span><span>${escape(page.title)}<span class="knowledge-status" data-unit-status="${page.id}">未标记</span></span>`, current === page.id ? ' aria-current="page"' : '')}</li>`).join('\n')}</ol></nav></details>
    <div class="sidebar-footer"><p data-section-progress="${section.id}">掌握 0 / ${section.pages.length}</p><progress data-section-meter="${section.id}" max="${section.pages.length}" value="0" aria-label="本节掌握进度"></progress><p>${link(file, section.path, '本节概览')} · ${link(file, section.readingPath, '整节阅读')}</p></div>
  </aside>`;
}
function sectionPathNav(file, info, includeSection = true, includePrint = true, current = '') {
  const sectionCrumb = includeSection ? `<span class="header-separator" aria-hidden="true">/</span><span class="header-section">${link(file,info.path,`第${sectionOrdinal(info)}节`)}</span>` : '';
  const chapterLabel = chapter.id === 'chapter01' ? '第一章' : `第${Number(chapter.number)}章`;
  const currentPage = current ? info.pages.find(page => page.id === current) : null;
  const currentCrumb = currentPage
    ? `<span class="header-separator" aria-hidden="true">/</span><span class="header-current">第${currentPage.number}小节</span>`
    : !includeSection ? `<span class="header-separator" aria-hidden="true">/</span><span class="header-current">第${sectionOrdinal(info)}节</span>` : '';
  const printButton = `${includePrint ? `<button class="header-print-button" type="button" data-print-page title="在打印窗口中选择另存为 PDF">PDF</button>` : ''}<button class="header-print-button theme-toggle-button" type="button" data-theme-toggle aria-pressed="false">暗色</button>`;
  return `<nav class="header-nav breadcrumb-header-nav" aria-label="当前位置"><span class="header-path"><span class="header-home">${link(file,'index.html','课程首页')}</span><span class="header-separator" aria-hidden="true">/</span><span class="header-chapter">${link(file,chapter.path,chapterLabel)}</span>${sectionCrumb}${currentCrumb}</span>${printButton}</nav>`;
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
  <header class="site-header page-width"><a class="brand" href="${p}index.html" aria-label="线性代数课程首页"><img class="brand-mark" src="${p}assets/favicon.svg" width="36" height="36" alt=""><span>线性代数</span></a>${sectionPathNav(file,section,kind !== 'section-index',kind !== 'knowledge',current)}</header>
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
function parts(file, includeCompletion = true, includeContinue = true) {
  return section.pages.map(page => `<section class="lesson knowledge-part" id="part-${page.slug}" data-reading-unit="${page.id}"><div class="lesson-heading"><span class="lesson-number knowledge-index-number">§${pageNumber(section,page)}</span><h2><a class="heading-link" href="${relative(file,page.path)}">${escape(page.title)}</a></h2></div>${content(section,page,file)}${includeCompletion ? completion(page, '本页', '', '', includeContinue) : ''}</section>`).join('\n');
}
function sectionIndexBody(info, file) {
  const first = info.pages[0];
  const entries = info.pages.map(page => `<li>${link(file,page.path,`${pageNumber(info,page)} ${escape(page.title)}`)}<span data-unit-status="${page.id}">未标记</span></li>`).join('');
  return `<section class="chapter-top-card section-top-card" aria-label="${info.number} ${escape(info.title)}简介、进度与目录"><header class="chapter-intro"><h1>${info.number} ${escape(info.title)}</h1><p>${escape(info.description)}</p><div class="chapter-hero-actions"><div class="chapter-resume"><a class="button button-primary" data-section-resume="${info.id}" href="${relative(file,first.path)}"><span data-section-resume-action>开始学习</span></a></div><div class="chapter-progress"><div class="chapter-progress-heading"><div class="chapter-progress-heading-main"><span>进度</span><strong data-section-progress-percent>0%</strong></div><span data-section-progress-count>掌握 0 / ${info.pages.length}</span></div><progress data-section-meter="${info.id}" max="${info.pages.length}" value="0" aria-label="${info.number}掌握进度">0%</progress></div></div></header><nav class="chapter-outline" aria-label="${info.number}知识页目录"><h2>本节目录</h2><ul>${entries}</ul></nav></section>`;
}
function fullReadingBody(info, file) {
  const partsHtml = info.pages.map(page => {
    const fragment = content(info,page,file);
    return `<section class="lesson knowledge-part" id="part-${page.slug}" data-reading-unit="${page.id}"><div class="lesson-heading"><span class="lesson-number knowledge-index-number">§${pageNumber(info,page)}</span><h2><a class="heading-link" href="${relative(file,page.path)}">${escape(page.title)}</a></h2></div>${fragment}${info === section ? completion(page,'本页','','',false) : additionalCompletion(page,'','',false)}</section>`;
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
  const previousLink = prev ? link(page.path,prev.path,'上一知识点',` class="button button-primary knowledge-action-button previous-knowledge-button" aria-label="上一知识点：${escape(prev.title)}"`) : '';
  const nextLink = next ? link(page.path,next.path,'下一知识点',` class="button button-primary knowledge-action-button next-knowledge-button" aria-label="下一知识点：${escape(next.title)}" rel="next"`) : link(page.path,chapter.lessons[1].path,'下一知识点',` class="button button-primary knowledge-action-button next-knowledge-button" aria-label="下一知识点：1.2 向量线性相关性" rel="next"`);
  const body = `<header class="knowledge-intro"><h1 class="knowledge-page-title"><span class="knowledge-page-number">§${pageNumber(section,page)}</span><span>${escape(page.title)}</span></h1><p class="knowledge-goal">${escape(page.description)}</p></header>
    <article class="lesson knowledge-lesson">${content(section,page,page.path)}</article>
    ${completion(page, '本页', previousLink, nextLink)}`;
  write(page.path,shell(page.path,page.title,body,page.id));
});
write(section.path,shell(section.path,`${section.number} ${section.title}`,sectionIndexBody(section,section.path)+fullReadingBody(section,section.path),'','section-index'));
// 旧的整章页面保留全部锚点；1.1 同样由上述正文生成，避免维护重复内容。
const chapterTemplate=path.join(root,'content/chapter01/chapter01.template.html');
let chapterHtml=fs.readFileSync(chapterTemplate,'utf8');
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
/* 所有可编辑正文均位于 content/chapter01/section0X；章节页从这些片段生成。 */
function writeAdditional(file, html) {
  html = html.replaceAll('开始本节学习 →', '开始本节学习');
  const target = path.join(root, file);
  if (checkOnly) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8').replaceAll('\r\n','\n') !== html.replaceAll('\r\n','\n')) stale.push(file);
  } else { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, html); }
}
function additionalSidebar(file, info, current) {
  return `<aside class="chapter-sidebar knowledge-sidebar" aria-label="本节目录"><details class="knowledge-menu" open><summary>${info.number} ${escape(info.title)} · 共 ${info.pages.length} 页</summary><nav aria-label="知识页导航"><ol class="knowledge-list">${info.pages.map(page => `<li>${link(file,page.path,`<span class="knowledge-index">${pageNumber(info,page)}</span><span>${escape(page.title)}<span class="knowledge-status" data-unit-status="${page.id}">未标记</span></span>`, current === page.id ? ' aria-current="page"' : '')}</li>`).join('')}</ol></nav></details><div class="sidebar-footer"><p data-section-progress="${info.id}">掌握 0 / ${info.pages.length}</p><progress data-section-meter="${info.id}" max="${info.pages.length}" value="0" aria-label="本节掌握进度"></progress><p>${link(file,info.path,'本节概览')} · ${link(file,info.readingPath,'整节阅读')}</p></div></aside>`;
}
function additionalShell(file, info, title, body, current = '', kind = 'knowledge') {
  const p = prefix(file);
  const indexPage = kind === 'section-index';
  const layoutClass = indexPage ? 'chapter-home-layout' : 'chapter-knowledge-layout';
  const sidebarHtml = '';
  const breadcrumbs = '';
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${escape(title)}；${info.number} ${escape(info.title)}，线性代数课程。"><title>${escape(title)}${indexPage ? "" : " | " + info.number + " " + escape(info.title)} | 线性代数</title><link rel="icon" href="${p}assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="${p}css/style.css"><link rel="stylesheet" href="${p}css/chapter01.css"><link rel="stylesheet" href="${p}css/lessons.css"><script defer src="${p}js/course.js"></script><script defer src="${p}js/progress.js"></script><script defer src="${p}js/main.js"></script><script defer src="${p}js/mathjax-config.js"></script><script defer src="${p}assets/vendor/mathjax/tex-svg.js"></script></head><body data-page="${kind}" data-root="${p}" data-chapter="${chapter.id}" data-section="${info.id}"${current ? ` data-unit="${current}"` : ''}><a class="skip-link" href="#main">跳到正文</a><header class="site-header page-width"><a class="brand" href="${p}index.html" aria-label="线性代数课程首页"><img class="brand-mark" src="${p}assets/favicon.svg" width="36" height="36" alt=""><span>线性代数</span></a>${sectionPathNav(file,info,kind !== 'section-index',kind !== 'knowledge',current)}</header><div class="${layoutClass} page-width">${sidebarHtml}<main id="main" class="chapter-content">${breadcrumbs}<p class="storage-notice" data-storage-notice role="status" hidden></p><noscript><p class="notice">正文、目录和翻页仍可使用。公式排版和学习记录需要在浏览器中允许脚本运行。</p></noscript>${body}</main></div><footer class="site-footer page-width"><span>版权所有 © 线性代数课程</span></footer></body></html>\n`;
}
function additionalCompletion(page, previousLink = '', nextLink = '', includeContinue = true) { return completion(page, '本页', previousLink, nextLink, includeContinue); }
function generateAdditional(info) {
  const outputFolder = info.path.replace(/index\.html$/, '');
  info.pages.forEach((page, index) => {
    page.sectionId = info.id; page.chapterId = chapter.id; page.sectionNumber = info.number; page.number = index + 1; page.path = outputFolder + page.slug + '.html';
    if (!fs.existsSync(fragmentPath(info, page))) throw new Error(`缺少正文源文件：content/chapter01/${sectionFolder(info)}/${page.slug}.html`);
    const prev = info.pages[index - 1], next = info.pages[index + 1];
    const previousLink = prev ? link(page.path, prev.path, '上一知识点', ` class="button button-primary knowledge-action-button previous-knowledge-button" aria-label="上一知识点：${escape(prev.title)}"`) : '';
    const followingSection = chapter.lessons[chapter.lessons.indexOf(info) + 1];
    const nextLink = next ? link(page.path, next.path, '下一知识点', ` class="button button-primary knowledge-action-button next-knowledge-button" aria-label="下一知识点：${escape(next.title)}" rel="next"`) : followingSection ? link(page.path, followingSection.path, '下一知识点', ` class="button button-primary knowledge-action-button next-knowledge-button" aria-label="下一知识点：${followingSection.number} ${escape(followingSection.title)}" rel="next"`) : link(page.path, chapter.path, '下一知识点', ' class="button button-primary knowledge-action-button next-knowledge-button" aria-label="下一知识点：第一章目录"');
    const pageFragment = content(info,page,page.path);
    const body = `<header class="knowledge-intro"><h1 class="knowledge-page-title"><span class="knowledge-page-number">§${pageNumber(info,page)}</span><span>${escape(page.title)}</span></h1><p class="knowledge-goal">${escape(page.description)}</p></header><article class="lesson knowledge-lesson">${pageFragment}</article>${additionalCompletion(page,previousLink,nextLink)}`;
    writeAdditional(page.path, additionalShell(page.path, info, page.title, body, page.id));
  });
  writeAdditional(info.path, additionalShell(info.path, info, `${info.number} ${info.title}`, sectionIndexBody(info,info.path)+fullReadingBody(info,info.path), '', 'section-index'));
}
chapter.lessons.slice(1).forEach(generateAdditional);
// 在原章页面中也按知识页展示 1.2–1.5，每页对应独立的学习标记。
function embeddedAdditionalParts(info, file) {
  return info.pages.map(page => {
    const fragment = content(info,page,file);
    return `<section class="lesson knowledge-part" id="part-${info.id}-${page.slug}" data-reading-unit="${page.id}"><div class="lesson-heading"><span class="lesson-number knowledge-index-number">§${pageNumber(info,page)}</span><h2><a class="heading-link" href="${relative(file,page.path)}">${escape(page.title)}</a></h2></div>${fragment}${completion(page,'本页')}</section>`;
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
// 章节总览页只保留标记操作；“继续学习”属于独立知识页。
chapterHtml = chapterHtml.replace(/<a class="button button-primary knowledge-action-button continue-learning" data-next-unlearned-link="[^"]+" hidden>继续学习<\/a>/g, '');
write(chapter.path,chapterHtml);
if (stale.length) throw new Error('请重新生成以下页面：' + [...new Set(stale)].join('、'));
console.log(checkOnly ? '生成页面与正文、目录一致。' : `已生成第一章 1.1–1.5 的知识页、本节目录和整节阅读，并同步原章页面。`);
