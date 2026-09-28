/* 固定使用本地 MathJax 3.2.2 SVG 版，字形已包含在文件里，无需在线字体。
   使用 \(...\) 写行内公式，\[...\] 写行间公式。
   关闭扩展自动加载和菜单；颜色、粗体符号与 mathtools 扩展固定使用同版本的本地文件。 */
window.MathJax = {
  loader: {
    paths: {
      mathjax: new URL("../assets/vendor/mathjax", document.currentScript.src).href
    },
    load: ["[tex]/color", "[tex]/boldsymbol", "[tex]/mathtools"]
  },
  tex: {
    inlineMath: [["\\(", "\\)"]],
    displayMath: [["\\[", "\\]"], ["$$", "$$"]],
    packages: ["base", "ams", "newcommand", "configmacros", "noundefined", "color", "boldsymbol", "mathtools"]
  },
  svg: { fontCache: "local" },
  options: { enableMenu: false },
  startup: { ready: function () {
    // 保留随组件提供的辅助 MathML，让支持它的读屏工具可以读取公式。
    MathJax.startup.defaultReady();
  } }
};
