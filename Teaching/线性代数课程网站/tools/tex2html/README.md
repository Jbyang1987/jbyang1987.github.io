# TeX → 知识页转换工作台

这是第一阶段的可运行实现：原生 HTML / CSS / JavaScript，使用课程网站已有的本地 MathJax。核心正文转换在浏览器完成；复杂 TikZ、XY-pic 与表格由可选的本机 LaTeX 服务执行。

## 智能体维护入口

修改本工具前，请阅读网站根目录的 [智能体维护手册](../../AGENTS.md) 和本目录的 [转换器智能体维护手册](AGENTS.md)。专用手册说明源码职责、转换模型、编辑与保存、图形编译、导出兼容、验证流程和已知测试问题。本 README 面向工具使用，手册面向代码维护；行为变化时同步更新两者。

## 运行与基本操作

工作区自动保存使用 IndexedDB 浏览器数据库，避免旧 localStorage 的几 MB 限制。实际配额由浏览器和磁盘余量决定，不设固定容量保证；仍保存在本机。首次使用会读取旧工作区，成功后写入新数据库，保留旧键。刷新时恢复保存的讲稿、选择和编辑，不再用默认讲稿覆盖它们。隐私模式或浏览器禁止存储时仍可能无法保存。

在课程网站根目录运行：

```powershell
node tools/tex2html/server.js
```

打开 [本地转换器](http://127.0.0.1:4174/tools/tex2html/)。无需 npm 安装。服务器仅监听 `127.0.0.1`；关闭运行它的终端可停止服务。默认端口为 4174，可通过 `TEX2HTML_PORT` 环境变量修改。

也可以双击网站根目录的 `启动 TeX 转换器.bat`，它会启动本地服务并自动打开转换网页。

批处理调用的 `launch.js` 当前固定使用 4174；自定义端口时请直接运行 `server.js`。存在多个项目副本或工作树时，确认已有服务来自要使用的目录：启动器会复用匹配的服务，不会自动切换到当前工作树。

启动文件使用纯 ASCII 内容和 Windows CRLF 换行，实际启动与检查由 `tools/tex2html/launch.js` 完成。已有服务时直接复用；没有服务时在后台启动，确认网页可访问后再打开浏览器。启动失败会保留窗口显示原因，服务日志位于 `%TEMP%\tex2html-launch\server-*.log`。修改 `server.js` 后需先关闭旧服务再启动；重复双击不会自动重启正在使用的服务。

如需验证启动后的真实图形编译链路，可运行 `node tools/tex2html/tests/launch-compile-smoke.js`：它会读取第一章和实际样式文件，在已保存 SVG 超过 260 KB 的配置下，通过 HTTP 编译 7 幅图形（含 `tikzmath`、`tkzMarkRightAngle` 和嵌套数学文字的 XY-pic），并检查每幅图的明亮、暗色 SVG。编译请求只携带当前图形源码和必要参数，不包含已保存的 SVG。

也可以直接双击本目录 `index.html`；正文、示例、样式、JSON 和 ZIP 导出不需要服务器。部分浏览器会限制 `file://` 下的剪贴板、目录写入或本地编译请求，遇到限制时使用上述 localhost 入口。若内嵌浏览器没有保存下载文件，请用 Edge / Chrome 打开同一工具页面。

1. 导入一个或多个 `.tex`，再导入所依赖的 `.sty` 和图片。导入的讲稿保持只读；代码框编辑的是提取后的工作副本。
2. 中栏设置停顿、分页、命令、颜色和数学环境样式。修改后默认自动转换。
3. 右栏选择页面，检查公式、证明、图形和警告。警告附文件、行号、原代码和跳转按钮。
4. 在页面目录中多选合并、使用箭头或拖动排序。在内容块下使用“从此处拆分”、编辑、移动、删除、恢复。
5. “保存方案”包含输入文件、导入图片、规则、当前页面编排和编辑结果。仅导出“转换配置”则只保存规则。
6. 导出 ZIP，将其中的 `content/`、`css/` 和 `assets/` 合并到课程网站根目录。

这是电脑端工具，工作区始终保持输入与预览并排、转换规则位于下一行的桌面布局。桌面内容块操作在鼠标悬停或键盘聚焦时显示。

## 讲稿目录模式

通过 `node tools/tex2html/server.js` 启动本地服务后，转换器会读取当前项目中的 `讲稿/tex`：TeX 文件来自 `讲稿/tex/sections`，样式默认使用 `讲稿/tex/common/theme/_hanhai.sty`；当前仓库若没有该文件，会自动使用实际存在的 `讲稿/tex/common/theme_hanhai.sty`。图片默认来自 `讲稿/tex/pic`。

打开转换器时，默认勾选并一次性处理 `00 introduction.tex` 至 `09 quadratic forms.tex`，不需要逐份选择。预览先显示第一页，可切换知识页或选择全部预览。

PPT 列表保留讲稿目录中的全部编号章节，包括 10、11；它们默认不勾选，主动勾选后可以转换和导出。默认处理范围不会限制可选章节列表。

- **ppt**：展开后显示复选框，默认勾选 00–09。第一次点击任意章节，会清除默认选项并只保留点击的章节；之后可以继续勾选其他章节或取消选择。全部取消后恢复 00–09 默认勾选。仅展开列表不会改变转换范围。
- **frames**：按文件分组，默认勾选当前 PPT 范围的全部 frame。首次点击任意 frame 后仅保留该项，之后可继续多选；全部取消后恢复当前 PPT 范围的全部 frame 勾选。
- 修改 PPT 范围会清空旧的 frame 筛选，避免隐藏选择继续影响转换。
- 鼠标移出 PPT 或 frames 的入口与下拉列表区域后，列表自动收起；收起不会改变勾选。触摸和键盘操作仍可通过入口开关列表。
- 选择只是限制处理范围，不会重新读取或丢弃其他已加载讲稿。frames 勾选会显示对应源码。
- 各文件按编号分别生成知识页与资源目录；绪论保留编号 0，导出到 `content/chapter00/` 和 `assets/chapter00/`。这不会自动把绪论接入正式课程网站。

仍可通过“导入 .tex/.sty/图片”处理临时文件。批量模式中主动导入 TeX 后会将转换范围切到本次导入文件。全量方案较大，若浏览器提示存储空间不足，转换与导出仍可使用，但不要依赖刷新后自动恢复。

TeX 代码区跟随当前 PPT 和 frames 范围，按 `\section{...}` / `\section*{...}` 划分章节。“代码章节”可切换第 00–09 章，首次默认显示第 00 章“课程简介”；选择“全部章节”可以连续查看或复制当前范围的完整源码。切换代码章节只改变代码框的显示，不改变 PPT / frames 转换范围。提供浅色、深色和护眼三种主题及语法高亮。

点击“编辑”，可在原框中直接修改当前章节的提取结果；切换章节保留各章编辑，“完成”返回高亮预览。“复制”复制当前框中的全部内容；需要全部章节时先选择“全部章节”。修改只保存在浏览器的工作副本中，**始终不写回原始讲稿 `.tex`**。转换和导出使用这份副本；章节边界读取真实 section，文件来源保存在元数据中，不依赖可编辑的文件名注释。

双击右侧页面的内容块，会自动切到对应代码章节，在同一个框中选中副本内对应的段落、公式或数学环境。定位记录随插入、删除更新；即使关闭自动转换，旧页面也会把位置映射到当前编辑文本。它定位的是对应代码块，不能保证数学公式中每个显示符号都逐字符对应源码。

各 PPT / frames 组合分别保留编辑副本，切换范围后再切回可继续之前的编辑。刷新会恢复副本、章节边界和当前定位记录；“保存方案”下载包含副本的 JSON 备份，“导入方案”可恢复。旧版工作区首次载入时迁移原来的定位数据和提取编辑内容，保留已有页面编排。

TeX 源码读取到页面代码区时，会先删除整行注释代码并压缩多余空行；正常的 `\frametitle` / `\framesubtitle` 会保留。

转换时会按 TeX 标题层级组织内容：`section` 对应章节，`subsection` 对应子节，`subsubsection` 对应知识页面。同一 `subsubsection` 下的多个 frame 会合并到同一知识页面。知识页预览会显示章节 / 子节路径，并使用 `subsubsection` 作为页面标题。

默认十份讲稿的 section 按顺序对应第 0–9 章；`\section*{课程简介}` 保留第 0 章。临时合并文件中的多个 section 从 0 开始依次编号；已编号的讲稿保留文件编号，因此只选第 9 章时仍为第 9 章，10、11 也仍可主动选择。章节切换时重置子节计数，避免不同章节的同名知识页被合并。注释、宏定义、公式及 frame 内部出现的 section 不作为章边界。

方案和 JSON 视图包含 `model.chapters`（章编号、标题、来源文件、源码范围）；frame 和知识页携带 `chapter` / `chapterId`。写入网站源和导出结果包共用这些章节信息，正文进入 `content/chapter00/`–`content/chapter09/`，图片及图形进入对应的 `assets/chapterXX/`，正文包装也保留 `data-chapter` / `data-chapter-id`。关闭自动转换后直接导出或写入，会先转换尚未应用的副本编辑。切换代码章节不会把导出缩小为当前一章；输出范围仍由 PPT / frames 决定，也不会自动登记正式网站课程目录。

## 1. 项目文件结构

```text
tools/tex2html/
  index.html              输入、预览、规则与命令参考面板
  converter.css           工作台界面与响应式布局
  core.js                 扫描、宏定义、展开、JSON、HTML 与导出清单
  app.js                  界面控制、页面编辑、存储、导入导出、MathJax
  working-copy.js         提取工作副本、章节边界、编辑版本和双击位置映射
  zip.js                  无依赖 UTF-8 ZIP 打包（store 模式）
  server.js               可选本机静态服务 + XeLaTeX / dvisvgm 编译
  launch.js               Windows 服务启动、探测与浏览器入口
  README.md               本说明与设计文档
  AGENTS.md               智能体维护手册
  examples/
    example.tex
    example.sty
    example-converted.zip   示例的浏览器模式导出结果，含待处理图形源码
  tests/
    build.test.js
    core.test.js
    color.test.js
    server.test.js
    color-preview.html     浏览器颜色公式检查入口
    color-preview.js
    launch-compile-smoke.js 已启动服务的真实编译检查
```

工具与学生页面的学习记录相互独立。导出的正文和共享 CSS 由课程网站生成器接入；转换器本身不会自动登记课程目录或重写学习记录。

## 2. 页面界面草图

```text
┌ TeX → 知识页 ───────────── 保存方案 · 导入方案 · 导出 ZIP ┐
│ TeX 输入与 frame 选择     │ 结果预览与页面编排           │
│ .tex / .sty / 图片       │ 页面 / HTML / JSON / CSS   │
│ 代码审阅、编辑与主题      │ 明亮 / 暗色、图形与警告     │
├─────────────────────────────────────────────────────────┤
│ 转换规则：分页、宏、环境样式、颜色、图形与本地服务        │
├─────────────────────────────────────────────────────────┤
│ 命令参考与搜索                                          │
└─────────────────────────────────────────────────────────┘
```

## 3. 转换数据结构

`convert(files, styleFiles, config, assets)` 先生成结构，再由 `refresh` / `renderPage` 生成 HTML。嵌套环境、列表、容器使用 `children`；图形可递归收集，因此不会仅存在于预览而遗漏于导出。

```json
{
  "version": 1,
  "section": "1.1",
  "pages": [{
    "id": "p1-0",
    "number": "1.1.1",
    "slug": "lesson-1-1-1",
    "title": "什么是向量？",
    "subtitle": "",
    "description": "",
    "sourceFrames": [1],
    "rules": {},
    "blocks": [{
      "id": "b2",
      "type": "definition",
      "environment": "definition",
      "title": "几何向量",
      "file": "example.tex",
      "sourceStart": 100,
      "sourceEnd": 220,
      "sourceStartLine": 7,
      "sourceEndLine": 10,
      "raw": "原始 TeX",
      "children": []
    }],
    "figures": [],
    "warnings": [],
    "html": "HTML 正文片段"
  }],
  "globalWarnings": [],
  "frames": [],
  "log": [],
  "registry": {},
  "config": {}
}
```

诊断字段为 `file / line / offset / command / raw / reason / suggestion / severity`。警告过滤仅影响界面，导出报告不会因过滤而丢弃诊断。主动隐藏的内容在报告中记为 `info`。

## 4. 自定义命令解析方案

- 扫描保留原长度的去注释文本；平衡括号读取嵌套参数，不用单个正则匹配整个 frame 或环境。
- 识别 `newcommand`、`renewcommand`、`providecommand`、简单无分隔符 `def`、`DeclareMathOperator`、`newtheorem`、`definecolor`。
- 识别现有 `theme.sty` 的 `\newcommand{\nc}{\newcommand}` 别名及后续 `\nc` 定义。
- 支持 0–9 个参数、第一参数的可选默认值、递归展开；最多 24 层、2000 次替换，检测宏循环。
- 命令表可以搜索、修改、启用／禁用、恢复、查看来源和使用位置；支持数学／文本／两者／保留模式。
- 用户定义的宏不会交给 JavaScript 执行。条件 TeX、动态控制序列、文件操作、带分隔符的 `def` 保留原文并报告。
- `pp`、`pause`、颜色命令和 Beamer 模式命令优先使用界面中的规则，避免导入的条件宏覆盖用户选项。
- `definecolor` 支持 `HTML`、`RGB`、`rgb`；复杂 xcolor 混色表达式需要用户指定颜色。

正文中的 `\color{...}` / `\color[HTML]{...}` 声明和 `\textcolor{...}{...}` / `\textcolor[HTML]{...}{...}` 会生成 HTML 颜色样式；颜色管理器中的颜色名、常见 CSS 颜色名及十六进制颜色可用。`\color` 在正文中按 TeX 的声明作用域处理：花括号组内局部生效，未分组时延续到当前 frame 后续段落。数学公式作为独立节点交给 MathJax，公式内部的颜色命令仍保留为数学 TeX；不要把正文颜色转换规则应用到公式源码。

公式中的 `\text{前面 \blue{蓝色} 后面}` 由本地 MathJax 3.2.2 的官方 `textmacros` 扩展处理；宏展开后的 `\textcolor` 仍在文本模式中生效，支持嵌套颜色和 `$...$`，颜色不泄漏到后面的文字或公式。该扩展随项目本地保存，无运行时 CDN 依赖。

## 5. TikZ / XY-pic / 表格 → SVG

`table` / `table*` 环境，以及含竖线列格式、`\cline`、`\multicolumn`、`\multirow` 的独立 `tabular`，交给本机 LaTeX 排版，自动串行生成明亮和暗色 SVG。跨列、局部横线、中文及 `\xleftrightarrow` 因此保留原生排版。简单的独立 `tabular` 仍转换为 HTML。

本地服务不可用或编译失败时保留源码和提示，可在“图形”页点击编译重试；同一表格不会在失败后不断自动重试。修改工作副本的表格后重新转换，会使用新源码编译。表格沿用图形的 SVG／TeX 导出、缓存和双击定位流程，不会写回原讲稿。旧方案中的复杂表格块会在显示时升级，保留页面编排和来源位置。

本地 MathJax 配置补充了 `\iddots`（从左下向右上的三点）；本机编译也提供该命令。例题固定显示完整细边框，标题位于上边框。载入旧共享 CSS 时只追加例题边框兼容规则，保留其他手工样式。

### 浏览器模式

仅支持数值二维坐标的 `\draw ... -- ...;` 折线与箭头、基本颜色、粗细和虚线。解析必须完整消耗图形源码；遇到节点、表达式、全局选项等未实现语法，整个图形进入“待处理”，不会导出截断图。

无法识别时保留源码、具体原因和占位框。用户可上传明亮／暗色 SVG，或指定站内 SVG 路径。XY-pic 默认进入同一替换或本地编译流程。

### 本地模式

```text
浏览器的图形原文与选项
  → 本机 POST /convert/tikz、/convert/xypic 或 /convert/table
  → 独立临时目录中的 standalone TeX
  → xelatex -no-pdf -no-shell-escape
  → XDV
  → dvisvgm --bbox=min --exact-bbox [--no-fonts]
  → SVG / 暗色 SVG / 日志
```

依赖 `xelatex`、`dvisvgm`、`standalone`、`ctex`、Fandol 字体、TikZ、XY-pic 和常用 AMS 包。它们通常由 TeX Live 提供。XDV 输入支持见 [dvisvgm 官方说明](https://dvisvgm.de/)。没有这些程序时，正文转换仍然可用。

明亮／暗色版分别编译，暗色重定义常用颜色；不使用反色滤镜。对任意用户硬编码的颜色不能自动判断最佳暗色语义，可在前导代码调整或上传人工设计的暗色 SVG。

宽度、背景、透明、裁剪、文本／路径、目录、文件名前缀、图注、滚动和宽高比有界面控制。文字转路径包含字形；文本模式可能依赖设备字体。改变编译专用选项后，在“图形”页点击“重置图形”，再“编译待处理图形”，或上传新的 SVG。重置也可撤销。

服务器禁用 shell escape，限制请求体、执行时间、并发和输出日志，拒绝明显的文件操作和动态控制序列；使用临时目录，完成后删除。它是本机可信讲稿工具，不是可公开暴露的 TeX 沙箱；不要把此接口部署到公网。

## 6. 数学环境样式

默认映射：theorem 定理、proposition 性质、lemma 引理、corollary 推论、definition 定义、example 例题、problem 习题、question 思考、fact 事实、proof 证明、remark 注。

默认外观参考 ElegantBook：除证明外，数学环境都使用完整细边框，环境标题嵌入上边框。每种环境使用独立配色：定理蓝、定义绿、性质／命题橙、引理紫、推论青、例题玫红、习题靛蓝、思考金黄、事实橄榄绿、注石灰棕。证明使用灰色细左线并默认折叠。正文继承页面文字颜色，明暗主题与打印样式分别生成。

所有环境都不显示编号。TeX 可选标题显示在环境名称之后，例如 `\\begin{definition}[线性运算]` 显示为“定义（线性运算）”。标题中的行内公式会继续由 MathJax 排版。每种环境可设置标签、明亮／暗色标题色与背景、边框色、折叠、图标、标题与正文字号、内边距、圆角和打印背景。环境样式面板不再提供“显示编号”；旧配置中的编号开关也不会重新启用编号。章节、知识页编号和导出路径保持不变。

证明环境的可选参数替换标题：`\begin{proof}[XXX]` 显示为“XXX”，不再显示“证明（XXX）”；无参数时仍显示“证明”。颜色、字号、左边线和折叠行为保持原样，参数中的格式和行内公式继续保留。

旧工作区和导入方案首次使用此版本时，会自动更新各环境及页面环境规则的配色，并暂存原外观以便恢复。共享 CSS 中其他手工规则保留，仅追加可更新的环境外观兼容块。之后手动调整的颜色会随方案保存，重新转换或刷新不会再次重置。此迁移保留工作副本、页面编排和图形缓存，不会修改原始讲稿。

旧工作区可在“样式”面板点击“应用新版数学环境样式”。该操作只更新环境外观配置和共享 CSS，保留讲稿、宏、分页、图形设置与页面编排；应用前会暂存旧外观，“恢复上次样式”可以还原。原先手工写入共享 CSS 的规则会由新生成 CSS 替换。

```html
<fieldset class="math-block math-block-theorem">
  <legend class="math-block-heading">
    <span class="math-block-label">定理</span>
    <span class="math-block-title">（交换律）</span>
  </legend>
  <div class="math-block-body">...</div>
</fieldset>
```

证明默认使用 `details.lecture-proof`，可在全局样式或本页选项中改为展开。当前片段包含 `.tex-converted` 和页面作用域类，环境样式独立保存在共享 `css/tex2html.css` 中，不再自动内嵌 `<style>`。网站已有的 `[data-theme="dark"]` 可触发暗色外观。已保存的共享 CSS 会保留；需要按新规则重建样式时，使用 CSS 标签中的“恢复自动生成”。

## 7. 浏览器与本地服务接口

### `GET /health`

```json
{"ok":true,"engine":"xelatex","dvisvgm":true,"token":"随机本机会话令牌"}
```

### `POST /convert/tikz` / `POST /convert/xypic`

请求头为 `Content-Type: application/json` 和 `X-Tex2HTML-Token`。界面自动从 health 获取令牌。

```json
{
  "source": "\\begin{tikzpicture}...\\end{tikzpicture}",
  "options": {
    "width": 640,
    "transparent": true,
    "crop": true,
    "textMode": "path",
    "dark": true,
    "background": "#ffffff",
    "darkBackground": "#182131",
    "libraries": "arrows.meta,calc",
    "preamble": ""
  }
}
```

成功返回 `{svg, darkSvg, warnings, log}`；编译失败返回 HTTP 422 和 `{error, log}`。403 表示来源或令牌不符，429 表示正在处理其他图形。只允许同源 localhost 工具或本地文件页面调用。

## 8. 第一阶段代码与导出兼容

本目录的 HTML、CSS、JS 即完整可运行源码，无打包步骤。Node 测试与浏览器共用 `core.js`。

ZIP 默认结构：

```text
converted/
  content/chapter01/section01/lesson-1-1-1.html
  css/tex2html.css
  assets/chapter01/figure-fig-xxxx.svg
  assets/chapter01/figure-fig-xxxx-dark.svg
  assets/chapter01/figure-fig-xxxx.tex  # 对应图形的 TeX 源码
```

HTML 只含正文片段及作用域类名，不含 `html/head/body`、网站页眉页脚或学习按钮。共享 CSS 写入网站的 `css/tex2html.css`，生成页面时由网站生成器在 `<head>` 中按相对路径加载。图片路径使用 `{{root}}assets/...`，生成器会替换成正确的相对路径。

**现有构建器按 `js/course.js` 中的目录生成页面，并不会自动扫描新增 HTML。**

- 更新已有知识页：在“编辑本页”中使用该页已有 slug，将生成的对应 HTML 和资源复制到网站后运行 `node scripts/build-lessons.js`。
- 增加知识页：先将页面 slug、标题和说明登记到 `js/course.js` 对应小节的 `pages` 数组，再运行构建。工具不自动重写已有学习记录 ID 或整个课程目录。
- 新章节：正文可按配置导出到 `chapterXX`；当前网站主构建入口会调用后续章节生成器，已覆盖第一至第九章。第十、十一章或其他新范围还需检查并扩展生成器，不能仅导出正文或登记目录。
- 页面标题和说明由 `js/course.js` 的课程目录提供；独立网页的页头由网站构建器负责，默认正文不重复输出它们。
- TeX 引用的课程图片可沿用网站现有的 `assets/chapterXX/` 路径；仅有路径引用不代表图片已打包。已导入并关联到内容块的图片会随导出清单写入当前章节目录。图形 SVG 和对应 TeX 源码也按当前章节放在 `assets/chapterXX/`。选择目录写入时，若目标网站已有 `css/tex2html.css`，该文件会自动保留；其他同名文件会列出并在确认后覆盖。ZIP 包含共享 CSS，手工合并时需自行保留目标网站已有的修改。

## 9. 测试 TeX 与验证

将 `examples/example.tex` 与 `examples/example.sty` 一起导入。预期得到 3 个知识页；默认 `pp` / `pause` 不分页。前两页含定义、例题、定理、折叠证明和简单 TikZ；第三页演示递归宏、未知命令警告及 XY-pic 本地编译。

```powershell
# 转换器核心、导出和 HTTP 服务测试
node --test tools/tex2html/tests/*.test.js

# 原课程网站回归测试
node --test tests/*.test.js
node scripts/build-lessons.js --check

# 可选：真实 XeLaTeX / dvisvgm 集成测试
$env:TEX2HTML_LATEX_TEST = '1'
node --test tools/tex2html/tests/server.test.js
Remove-Item Env:TEX2HTML_LATEX_TEST
```

测试包含嵌套括号、注释、来源行号、两种 frame 写法、宏别名和参数、递归循环、停顿规则、未知命令、SVG 失败回退、ZIP 与站内路径。还会直接读取现有第一章 `01 vectors.tex` 与 `theme.sty` 进行真实讲稿回归。

Node 测试不代替浏览器中的拖拽、方案恢复、目录写入和 MathJax 排版检查。`build.test.js` 当前主要验证第一章接入，不能据此推断后续章节已全部验证。

2026-09-28 文档核对时，工具测试结果为 30 项通过、2 项失败、1 项真实 LaTeX 测试跳过：一项仍断言旧的 `assets/imported/a.png` 导出路径；另一项为 `build.test.js` 进程非零退出，尚无具体诊断。详见 [智能体手册中的既有问题](AGENTS.md#10-本次核对发现的既有问题)。这些问题本次仅记录，未修改功能或测试来掩盖失败。

## 10. 已知限制与后续阶段

这不是完整 TeX 引擎；第一阶段之外的行为有明确回退。

- 任意 TeX 条件、计数器运算、catcode、动态定义、宏生成 frame、宏定义作用域和复杂参数语法不执行。普通未知命令／环境完整显示，警告报告可追溯。
- 顶层停顿和数学环境可分页。嵌套环境中的分页降为知识块并给出警告，避免生成断裂环境。手动选区插入的分隔线也遵循此规则。
- 页面及内容块可拖动排序、移动到其他页；目前没有自由像素位置的拖动分界线。页内分界通过内容块拆分或源码选区调整。
- 重新转换全部会按源文件重建编排；已有标题、说明、slug 等页面元数据尽量保留。手工合并／拆分／块编辑可用撤销或保存方案恢复。建议先定规则再做页面编排。
- 重新转换单页使用来源 frame；对于已经手动拆成多页的 frame，会重新取完整 frame，因此会重置该页手工边界。
- 单页独立规则目前提供证明展开状态与正文标题；完整逐页规则覆盖仍待扩展。
- `only/uncover/visible/onslide` 的单分支版本支持显示、隐藏、折叠、补充或保留；`alt` 另外可选择第一／第二分支。没有推测 overlay 数字的教师／学生语义。无参数 overlay 开关保留并警告。
- `columns` 支持 `\column{宽度}` 与 `column` 环境，按宽度比例弹性分栏，空间不足时自动换行；不是 PPT 的像素级复刻。`multicols` 仍按阅读顺序转为单栏。复杂表格、交叉引用解析、全局连续脚注、复杂新环境仍属于后续阶段。未实现的表格保留完整源码。
- 图片应导入到工具。没有图片时显示路径占位和警告。SVG 上传会去除活动内容和外部引用。外部链接不在转换时抓取。
- 英文 slug 默认为 `lesson-1-1-1`，不会自动联网翻译中文标题；可在界面手动填写英文语义 slug。
- 环境标题不生成编号，也不复现 LaTeX `newtheorem` 的共享计数器关系。
- 所有环境样式与已实现转换选项均可在界面修改；未实现功能不会用无效开关伪装为已支持。

第二阶段可以继续扩展图形依赖与分页编辑；第三阶段可以完善多栏、表格、脚注、overlay 语义和课程目录的自动登记。当前提供的第一阶段功能、附加编辑／导出功能和局限均以上述说明为准。
### 共享 CSS

“结果预览”中的 CSS 标签显示当前工作区的共享样式。首次转换时自动生成一次；之后不会随 TeX 文件切换或重复转换而覆盖。可以直接编辑并点击“保存 CSS”，导出 ZIP 和目录写入会使用已保存的 `css/tex2html.css`。点击“恢复自动生成”才会根据当前转换规则重新生成。


## 图形和诊断修复（2026-09-28）

- `rightline` 转为右对齐文字；带上下标的双向鱼叉箭头保留标签，不再误报基础箭头命令。
- XY-pic 的 `@R` / `@C` 间距选项、数学环境内的图形和 `boxed` 内的 TikZ 整体识别；内部箭头、节点不再被拆成未知正文命令。
- 独立图形编译加载 `mathtools`，支持图形标签中的 `xRightarrow`，并将外层显示数学分隔符适配为 standalone 可用的数学模式。
- 复杂 TikZ 仍需点击“编译待处理图形”；成功后移除对应待处理提示和旧编译错误。不会用简化折线冒充含节点、圆和椭圆的完整图。
- 更新 `server.js` 后必须重启旧服务；刷新页面后需要重新转换才能更新已保存模型中的诊断。重新转换前可“保存方案”备份手工编辑。
- 回归：`node --test tools/tex2html/tests/diagnostics.test.js`。已有 LaTeX 时，在当前终端临时设置 `TEX2HTML_LATEX_TEST=1` 可验证所报告真实图形的明暗 SVG，完成后恢复该变量原值。


## 中文 SVG 基线与旧图更新（2026-09-28）

已确认 dvisvgm 3.0.3 的 XDV 转路径会使部分中文下移，属于上游 [#235](https://github.com/mgieseki/dvisvgm/issues/235)，3.1 已修复。转换器按实际版本选择流程：低于 3.1 使用 XeLaTeX → PDF → dvisvgm --pdf；3.1 及以上保留 XDV 流程。不改变讲稿字体，也不对汉字施加固定偏移。PDF 兼容流程使用 xetex 图形驱动，输出文字路径；即使选择文本模式，也会在日志说明此次使用路径。需要本机 dvisvgm 的 PDF 支持；失败会保留原图及编译诊断。

仅为单幅图形增加数学分隔符、或切换 LF/CRLF 换行，不再使旧图形缓存失配。盒子及图形外的其他数学内容仍参与图形识别，避免误用不同图形的缓存。原始 TeX 保留用于定位和导出。

显示旧方案时，会自动检查源码包含中文、SVG 带典型 dvisvgm XDV 字形结构且没有已修复标记的历史缓存，并排队重新编译；成功后替换明暗图，失败保留旧图。新 SVG 和缓存记录编译版本、PDF／XDV 流程与来源，避免修好的图重复更新。明确标记为上传、指定路径、PDF 编译或 dvisvgm 3.1 以上的图不自动替换。没有元数据的历史缓存依据结构识别，不能断定所有旧图的生成版本。

也可在“图形”视图重新编译单图；“编译待处理图形”允许重试待修复的旧图。自动失败同一会话内不会循环重试。“重新编译全部图形”会替换当前范围内已上传的图形，可先保存方案备份。修改服务后须重启服务，再刷新页面。

回归：`node --test tools/tex2html/tests/baseline.test.js`；临时设置 `TEX2HTML_LATEX_TEST=1` 后追加真实明暗图形编译。该测试还覆盖版本选择、旧缓存复用与不同外框/正文不能共用缓存。
