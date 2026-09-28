# TeX → 知识页转换工作台：智能体维护手册

适用范围：`tools/tex2html/` 及其与课程网站的集成。开始任务时阅读网站根目录 `AGENTS.md`、`README.md` 和本目录 `README.md`，再按任务阅读源码。本手册根据 2026-09-28 的实现整理；源码和实际验证用于确认现状，用户要求决定修改目标。

## 1. 定位与约束

本工具把 TeX / Beamer 讲稿转换为可编辑的知识页正文片段，并导出 CSS、图片和图形源码。它不是完整 TeX 引擎，也不是学生网站的生产后端。

- 保持原生 HTML / CSS / JavaScript，无 npm 安装和打包步骤。
- `core.js` 同时供 Node 测试和浏览器使用，不能把 DOM、文件系统或服务依赖混入核心转换接口。
- 未支持内容保留源码并给出可定位警告，不能静默删除或用不完整图形冒充成功。
- 不执行导入的 JavaScript，不把宏展开改为 `eval`；保留输入清理、编译限制和路径检查。
- 维护工具不应无意改变学生页面、学习记录或正式课程目录。只有接入课程的任务才修改这些文件。
- 不要批量重新转换并覆盖手工整理的课程正文来“同步”工具变更。

## 2. 文件职责与阅读路线

| 文件 | 责任与修改入口 |
| --- | --- |
| `index.html` | DOM、面板、按钮、对话框和脚本顺序；修改 id 前搜索 app.js 的引用 |
| `converter.css` | 工作台布局、主题、代码区、预览和操作按钮；注意后部覆盖规则 |
| `core.js` | 默认配置、扫描、宏展开、转换模型、HTML/CSS 渲染、导出清单、编译请求 |
| `app.js` | 文件导入、讲稿选择、frame 选择、状态、编辑撤销、预览、方案、下载与目录写入 |
| `zip.js` | 无依赖 UTF-8 ZIP，store 模式；输入为路径与文本/字节数组 |
| `server.js` | 网站静态资源、讲稿读取 API、依赖检测、受限的本机图形编译 |
| `launch.js` | Windows 启动、服务复用、就绪检查、日志及打开浏览器 |
| `../../启动 TeX 转换器.bat` | ASCII、CRLF 启动入口，不把复杂启动逻辑塞回批处理 |
| `tests/core.test.js` | 扫描、宏、分页、图形、导出、ZIP 和真实讲稿回归 |
| `tests/color.test.js` | 颜色宏、参数保留、共享 MathJax 配置 |
| `tests/build.test.js` | 临时目录中接入第一章生成器的测试 |
| `tests/server.test.js` | HTTP 限制、源码拒绝规则、SVG 后处理及可选真实编译 |
| `tests/color-preview.html`、`color-preview.js` | 浏览器实际颜色公式检查 |
| `tests/launch-compile-smoke.js` | 已启动服务上的七幅真实图形编译检查 |

与外部文件的关系：MathJax 配置为 `../../js/mathjax-config.js`，运行资源在 `../../assets/vendor/mathjax/`；导出共享样式为 `../../css/tex2html.css`；课程目录在 `../../js/course.js`。不要手工修改第三方 vendor 文件。

## 3. 数据流与核心接口

```text
TeX + sty + 配置 + 图片
  → parseStyles / parse / expand
  → convert → model.pages[].blocks
  → refresh → figures + page.html
  → 浏览器预览 / exportFiles
  → preparedEntries → ZIP 或目录写入
```

Node 中通过 `require('./core')` 使用核心，浏览器中使用 `window.Tex2HTML`。主要接口：

| 接口 | 用途及注意事项 |
| --- | --- |
| `defaults()` / `mergeConfig(input)` | 获取默认配置与合并新配置；保留嵌套默认项及危险键过滤 |
| `parseStyles(files)` | 提取宏、环境、颜色等定义 |
| `uncomment(source)` / `group(...)` / `parse(...)` | 保留位置的注释处理、平衡括号读取、结构扫描 |
| `expand(...)` | 按上下文展开宏，保留递归与替换预算限制 |
| `convert(files, styleFiles, config, assets)` | 输入文件项包含 name、text；产生结构化转换模型 |
| `walkBlocks(blocks, callback)` | 递归遍历 children 和 attachments；嵌套图片和图形必须使用递归路径 |
| `pageConfig(model, page)` | 合并全局配置与页规则 |
| `renderPage(page, config)` / `pageCSS(config, scope)` | 分别生成正文和共享样式 |
| `refresh(model)` | 修改模型，清理并去重 slug、收集图形、重新生成 page.html |
| `exportFiles(model)` | 会先 refresh，再返回导出条目，不是只读快照 |
| `figureCompileRequest(raw, macros, figureConfig)` | 只发送当前图形与白名单编译选项 |

模型当前版本为 1；重要字段包括 `pages`、`frames`、`registry`、`config`、`globalWarnings`、`log`。页面保留 `id`、`number`、`slug`、标题、层级、来源 frame、`rules`、`blocks`、`figures`、`warnings`、`html`。块保留原文、文件、来源起止位置与行号；这些用于双击跳转和警告定位，不可随意去掉。

修改块结构后必须检查扫描、转换、递归遍历、渲染、编辑和导出全部路径。只让预览出现内容不代表 ZIP 中已有相应资源。

## 4. TeX 解析与内容保真

- 核心 `uncomment` 以保留原长度的方式处理注释，以维持 offset。`app.js` 的源码清理用于讲稿载入和展示，不能与核心扫描中的处理混为一谈。
- 嵌套括号和环境通过结构扫描处理，不能用一个宽泛正则替代整个 frame、数学环境或宏参数解析。
- 宏支持简单声明、别名、0–9 参数、可选首参数与递归展开；当前限制为最多 24 层、2000 次替换。不要取消循环检测。
- 数学中原生 MathJax 命令应保留。颜色命令的模型参数、嵌套内容、矩阵换行、XY-pic 内嵌数学分隔符是已有回归重点。
- 正文颜色与数学颜色分开处理：正文 `\\color` / `\\textcolor`（含 `[HTML]` 模型）生成 HTML 样式，`\\color` 遵循花括号局部作用域并可跨当前 frame 的段落延续；公式节点内的颜色源码必须保持 TeX 并交给 MathJax。不要在公式节点外统一重写公式文本。
- 数学环境默认外观由 `defaults().environments`、`renderBlock()` 和 `pageCSS()` 共同生成：除 proof 外全部使用 fieldset/legend 或可折叠 details/summary 的完整细边框，标题嵌在上边框；正文继承页面文字色，强调色用于标题。更改默认值后同步更新网站 `css/tex2html.css` 和工具 README。已保存工作区的环境设置及 `cssText` 优先级更高，样式迁移入口需只替换环境外观、保留其他转换设置，并提供旧外观恢复。
- 环境配色现按每种类型独立设置，`migrateEnvironmentPalettes()` 在旧方案缺少 `config.environmentPaletteVersion: 1` 时，更新全局与页面环境颜色并备份旧外观；不重建页面。之后保留用户新设的颜色。`ensureEnvironmentPaletteCSS()` 更新兼容块，保留其他 CSS，负责明暗色、细边框、打印及页面覆盖。预览和导出都走此入口。
- 所有环境取消编号：默认 `numbered:false`，`mergeConfig()` 也关闭旧配置中的该值；转换不再创建环境计数，渲染不使用旧块的 `number`。样式面板移除编号选项；旧 HTML 的 `.math-block-number` 由共享 CSS 隐藏。章节与知识页编号、slug、来源位置均保持不变。不要把环境编号与课程路径编号混为一谈。
- `proof` 的非空可选标题通过 `renderBlock()` 替换环境标签，不额外添加“证明”或括号；保留 `titleHtml` 中的格式与公式。无标题沿用配置标签。此规则也作用于已保存模型；不改变 proof 的类名、CSS、正文和折叠状态，其他环境仍显示“名称（标题）”。
- `pp`、`pause` 默认忽略；可以配置分页、知识块、折叠等。嵌套环境内不安全分页应保留完整环境并警告。
- section / subsection / subsubsection 分别对应章、节、知识页；相同知识页层级下的多个 frame 可以合并。
- 普通未知命令、环境、条件和复杂 TeX 行为保留原文并报告。新增支持必须同时检查正常、嵌套、缺参数和不支持变体。
- 基础 `tabular` 的行列与横线已有实现和测试，但不代表完整支持复杂 TeX 表格、多栏精确排版或任意交叉引用。

诊断应保留文件、行号、offset、command、raw、reason、suggestion、severity。警告筛选只影响显示，不能借此丢弃导出诊断信息。

## 5. 浏览器状态、编辑与保存

更新：工作区持久化现由 `workspace-storage.js` 管理，使用 IndexedDB 数据库 `tex2html-workspace`、对象仓库 `workspaces`、键 `current`。旧 localStorage 键仅作为迁移读取来源。保存按快照串行提交，以事务完成作为成功；启动先等待恢复，恢复成功后不调用会覆盖状态的默认讲稿初始化。以下旧 localStorage 容量说明仅适用于历史版本。新增 `tests/workspace-storage.test.js` 验证大快照、写入顺序、迁移和失败恢复；模拟数据库测试不等同于实际浏览器配额测试。

工作区存储键为 `tex2html-workspace-v1`，与学生学习记录分开。状态含输入文件、样式、图片、配置、模型、共享 CSS 和最近记录。方案导出用于恢复完整工作；配置导出只保存规则。

- `remember()` 当前最多保留 12 个撤销快照，快照包含模型、配置、输入、图片和共享 CSS。新编辑操作要接入已有撤销与保存流程。
- `convertAll()` 根据源文件重建模型，仅尽量保留匹配页面的已编辑元数据；手工拆分、合并、块调整不保证保留。
- 自动预览默认经约 450ms 防抖触发转换，规则修改可能触发重建，不能认为“只刷新外观”。
- 单页重新转换使用来源 frame，已拆分页的手工边界可能改变。
- 导入方案与替换图形经过 `sanitizeConfig`、`sanitizeModel`、`safeHTML`、`safeSVG` 等路径。新增导入入口不能绕开清理逻辑，也不能将这些函数描述为通用安全沙箱。
- 存储空间不足时提示下载方案；不要用清空整个 localStorage 的方式解决。
- 页面启动先尝试恢复本地方案，再执行讲稿目录初始化。涉及恢复行为时核对整个启动顺序，不应仅检查读取存储那一行。

共享 CSS 当前保存在 `state.cssText` 并传递到模型；首次转换时生成，后续转换通常保留。用户点击“保存 CSS”或“恢复自动生成”具有不同语义。修改环境规则时同时检查配置、已保存 CSS 与实际预览，不能假设重新转换会覆盖手工 CSS。

## 6. 工作台布局与预览

这是电脑端维护工具：输入与预览始终并排，规则在下一行，命令参考另有面板。`converter.css` 后部存在带 `!important` 的桌面布局覆盖，不能根据文件开头的旧媒体查询推断最终布局。

- 根目录学生网站的手机响应式要求不意味着要把本工具擅自改为手机单栏。
- 内容块按钮在悬停或键盘聚焦时出现，修改时保留键盘可达性。
- 区分全局界面主题、TeX 代码区主题和结果明暗预览。
- 预览依赖异步 MathJax；检查真实公式排版而不只是 HTML 字符串。
- 改变渲染时检查 HTML / JSON / CSS / 图形 / 警告等视图，不能只验证默认页面预览。

## 7. 本地服务、启动和图形编译

### 7.1 启动方式

从网站根目录运行 `node tools/tex2html/server.js`；默认监听 `127.0.0.1:4174`。直接运行 server 可使用 `TEX2HTML_PORT` 自定义端口；`launch.js` 当前固定使用 4174，并在创建服务时设置该端口。

启动器会复用符合页面探测与 health 检查的已有服务，不会自动重启。多工作树可能共用同一端口，启动器的检查不证明服务来自当前工作树。验证本次代码前确认服务来源，修改 server 后重启相应旧实例，不要停止无关进程。

`launch.js --no-browser` 可跳过打开浏览器；它仍可能启动后台服务。日志写入系统临时目录 `tex2html-launch/server-*.log`。普通文档任务不需要启动服务或安装 LaTeX。

### 7.2 HTTP 接口

| 接口 | 实现与边界 |
| --- | --- |
| `GET /api/lecture-manifest` | 列出讲稿 sections、默认样式路径与图片；也接受 `/tools/tex2html` 前缀 |
| `GET /api/lecture-file?path=...` | 在讲稿根内读取资源；限制路径和文件大小 |
| `GET /health` | 检查 xelatex、dvisvgm 并返回会话 token；工具页面可访问不代表编译依赖可用 |
| `POST /convert/tikz`、`/convert/xypic`、`/convert/table` | JSON 请求和 `X-Tex2HTML-Token`；返回 svg、darkSvg、warnings、log |

默认样式优先取 `讲稿/tex/common/theme/_hanhai.sty`，不存在时使用 `common/theme_hanhai.sty`。旧的 `theme.sty` 仍被部分测试读取，不能混淆测试样式与界面默认样式。

服务校验 loopback Host 与 Origin。编译 token 不符返回 403，并发占用返回 429，非 JSON 返回 415，请求超限返回 413，编译失败返回 422。其他路径或 JSON 错误按实际服务处理。

### 7.3 编译链路与不可破坏的约束

```text
单幅原文 + 宏展开 + 白名单选项
  → validate → 独立临时目录 → standalone TeX
  → xelatex -no-pdf -no-shell-escape → XDV
  → dvisvgm → SVG 后处理 → 明亮/暗色结果 → 清理临时目录
```

- `figureCompileRequest` 不发送整个工作区、历史 SVG 或 replacements。已有测试模拟超过 260 KB 的缓存，保证请求体不随缓存膨胀。
- 当前 HTTP 请求体上限 260000 字节；源码检查使用字符串长度 180000，前导代码长度 20000。不要把两种计量混写为同一种字节上限。
- 服务器逐幅处理，`app.js` 按 figureId 去重并顺序提交；不要直接改成无界并发。
- `table` / `table*` 和复杂独立 `tabular` 使用 `kind: 'table'` 图形块，保留整个原文和来源范围。服务器仅去除外层浮动环境，用 array、multirow、booktabs、caption 与 mathtools 排版。禁止文件操作等校验保持一致。简单独立表格仍走 HTML 转换。
- `scheduleTableCompilation()` 自动排队待处理表格，`compilerBusy` 防止同一页面并发请求，`attemptedTables` 防止失败后无限重试。手动编译允许重试；源码改变产生新缓存键。`upgradeLegacyTables()` 只升级旧方案中相关块，不重建页面编排。修改这些路径需检查明暗 SVG、导出、缓存、失败提示和工作副本定位。
- `ensureExampleFrameCSS()` 保留共享 CSS 并更新单个例题边框兼容块，重复调用不能增长文本；预览与导出都使用该规则。例题不采用 proof 外观。`js/mathjax-config.js` 和本机 wrapper 分别定义适配各自引擎的 `iddots`，不能混用两种 raise 语法。
- `compileFigures()` 主要选择尚无明亮 SVG 的图形，修改编译选项或补暗色版本时可能需要先重置已有结果。
- 外部进程使用参数数组、`shell:false`、隐藏窗口、超时和日志限制。保留 `-no-shell-escape`、文件操作拒绝规则和临时目录边界校验。
- 明暗图分别编译，不用反色滤镜；文本转路径模式用于携带字形，文本模式可能依赖终端字体。
- 临时目录在 finally 清理；若需改清理逻辑，仍要先验证解析后的绝对路径位于预期临时根下。
- 该服务仅用于本机可信讲稿，不能作为公开 TeX 编译沙箱部署。

## 8. 导出与课程集成

`exportFiles()` 返回含 `path`、`text` 或 `data` 的条目；浏览器 `preparedEntries()` 将二进制资源准备为字节，再交给 ZIP 或目录写入。

- ZIP 增加 `converted/` 前缀，目录写入则直接写相对网站根的路径。
- 页面导出到 `content/chapterXX/sectionXX/<slug>.html`；子节优先来自页面的 `subsectionIndex`，再参考页面编号和默认节号。
- 图片、图形和图形原始 TeX 当前导出到 `assets/chapterXX/`，不要根据默认配置里旧的 directory 值推断真实导出路径。
- HTML 仅包含 `.tex-converted` 正文及页面作用域类，不包含完整网页、学习按钮或自动内嵌的环境 `<style>`。共享样式独立导出为 `css/tex2html.css`。
- 上传并关联的图片可随结果导出；仅引用已有课程资源的路径不能被当成已经打包的图片。
- 目录写入自动保留目标目录已有的 `css/tex2html.css`，其他冲突文件显示列表后按现有界面流程处理。写入不是事务，失败可能留下部分成功文件。
- slug 清理与去重可能改变导出名称，更新正式知识页时核对最终名称，不自动重写已有学习编号。
- 正式课程目录由 `js/course.js` 管理，不随导出自动登记。当前生成器覆盖第 1–9 章，第 10、11 章仍需扩展支持。

## 9. 按任务选择验证

所有命令从网站根目录运行。无需 npm 安装。

```powershell
# 核心、颜色、集成与服务回归
node --test tools/tex2html/tests/core.test.js tools/tex2html/tests/color.test.js tools/tex2html/tests/build.test.js tools/tex2html/tests/server.test.js

# 涉及正式网站集成时
node --test tests/site.test.js tests/progress.test.js
node scripts/build-lessons.js --check
```

实际修改课程源文件时按根目录手册先生成页面。纯工具文档修改无需重新生成全站。

| 修改类型 | 重点验证 |
| --- | --- |
| 解析、宏、分页 | 最小 TeX 复现、嵌套/错误输入、原文和定位保留、真实讲稿 |
| 颜色和公式 | color.test.js 与浏览器 color-preview.html，确认明暗两种排版 |
| 模型、导出 | 嵌套资源、重复 slug、子节目录、中文文件名、ZIP 和目录写入 |
| 编辑、方案和 CSS | 撤销、保存恢复、重新转换边界、用户 CSS 保留，需浏览器检查 |
| 布局与主题 | 电脑宽屏/窄窗口、代码区和预览主题、滚动、键盘与按钮 |
| 服务与启动 | Host/Origin/token、失败与超限、服务实例、依赖缺失和日志 |

真实编译测试需已有 XeLaTeX 和 dvisvgm：按 README 设置 `TEX2HTML_LATEX_TEST=1` 运行 server.test.js，执行后恢复该环境变量原值。`launch-compile-smoke.js` 需要先启动实际服务，固定访问 4174，并编译七幅图的明暗版本，不在普通回归命令中自动执行。

覆盖限制：build.test.js 的临时工程当前只复制主生成器，未复制后续章生成器，不能证明第 2–9 章集成。Node 测试也不能证明拖拽、下载、目录授权、异步 MathJax 或浏览器恢复过程正常。

## 10. 本次核对发现的既有问题

2026-09-28 在当前工作树运行工具全部 `tests/*.test.js`：76 项通过、2 项失败、4 项可选真实 LaTeX 测试跳过。工作副本浏览器回归，以及 `table-example-browser.js` 的真实 MathJax、明暗表格编译、旧样式与旧表格迁移、双击定位检查通过；实际 4174 服务也完成用户表格的明暗编译。环境配色专项的 4 项测试与独立浏览器检查通过，覆盖 11 种明暗配色、旧工作区／页面规则／共享 CSS 迁移、环境编号移除、颜色编辑保存和源码定位。本次 section 章节分拆增加 6 项核心回归；真实 00–09 浏览器检查与更新后的工作副本浏览器回归通过，覆盖单章编辑、跨章定位、关闭自动转换后的 ZIP、章信息持久化和只读原稿。此处用于交接线索，未来修改后应更新，不视为永久允许失败。

- core.test.js 的嵌套资源测试仍断言 `assets/imported/a.png`，而 exportFiles 当前按章导出到 `assets/chapter01/a.png`。修复相关任务时核对预期行为及引用，不应直接放宽断言。
- build.test.js 进程非零退出，当前输出未提供具体诊断；尚未确定根因，不能宣称是沙箱、权限或生成器错误。
- 网站 `site.test.js` / `progress.test.js` 共 16 项通过、1 项失败：学习汇总测试只完成第一章，却断言全课程达到 100%，实际为 13%。该检查读取未改动的 course.js / progress.js，与本次转换器修复无关；页面生成只读 `--check` 通过。
- README 曾保留“三栏布局”“片段自动内嵌样式”“只生成第一章”等旧描述，本次文档整理已修正；其他能力仍应以相关源码和验证为准。

## 11. 排障与交付

定位顺序：输入与选中 frames → 配置 → 模型块和警告 → HTML/CSS → 预览 → 导出清单 → 正式课程生成。图形问题另查请求内容、health、编译日志和 SVG 明暗结果。

不要用删警告、丢弃未知块、清除用户方案或强制覆盖共享 CSS 来消除症状。服务连不上先区分启动失败、端口实例不符和 LaTeX 不可用。

交付时说明修改文件、行为变化、对原有方案/导出/正式课程的影响、已执行检查及未验证部分。已有失败与本次引入的问题分开说明。文档随行为变更同步更新，不把已知限制写成已实现功能。

## 12. 默认批量范围（2026-09-28 更新）

启动时一次载入 00–09，设置 `config.lectureBatch=true`；`lectureSelection` 是 PPT 白名单，空数组表示默认范围，界面仍显示 00–09 全部勾选。默认状态的第一次点击由 `toggleLectureSelection` 转为仅选点击章节，即便浏览器原生复选框此时报告 unchecked；后续按正常多选处理，全部取消则恢复默认。仅展开菜单不会改变选择。`frameSelection` 按文件名保存索引；PPT 改变会重置 frame 筛选。核心 `selectLectureFiles` 负责范围交集。`lectureChapter` 允许绪论编号 0。

页面保存 `chapter` 和 `sourceFile`；批量编号、`pageConfig`、图形引用和 `exportFiles` 必须使用页面所属章节，不能退回全局章号。`preparedEntries` 需要保留图片 data 并转为 bytes，不能只导出文本文件。`tests/batch.test.js` 验证默认范围、筛选恢复、章节 0、按章导出和十份真实讲稿。工作区过大仍可能触发 localStorage 限额，应保留提示，不将转换成功等同于持久保存成功。


## 13. 图形解析与分栏回归（2026-09-28）

`xymatrix` 命令和其后的 `@R` / `@C` 参数须分开识别，但整个平衡图形体保留在同一 figure 中。数学扫描跳过平衡括号内的分隔符，避免 TikZ 节点或 XY 文字中的 `$` 截断外层公式。数学环境含图形时不要递归拆成正文；`boxed` 图形须保留数学上下文。

`columns` / `column` 块通过 children 参与 walkBlocks、资源导出和编辑。布局样式在结构节点上提供，兼容已有方案中的手工共享 CSS。宽度用于弹性比例，窄容器换行；不承诺精确复刻幻灯片。不得为移除警告而删除不支持内容。

本地编译导言加载 mathtools；外层显示数学适配 standalone 的盒子环境。图形成功替换后，同时清理同源位置的旧编译错误，失败时仍保留诊断和原文。新回归文件为 tests/diagnostics.test.js，含全部 00–09 解析与可选真实编译。


## 14. 中文基线与图形缓存兼容

server.compilerFormat 按 dvisvgm 版本分支：<3.1 使用 PDF（上游 #235），否则 XDV。PDF 使用 xetex driver，强制文字路径；不要取消文件操作限制、shell escape 限制或误将两种驱动混用。未知版本报错，不猜测已修复。PDF 后端失败保留诊断，不自动回退到存在基线错误的 XDV。

core.figureCacheKeys 为单幅图形消除外层数学包装与换行格式对缓存的影响，同时保留旧编号别名。boxed、额外正文或多幅图不能与单幅裸图共用缓存。makeFigure 同时考虑编译原文与源节点原文；重置图形需删除全部别名，避免旧 SVG 再出现。

app.compileFigures 支持单图编号或 '*' 主动重新编译；已有 SVG 保留到成功替换。默认入口处理待编译图形和待修复的旧中文图。验证不能仅断言 SVG 存在；还应对照混排中文与数学的实际基线。baseline.test.js 含版本/缓存回归及可选真实编译。

更新：`figureNeedsBaselineRepair()` 识别含中文源码的历史 XDV 字形缓存。自动队列也会编译待修复图；默认手动入口允许重试。`attemptedBaselineRepairs` 防止同一会话失败循环。成功结果保存 `compiler`、`origin:'local'`，SVG 根记录 `data-tex2html-format` / `data-tex2html-version`；手动上传记录 `origin:'upload'`。明确修好的图、上传和路径图不会自动覆盖。旧缓存无版本标记时依据结构识别，不声称精确知道生成版本；失败保留明暗旧图与源码位置。测试夹具 `tests/fixtures/legacy-chinese-xdv.svg` 是先前报告图的错误输出，不用于正式课程。

MathJax 本地配置额外加载同版本官方 `textmacros` 扩展，支持数学 `text` 内的颜色、文本命令和内嵌数学。转换核心继续保留原有 `textcolor` 作用域，不靠拆分 `text` 或 HTML 重写绕过文本模式。`text-color-baseline-browser.js` 在隔离浏览器数据库中检查 7 组实际公式、旧图自动更新、编译元数据、失败保留、页面编排与双击定位。

## 15. 提取工作副本与定位（用户明确要求）

用户永远不修改原始讲稿 `.tex`。`state.files` / `state.styles` 是只读导入快照；编辑、清空、插入分页不得给这些快照的 text 赋值，更不得新增讲稿写回 API。

`working-copy.js` 是纯 JavaScript 的工作副本模块。`state.workingCopies` 按文件指纹及 PPT / frames 范围保存草稿，`workingKey` 指向当前副本。代码框的文本、转换输入和复制内容来自同一份副本；文件名注释可编辑，但章节身份依据 segments 元数据。转换按 segments 拆回虚拟文件，保留章节编号，关闭原始 frame 索引的二次筛选。只读讲稿中的宏声明作为独立宏来源补充到转换 registry，不能把其旧 offset 用于正文定位。

模型保存 `workingKey` 和 `workingSource`（revision + segments 快照）。块 sourceStart/sourceEnd 属于转换时的虚拟文件，双击通过 segments 得到代码框内的绝对范围；未转换期间的编辑记录更新这个范围。成功转换后清理已不需要的旧编辑记录。旧方案缺少这些字段时从 origins 映射迁移，保留手工编排；不得直接拿原始讲稿 offset 去选择工作副本。

## 16. 按 section 分章的代码区与输出

`core.chapterSections(files, config)` 使用结构扫描找顶层（或 document 内）的 section，包含星号版本；跳过注释、宏参数、公式和 frame 内标题。同一文件内支持多个章，默认十份编号讲稿对应 0–9，部分选择保留原章号；未编号的合并文件从 0 顺序计数。model.chapters 保存 file、chapter、id、title、start/end、sectionStart，其中 offset 相对各虚拟文件。转换在 section 切换时清空旧 subsection/subsubsection 层级、重置子节计数，knowledgeKey 包含 chapterId，禁止跨章同名知识页合并。

代码区 `code-chapter-select` 只控制显示；PPT / frames 控制整体转换与输出范围。`doc.activeChapter` 随副本持久化；`doc.chapters` 为代码显示用的全副本绝对范围，不能直接当作核心模型中的文件内 offset。`codeView.start/end` 是当前文本框在完整副本中的范围。所有输入、清空、粘贴、插入分页必须通过 `commitSourceInput()` 拼回原副本，只修改当前范围，不以 textarea.value 覆盖整个文档。`W.update(doc,text,ownerName)` 在单章末尾插入时保留所属文件，避免把追加内容移入下一文件。

双击先通过 W.locate 把旧来源定位到当前完整副本，再切到包含目标的章节，textarea selection 需减去 codeView.start。转换、文件内来源映射和宏读取仍基于完整虚拟文件，不把单章显示范围当作全部转换输入。

model.frames/pages 保存 chapter 和 chapterId；pageConfig 始终使用页面归属，exportFiles 和图形 HTML 使用同一章号。正文包装保留 data-chapter/data-chapter-id，JSON 视图、方案备份包含 chapters。preparedEntries 在副本版本尚未转换时先转换，失败阻止输出，成功后 ZIP 与目录写入共用清单。恢复旧方案时 bindLegacySources 补齐章信息，保留工作副本和页面编排。不要借本功能登记 js/course.js 或重写发布页面。

`tests/chapter-sections.test.js` 验证扫描边界、章计数、同名知识页、分章图形/图片路径、纯正文、真实十章、副本末尾插入；`tests/chapter-sections-browser.js` 在隔离上下文验证真实 00–09 章节选择、编辑保持、刷新、跨章定位、待转换编辑导出和章信息备份。可用 TEX2HTML_BROWSER_BASE 指定实际本地服务；不操作用户现有浏览器存储。

IndexedDB、方案 JSON 和撤销快照均应保存副本与版本。切换筛选范围先保留当前草稿，再打开或新建对应草稿。测试使用独立浏览器上下文及随机端口，不清除或改写用户浏览器数据库。`tests/working-copy.test.js` 覆盖跨章、重复正文、插入/删除、持久化和原始快照不变；可选 `tests/working-copy-browser.js` 使用可用的 Playwright 与 Edge 执行实际编辑、双击、复制、主题、刷新及范围切换检查。
