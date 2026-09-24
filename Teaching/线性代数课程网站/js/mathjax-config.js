/* 固定使用本地 MathJax 3.2.2 SVG 版，字形已包含在文件里，无需在线字体。
   使用 \(...\) 写行内公式，\[...\] 写行间公式。
   关闭需要额外下载的扩展和菜单，只保留常用基础、AMS 与自定义命令。 */
window.MathJax = {
  tex: {
    inlineMath: [["\\(", "\\)"]],
    displayMath: [["\\[", "\\]"], ["$$", "$$"]],
    packages: ["base", "ams", "newcommand", "configmacros", "noundefined"]
  },
  svg: { fontCache: "local" },
  options: { enableMenu: false },
  startup: { ready: function () {
    // 保留随组件提供的辅助 MathML，让支持它的读屏工具可以读取公式。
    MathJax.startup.defaultReady();
  } }
};
