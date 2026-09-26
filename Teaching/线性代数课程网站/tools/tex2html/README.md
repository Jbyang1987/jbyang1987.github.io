# TeX → 知识页转换工作台

这是第一阶段的可运行实现：原生 HTML / CSS / JavaScript，使用课程网站已有的本地 MathJax。核心正文转换在浏览器完成；复杂 TikZ、XY-pic 由可选的本机 LaTeX 服务执行。

## 运行与基本操作

在课程网站根目录运行：

```powershell
node tools/tex2html/server.js
```

打开 [本地转换器](http://127.0.0.1:4174/tools/tex2html/)。无需 npm 安装。服务器仅监听 `127.0.0.1`；关闭运行它的终端可停止服务。默认端口为 4174，可通过 `TEX2HTML_PORT` 环境变量修改。

也可以直接双击本目录 `index.html`；正文、示例、样式、JSON 和 ZIP 导出不需要服务器。部分浏览器会限制 `file://` 下的剪贴板、目录写入或本地编译请求，遇到限制时使用上述 localhost 入口。若内嵌浏览器没有保存下载文件，请用 Edge / Chrome 打开同一工具页面。

1. 导入一个或多个 `.tex`，再导入所依赖的 `.sty` 和图片。输入框可以切换查看和编辑 TeX、sty。
2. 中栏设置停顿、分页、命令、颜色和数学环境样式。修改后默认自动转换。
3. 右栏选择页面，检查公式、证明、图形和警告。警告附文件、行号、原代码和跳转按钮。
4. 在页面目录中多选合并、使用箭头或拖动排序。在内容块下使用“从此处拆分”、编辑、移动、删除、恢复。
5. “保存方案”包含输入文件、导入图片、规则、当前页面编排和编辑结果。仅导出“转换配置”则只保存规则。
6. 导出 ZIP，检查 `conversion-report.json` 后再将结果接入课程网站。

这是电脑端工具，工作区始终保持输入与预览并排、转换规则位于下一行的桌面布局。桌面内容块操作在鼠标悬停或键盘聚焦时显示。

## 讲稿目录模式

通过 `node tools/tex2html/server.js` 启动本地服务后，转换器会读取当前项目中的 `讲稿/tex`：TeX 文件来自 `讲稿/tex/sections`，样式默认使用 `讲稿/tex/common/theme/_hanhai.sty`；当前仓库若没有该文件，会自动使用实际存在的 `讲稿/tex/common/theme_hanhai.sty`。图片默认来自 `讲稿/tex/pic`。

在“TeX 输入”面板中，从“讲稿 sections 中的 TeX 文件”下拉框选择章节，系统会自动读取 TeX、默认样式和图片。选择 frame 后，操作行下方只显示所选 frame 的 TeX 代码；未选择时不显示正文代码。加载后，“选择 frames”会列出该文件中的 frame；连续选择时点击起点和终点即可选中范围，取消选择的 frame 不会进入本次转换。浏览器仍可使用“导入 .tex/.sty/图片”处理临时文件。

打开转换器时默认加载 `01 vectors.tex`，默认选中全部 frame 并自动转换；切换其他 TeX 文件时也会自动全选并转换。

TeX 代码审阅区提供浅色、深色和护眼三种主题，并对命令、注释、数学分隔符和括号进行语法高亮；切换只影响代码展示区。

TeX 源码读取到页面代码区时，会先删除整行注释代码并压缩多余空行；正常的 `\frametitle` / `\framesubtitle` 会保留。

转换时会按 TeX 标题层级组织内容：`section` 对应章节，`subsection` 对应子节，`subsubsection` 对应知识页面。同一 `subsubsection` 下的多个 frame 会合并到同一知识页面。知识页预览会显示章节 / 子节路径，并使用 `subsubsection` 作为页面标题。

## 1. 项目文件结构

```text
tools/tex2html/
  index.html              三栏工具页面
  converter.css           工作台界面与响应式布局
  core.js                 扫描、宏定义、展开、JSON、HTML 与导出清单
  app.js                  界面控制、页面编辑、存储、导入导出、MathJax
  zip.js                  无依赖 UTF-8 ZIP 打包（store 模式）
  server.js               可选本机静态服务 + XeLaTeX / dvisvgm 编译
  README.md               本说明与设计文档
  examples/
    example.tex
    example.sty
    example-converted.zip   示例的浏览器模式导出结果，含待处理图形源码
  tests/
    build.test.js
    core.test.js
    server.test.js
```

没有改动现有学生页面、学习进度代码和 `scripts/build-lessons.js`。

## 2. 页面界面草图

```text
┌ TeX → 知识页 ───────────── 保存方案 · 导入方案 · 导出 ZIP ┐
│ 01 TeX 输入        │ 02 转换规则       │ 03 结果预览       │
│ .tex / .sty / 图片 │ 规则 / 命令 / 样式│ 页面列表与编排    │
│ 文件切换、搜索    │ 分页与编号        │ 明亮 / 暗色       │
│ 行号 + TeX 编辑器 │ 停顿与 Beamer     │ 页面 / HTML / JSON│
│ 粘贴、清空、示例  │ 宏与环境样式      │ 图形 / 警告 / 日志│
│ 手动选区与分隔线  │ SVG 与本地服务    │ 编辑、拆分、撤销  │
│ 文件与最近记录    │ 自动预览 / 转换   │ 复制、下载、目录  │
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

## 5. TikZ / XY-pic → SVG

### 浏览器模式

仅支持数值二维坐标的 `\draw ... -- ...;` 折线与箭头、基本颜色、粗细和虚线。解析必须完整消耗图形源码；遇到节点、表达式、全局选项等未实现语法，整个图形进入“待处理”，不会导出截断图。

无法识别时保留源码、具体原因和占位框。用户可上传明亮／暗色 SVG，或指定站内 SVG 路径。XY-pic 默认进入同一替换或本地编译流程。

### 本地模式

```text
浏览器的图形原文与选项
  → 本机 POST /convert/tikz 或 /convert/xypic
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

每种环境可设置标签、明亮／暗色文字、背景、左边框、编号、折叠、图标、标题与正文字号、内边距、圆角和打印背景。`newtheorem` 的自定义环境继承定理外观，随后可单独编辑。

```html
<section class="math-block math-block-theorem">
  <div class="math-block-heading">
    <span class="math-block-label">定理</span>
    <span class="math-block-number">1.1.1</span>
  </div>
  <div class="math-block-body">...</div>
</section>
```

证明默认使用 `details.lecture-proof`，可在全局样式或本页选项中改为展开。片段内包含以页面类名作用域隔离的 `<style>`，无需另改网站 CSS；网站已有的 `[data-theme="dark"]` 可触发暗色外观。

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
  assets/generated/figure-fig-xxxx.svg
  assets/generated/figure-fig-xxxx-dark.svg
  assets/generated/figure-fig-yyyy.tex  # 未转换图形的原始代码
  assets/imported/图片.jpg
  manifest.json
  course-pages.json
  conversion-report.json
  conversion-config.json
```

HTML 只含正文片段及作用域样式，不含 `html/head/body`、网站页眉页脚或学习按钮。图片路径使用 `{{root}}assets/...`，现有 `build-lessons.js` 会替换成正确的相对路径。

**现有构建器按 `js/course.js` 中的目录生成页面，并不会自动扫描新增 HTML。**

- 更新已有知识页：在“编辑本页”中使用该页已有 slug，将生成的对应 HTML 和资源复制到网站后运行 `node scripts/build-lessons.js`。
- 增加知识页：先按 `course-pages.json` 的条目登记到 `js/course.js` 对应小节的 `pages` 数组，再运行构建。工具不自动重写已有学习记录 ID 或整个课程目录。
- 新章节：正文可按配置导出到 `chapterXX`；当前网站构建器本身仅覆盖第一章，因此第二章以后的整站构建仍需扩展原构建器。
- 页面标题和说明写入 manifest／course-pages；独立网页的页头由网站构建器负责，默认正文不重复输出它们。
- 单独下载 HTML 不含图片资源；含图页面应下载完整 ZIP。选择目录写入时，浏览器会要求目录权限，已有同名文件会列出后再覆盖。

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

## 10. 已知限制与后续阶段

这不是完整 TeX 引擎；第一阶段之外的行为有明确回退。

- 任意 TeX 条件、计数器运算、catcode、动态定义、宏生成 frame、宏定义作用域和复杂参数语法不执行。普通未知命令／环境完整显示，警告报告可追溯。
- 顶层停顿和数学环境可分页。嵌套环境中的分页降为知识块并给出警告，避免生成断裂环境。手动选区插入的分隔线也遵循此规则。
- 页面及内容块可拖动排序、移动到其他页；目前没有自由像素位置的拖动分界线。页内分界通过内容块拆分或源码选区调整。
- 重新转换全部会按源文件重建编排；已有标题、说明、slug 等页面元数据尽量保留。手工合并／拆分／块编辑可用撤销或保存方案恢复。建议先定规则再做页面编排。
- 重新转换单页使用来源 frame；对于已经手动拆成多页的 frame，会重新取完整 frame，因此会重置该页手工边界。
- 单页独立规则目前提供证明展开状态与正文标题；完整逐页规则覆盖仍待扩展。
- `only/uncover/visible/onslide` 的单分支版本支持显示、隐藏、折叠、补充或保留；`alt` 另外可选择第一／第二分支。没有推测 overlay 数字的教师／学生语义。无参数 overlay 开关保留并警告。
- `columns` / `multicols` 按阅读顺序转为单栏；精确栏宽、复杂表格、交叉引用解析、全局连续脚注、复杂新环境仍属于后续阶段。未实现的表格保留完整源码。
- 图片应导入到工具。没有图片时显示路径占位和警告。SVG 上传会去除活动内容和外部引用。外部链接不在转换时抓取。
- 英文 slug 默认为 `lesson-1-1-1`，不会自动联网翻译中文标题；可在界面手动填写英文语义 slug。
- 环境编号目前按环境类型与当前小节计数，不复现任意 LaTeX `newtheorem` 共享计数器关系。
- 所有环境样式与已实现转换选项均可在界面修改；未实现功能不会用无效开关伪装为已支持。

第二阶段可以继续扩展图形依赖与分页编辑；第三阶段可以完善多栏、表格、脚注、overlay 语义和课程目录的自动登记。当前提供的第一阶段功能、附加编辑／导出功能和局限均以上述说明为准。
### 共享 CSS

“结果预览”中的 CSS 标签显示当前工作区的共享样式。首次转换时自动生成一次；之后不会随 TeX 文件切换或重复转换而覆盖。可以直接编辑并点击“保存 CSS”，导出 ZIP 和目录写入会使用已保存的 `assets/tex2html.css`。点击“恢复自动生成”才会根据当前转换规则重新生成。
