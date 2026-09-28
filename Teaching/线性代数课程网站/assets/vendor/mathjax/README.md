# MathJax 本地资源

- 版本：MathJax 3.2.2，SVG 输出。
- `tex-svg.js`：网站原有的组件文件。
- `input/tex/extensions/color.js`：同版本官方 color 扩展。
  来源：https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/input/tex/extensions/color.js
- `input/tex/extensions/boldsymbol.js`：同版本官方 boldsymbol 扩展。
  来源：https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/input/tex/extensions/boldsymbol.js
- `input/tex/extensions/mathtools.js`：同版本官方 mathtools 扩展，支持 `\\xRightarrow`、
  `\\xLeftrightarrow`、`\\xleftrightarrow`、`\\xmapsto` 等带文字箭头命令。
  来源：https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/input/tex/extensions/mathtools.js
- 许可证：本目录 `LICENSE`（Apache-2.0）。

`js/mathjax-config.js` 通过自身脚本地址解析本地资源路径，显式加载 color、boldsymbol、mathtools 扩展并注册对应的 TeX 包。
正文中的 `\blue` 宏展开为 `\textcolor[rgb]{0,0,1}{...}` 后可直接排版，
无需运行时连接 CDN，也不要再将 `\textcolor` 改写成作用范围不同的 `\color`。
