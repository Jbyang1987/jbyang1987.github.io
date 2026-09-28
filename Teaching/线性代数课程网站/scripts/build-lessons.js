/* 根据 course.js 和 content 生成已开放章节，不依赖旧第一章模板。 */
require('./build-additional-chapters.js').build();
console.log(process.argv.includes('--check') ? '生成页面与正文、目录一致。' : '已生成课程简介及第一至第九章的知识页、子节页和章节页。');
