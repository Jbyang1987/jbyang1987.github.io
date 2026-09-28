/* 统一生成已开放章节的 TeX2HTML 正文页面。 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'js/course.js'), 'utf8'), context);
const course = context.window.Course;
const checkOnly = Boolean(module.parent && process.argv.includes('--check')) || process.argv.includes('--check');
const stale = [];
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const prefix = file => '../'.repeat(file.split('/').length - 1);
const relative = (from, to) => path.posix.relative(path.posix.dirname(from), to.split('#')[0]) + (to.includes('#') ? '#' + to.split('#')[1] : '');
const pageNumber = (info, page) => `${info.number}.${page.number}`;
const chapterLabel = chapter => `第${['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][Number(chapter.number)] || Number(chapter.number)}章`;
const write = (file, html) => {
  const target = path.join(root, file);
  if (checkOnly) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8').replaceAll('\r\n', '\n') !== html.replaceAll('\r\n', '\n')) stale.push(file);
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, html);
  }
};
const fragment = (info, page, file) => {
  const source = path.join(root, 'content', info.chapterId, `section${String(Number(info.number.split('.')[1])).padStart(2, '0')}`, page.slug + '.html');
  if (!fs.existsSync(source)) throw new Error(`缺少正文片段：${path.relative(root, source)}`);
  return fs.readFileSync(source, 'utf8').replaceAll('{{root}}', prefix(file));
};
const themeButton = '<button class="header-print-button theme-toggle-button" type="button" data-theme-toggle aria-pressed="false">暗色</button>';
const printButton = '<button class="header-print-button" type="button" data-print-page title="在打印窗口中选择另存为 PDF">PDF</button>';
function nav(file, chapter, info, currentPage, kind) {
  const label = chapterLabel(chapter);
  const chapterLink = `<span class="header-chapter">${kind === 'chapter' ? label : `<a href="${relative(file, chapter.path)}">${label}</a>`}</span>`;
  const section = info && kind !== 'section' ? `<span class="header-section"><a href="${relative(file, info.path)}">第${Number(info.number.split('.')[1])}节</a></span>` : '';
  const current = currentPage ? `<span class="header-current">第${currentPage.number}小节</span>` : info && kind === 'section' ? `<span class="header-current">第${Number(info.number.split('.')[1])}节</span>` : '';
  const crumbs = [chapterLink, section, current].filter(Boolean).join('<span class="header-separator" aria-hidden="true">/</span>');
  return `<nav class="header-nav breadcrumb-header-nav" aria-label="当前位置"><span class="header-home"><a href="${relative(file, 'index.html')}">课程首页</a></span><span class="header-separator" aria-hidden="true">/</span><span class="header-path">${crumbs}</span>${kind === 'chapter' || kind === 'section' ? printButton : ''}${themeButton}</nav>`;
}
function shell(file, chapter, info, current, kind, title, body) {
  const p = prefix(file);
  const chapterCss = fs.existsSync(path.join(root, 'css', chapter.id + '.css')) ? `<link rel="stylesheet" href="${p}css/${chapter.id}.css">` : '';
  const layout = kind === 'chapter' ? 'chapter-layout chapter-home-layout' : 'chapter-home-layout';
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${escape(title)}；${escape(chapter.title)}，线性代数课程。"><title>${escape(title)} | 线性代数</title><link rel="icon" href="${p}assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="${p}css/style.css"><link rel="stylesheet" href="${p}css/lessons.css"><link rel="stylesheet" href="${p}css/tex2html.css">${chapterCss}<script defer src="${p}js/course.js"></script><script defer src="${p}js/progress.js"></script><script defer src="${p}js/main.js"></script><script defer src="${p}js/mathjax-config.js"></script><script defer src="${p}assets/vendor/mathjax/tex-svg.js"></script></head><body data-page="${kind === 'chapter' ? 'chapter' : kind === 'section' ? 'section-index' : 'knowledge'}" data-root="${p}" data-chapter="${chapter.id}"${info ? ` data-section="${info.id}"` : ''}${current ? ` data-unit="${current.id}"` : ''}><a class="skip-link" href="#main">跳到正文</a><header class="site-header page-width"><div class="brand-menu"><a class="brand" href="${p}index.html" aria-label="线性代数课程首页"><img class="brand-mark" src="${p}assets/favicon.svg" width="36" height="36" alt=""><span>线性代数</span></a><div class="course-menu" data-course-menu><button class="course-menu-toggle" type="button" aria-expanded="false" aria-controls="course-menu-panel" aria-label="展开课程菜单"></button><div class="course-menu-panel" id="course-menu-panel"></div></div></div>${nav(file, chapter, info, current, kind)}</header><div class="${layout} page-width"><main id="main" class="chapter-content"><p class="storage-notice" data-storage-notice role="status" hidden></p><noscript><p class="notice">正文、目录和翻页仍可使用；公式排版和学习记录需要浏览器启用脚本。</p></noscript>${body}</main></div><footer class="site-footer page-width"><span>版权所有 © 线性代数课程</span></footer></body></html>\n`;
}
function difficulty(page) { return `<div class="unit-difficulty"><span class="unit-difficulty-label">这页感觉如何？</span><div class="unit-difficulty-options" role="group" aria-label="${escape(page.title)}的难度评价（可选）"><button type="button" class="difficulty-button" data-unit-difficulty="easy" data-difficulty-unit="${page.id}" aria-pressed="false">很轻松</button><button type="button" class="difficulty-button" data-unit-difficulty="okay" data-difficulty-unit="${page.id}" aria-pressed="false">正合适</button><button type="button" class="difficulty-button" data-unit-difficulty="hard" data-difficulty-unit="${page.id}" aria-pressed="false">有点难</button></div></div>`; }
function completion(page, previous = '', next = '', includeContinue = true) { return `<div class="unit-completion">${difficulty(page)}<div class="knowledge-completion-row">${previous || next ? `<div class="knowledge-step-actions">${previous}${next}</div>` : ''}<div class="unit-action-row"><button class="button button-primary complete-knowledge-button" type="button" data-unit-complete="${page.id}" data-unit-label="本页" disabled>标记为已学会</button>${includeContinue ? `<a class="button button-primary knowledge-action-button continue-learning" data-next-unlearned-link="${page.id}" hidden>继续学习</a>` : ''}</div></div><p class="completion-message" data-unit-message="${page.id}" role="status" aria-live="polite"></p></div>`; }
function sectionTop(info, file) {
  const first = info.pages[0];
  const entries = info.pages.map(page => `<li><a href="${relative(file, page.path)}">${pageNumber(info, page)} ${escape(page.title)}</a><span data-unit-status="${page.id}">未标记</span></li>`).join('');
  return `<section class="chapter-top-card section-top-card" aria-label="${escape(info.title)}简介、进度与目录"><header class="chapter-intro"><h1>${info.number} ${escape(info.title)}</h1><p>${escape(info.description)}</p><div class="chapter-hero-actions"><div class="chapter-resume"><a class="button button-primary" data-section-resume="${info.id}" href="${relative(file, first.path)}"><span data-section-resume-action>开始学习</span></a></div><div class="chapter-progress"><div class="chapter-progress-heading"><div class="chapter-progress-heading-main"><span>进度</span><strong data-section-progress-percent>0%</strong></div><span data-section-progress-count>掌握 0 / ${info.pages.length}</span></div><progress data-section-meter="${info.id}" max="${info.pages.length}" value="0">0%</progress></div></div></header><nav class="chapter-outline" aria-label="${escape(info.title)}知识页目录"><h2>本节目录</h2><ul>${entries}</ul></nav></section>`;
}
function sectionReading(info, file) {
  const body = info.pages.map(page => `<section class="lesson knowledge-part" id="part-${page.slug}" data-reading-unit="${page.id}"><div class="lesson-heading"><span class="lesson-number knowledge-index-number">§${pageNumber(info, page)}</span><h2><a class="heading-link" href="${relative(file, page.path)}">${escape(page.title)}</a></h2></div>${fragment(info, page, file)}${completion(page, '', '', false)}</section>`).join('\n');
  const chapter = course.chapters.find(item => item.id === info.chapterId);
  const index = chapter.lessons.indexOf(info), previous = chapter.lessons[index - 1], next = chapter.lessons[index + 1];
  const links = `${previous ? `<a href="${relative(file, previous.path)}">上一节 · ${escape(previous.number)} ${escape(previous.title)}</a>` : ''}<a href="${relative(file, info.path)}#main">回顾本节</a>${next ? `<a href="${relative(file, next.path)}">下一节 · ${escape(next.number)} ${escape(next.title)}</a>` : `<a href="${relative(file, chapter.path)}">返回章节目录</a>`}`;
  return `<section class="section-full-reading" id="full-reading">${body}<nav class="lesson-navigation" aria-label="子节导航"><a href="${relative(file, 'index.html')}">返回课程首页</a>${links}</nav></section>`;
}
function chapterTop(chapter, file) { const total = chapter.lessons.reduce((sum, info) => sum + info.pages.length, 0), first = chapter.lessons[0].pages[0]; return `<section class="chapter-top-card" aria-label="${escape(chapter.title)}简介、进度与目录"><header class="chapter-intro"><h1>${chapterLabel(chapter)} ${escape(chapter.title)}</h1><p>${escape(chapter.description)}</p><div class="chapter-hero-actions"><div class="chapter-resume"><a class="button button-primary" data-chapter-resume href="${relative(file, first.path)}"><span data-chapter-resume-action>开始学习</span></a></div><div class="chapter-progress"><div class="chapter-progress-heading"><div class="chapter-progress-heading-main"><span>进度</span><strong data-chapter-progress-percent>0%</strong></div><span data-chapter-progress-count>掌握 0 / ${total}</span></div><progress data-chapter-progress max="${total}" value="0" aria-label="${escape(chapter.title)}掌握进度">0%</progress></div></div></header><nav class="chapter-outline" aria-label="${escape(chapter.title)}学习目录"><h2>本章目录</h2><ul>${chapter.lessons.map(info => `<li><a href="${relative(file, info.path)}">${escape(info.number)} ${escape(info.title)}</a><span data-section-progress="${info.id}">掌握 0 / ${info.pages.length}</span></li>`).join('')}</ul></nav></section>`; }
function chapterReading(chapter, file) { return chapter.lessons.map(info => `<section class="lesson" id="${info.anchor || info.id}" aria-labelledby="title-${info.id}"><div class="lesson-heading"><span class="lesson-number chapter-section-index">§${escape(info.number)}</span><h2 id="title-${info.id}"><a class="heading-link" href="${relative(file, info.path)}">${escape(info.title)}</a></h2></div>${info.pages.map(page => `<section class="lesson knowledge-part" id="part-${page.id}" data-reading-unit="${page.id}"><div class="lesson-heading"><span class="lesson-number knowledge-index-number">§${pageNumber(info, page)}</span><h2><a class="heading-link" href="${relative(file, page.path)}">${escape(page.title)}</a></h2></div>${fragment(info, page, file)}${completion(page, '', '', false)}</section>`).join('\n')}</section>`).join('\n'); }
function buildChapter(chapter) {
  const chapterFile = chapter.path;
  write(chapterFile, shell(chapterFile, chapter, null, null, 'chapter', `${chapterLabel(chapter)} ${chapter.title}`, chapterTop(chapter, chapterFile) + `<section class="chapter-full-reading" id="chapter-reading">${chapterReading(chapter, chapterFile)}<nav class="lesson-navigation"><a href="#main">回顾本章</a></nav></section>`));
  chapter.lessons.forEach(info => {
    info.pages.forEach((page, index) => {
      page.number = index + 1;
      const file = page.path;
      const previous = info.pages[index - 1], next = info.pages[index + 1];
      const prevLink = previous ? `<a href="${relative(file, previous.path)}" class="button button-primary knowledge-action-button previous-knowledge-button">上一知识点</a>` : '';
      const nextLink = next ? `<a href="${relative(file, next.path)}" class="button button-primary knowledge-action-button next-knowledge-button">下一知识点</a>` : info.pages[index + 1] ? '' : (chapter.lessons[chapter.lessons.indexOf(info) + 1] ? `<a href="${relative(file, chapter.lessons[chapter.lessons.indexOf(info) + 1].path)}" class="button button-primary knowledge-action-button next-knowledge-button">下一知识点</a>` : `<a href="${relative(file, chapter.path)}" class="button button-primary knowledge-action-button next-knowledge-button">返回章节目录</a>`);
      const body = `<header class="knowledge-intro"><h1 class="knowledge-page-title"><span class="knowledge-page-number">§${pageNumber(info, page)}</span><span>${escape(page.title)}</span></h1><p class="knowledge-goal">${escape(page.description)}</p></header><article class="lesson knowledge-lesson">${fragment(info, page, file)}</article>${completion(page, prevLink, nextLink)}`;
      write(file, shell(file, chapter, info, page, 'knowledge', page.title, body));
    });
    const indexFile = info.path;
    write(indexFile, shell(indexFile, chapter, info, null, 'section', `${info.number} ${info.title}`, sectionTop(info, indexFile) + sectionReading(info, indexFile)));
  });
}
function build() {
  course.chapters.filter(chapter => chapter.path && chapter.lessons).forEach(buildChapter);
  // 保留旧链接，使用静态链接和刷新跳转，不依赖 JavaScript。
  (course.legacyUnits || []).forEach(unit => {
    const target = relative(unit.path, unit.target);
    write(unit.path, '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="0;url=' + escape(target) + '"><title>知识页已更新</title></head><body data-page="legacy-redirect"><p>本页内容已更新，<a href="' + escape(target) + '">阅读新版知识页</a>。</p></body></html>\n');
  });
  const introFile = 'chapters/introduction.html';
  const introduction = fs.readFileSync(path.join(root, 'content/chapter00/lesson-0-1.html'), 'utf8').replaceAll('{{root}}', prefix(introFile));
  const introChapter = {id:'introduction',number:'0',title:'课程简介',path:introFile};
  write(introFile, shell(introFile, introChapter, null, null, 'chapter', '课程简介', '<header class="chapter-intro"><h1>课程简介</h1></header>' + introduction + '<p><a href="chapter01.html">开始第一章</a></p>').replace('第章', '课程简介').replace('第0章', '课程简介'));
  if (stale.length) throw new Error('请重新生成以下页面：' + [...new Set(stale)].join('、'));
}
module.exports = { build };
if (require.main === module) build();
