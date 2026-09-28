# 线性代数课程网站维护说明

这是一个纯静态的中文线性代数课程网站。网页不依赖数据库、Node.js 或在线服务；Node.js 只用于维护阶段生成页面和运行检查。

## 2026-09-28 正文更新后的构建方式

第一章已采用新的 `lesson-1-*` 正文，共 22 页；第 5、7、8 章分别新增一页。当前第一至第九章共 213 个知识页，另有 `content/chapter00/lesson-0-1.html` 生成的课程简介，入口位于首页课程目录上方。

第一章旧模板已移除。`scripts/build-lessons.js` 现在统一调用 `scripts/build-additional-chapters.js` 生成第一至第九章和课程简介。第一章旧知识页网址保留跳转，五个子节锚点保留。新版第一章使用新的知识页记录编号：旧 v2 记录仍保存在本地及备份中，最近阅读位置转到对应新版页面，旧完成标记不直接套用到重新划分的正文。第 2–9 章已有编号保持不变。

检查命令使用 `node --test tests/site.test.js tests/progress.test.js`。站点检查已覆盖所有章节的正文一致性、边界导航，并检查全部正文文件是否登记到目录。

## 项目结构

```text
线性代数课程网站/
├─ index.html                         课程主页
├─ chapters/                          生成后的章节、子节和知识页面
│  ├─ chapter01.html
│  ├─ chapter02.html … chapter09.html
│  └─ chapterXX/sectionXX/             子节首页和知识页
├─ content/                            手动维护的正文 HTML 片段
│  ├─ chapter00/                       课程简介正文
│  ├─ chapter01/                       第一章新版正文片段
│  └─ chapter02/ … chapter09/          第 2–9 章正文片段
├─ assets/                             SVG、图片和深色模式图片
├─ css/                                全站和章节样式
├─ js/
│  ├─ course.js                        章节、子节、知识页目录数据
│  ├─ progress.js                      本地学习记录的唯一存储入口
│  └─ main.js                          导航、课程菜单、进度和页面交互
├─ scripts/
│  ├─ build-lessons.js                 页面生成入口
│  └─ build-additional-chapters.js     第一至第九章及课程简介的统一生成器
├─ tests/                              站点和学习记录测试
├─ 讲稿/tex/                            原始 TeX / Beamer 讲稿
└─ README.md                            本文件
```

`content/` 是正文源文件，`chapters/` 是生成结果。修改正文时优先修改 `content/`，不要直接编辑生成后的章节页面。课程结构和页面标题在 `js/course.js` 中维护。不要修改 `assets/vendor/` 中的 MathJax 文件。

## 生成和检查

在网站根目录执行：

```bash
node scripts/build-lessons.js
node --test tests/site.test.js
node scripts/build-lessons.js --check
```

第一条命令会重新生成第一至第九章的章节页、子节页、知识页、整节阅读和目录。测试会检查站内链接、图片、脚本、锚点、正文一致性和页面顺序。

如果 `--check` 报告页面过期，先运行生成命令，再重新检查。发布到个人主页时，至少上传 `index.html`、`chapters/`、`css/`、`js/` 和 `assets/`。

## 课程层级

网站使用三级学习结构：

```text
课程
└── 章节
    └── 子节
        └── 知识页
```

当前已接入第一至第九章。第十、十一章仍保留在课程目录中，暂未开放。主页和页眉课程菜单会从 `js/course.js` 自动生成章节、子节和知识页链接。

每个知识页都有稳定的学习记录编号。发布后不要随意修改章节 id、子节 id、知识页 id 或页面 slug，否则会影响已有学习记录和收藏链接。

## 修改正文

第一章正文位于：

```text
content/chapter01/section01/
content/chapter01/section02/
content/chapter01/section03/
content/chapter01/section04/
content/chapter01/section05/
```

第 2–9 章正文位于对应的 `content/chapterXX/sectionXX/` 文件夹。每个 HTML 文件是一个知识页片段，SVG 和图片放在 `assets/chapterXX/`。

正文片段中可以使用：

- 普通 HTML 段落、列表和标题
- MathJax LaTeX 行内公式与独立公式
- `figure`、SVG、表格和自测 `details`
- 已有的定义、例题、思考题和教学块样式

图片路径应使用 `{{root}}assets/...`，生成器会根据页面深度替换路径。不要把完整 HTML 页面头部复制到 `content/` 片段中。

## 学习功能

知识页提供：

- 难度评价：很轻松、正合适、有点难
- 标记为已学会 / 撤销学会标记
- 上一知识点、下一知识点和继续学习
- 当前章节、子节和知识页进度
- 最近阅读位置
- 本地记录查看、备份和恢复

学习记录保存在浏览器 `localStorage`，不会上传服务器。所有记录读写都在 `js/progress.js` 中。不要在页面脚本中另行实现一套记录逻辑。

## 页眉课程菜单

章节、子节和知识页的页眉左侧都有“线性代数”品牌区域：

- 电脑端悬停“线性代数”即可展开课程菜单
- 手机端点击菜单入口展开
- 菜单包含章节、子节和知识页三级链接
- 右侧空间不足时，子菜单自动向左展开
- 弹出窗口使用不透明背景
- “课程首页”是独立的普通链接

菜单由 `js/main.js` 根据 `js/course.js` 自动生成。修改课程目录时，不要在每个 HTML 页面里手工复制菜单。

## 新增或接入章节

如果正文 HTML 和 SVG 已经准备好：

1. 将正文放入 `content/chapterXX/sectionXX/`。
2. 将图片和 SVG 放入 `assets/chapterXX/`。
3. 在 `js/course.js` 中登记章节、子节数量和知识页数量。
4. 确认页面 slug 与 `content/` 文件名一致。
5. 运行 `node scripts/build-lessons.js`。
6. 运行站点测试和 `--check`。
7. 检查章节页、子节页、知识页、页眉菜单、图片和手机布局。

不要直接复制第一章生成后的 HTML 作为长期维护方式。生成页面会在下一次构建时被覆盖。

## 样式维护

公共样式位于 `css/style.css`，知识页和学习交互样式位于 `css/lessons.css`。桌面端和手机端通过媒体查询共用一套 HTML；修改字号、卡片、目录或菜单时，要同时检查：

- 宽屏电脑
- 窄窗口电脑
- 约 360px 宽的手机
- 约 390px 宽的手机
- 明亮模式和暗色模式
- 菜单靠近屏幕边缘时的展开方向

## 交给其他智能体时的说明

请先阅读本 README 和相关源文件，再修改。必须遵守：

- 正文优先修改 `content/`
- 目录优先修改 `js/course.js`
- 生成结果不要作为唯一修改目标
- 不要删除已有学习记录字段和稳定 id
- 不要擅自重排数学内容或合并知识页
- 修改后重新生成页面并运行测试
- 最后说明修改了哪些文件、是否影响手机端和学习记录

常用任务描述示例：

```text
请根据 README 的维护规则，修改 content/chapter04/section02 中的正文。
保持知识页顺序、页面 slug、学习记录 id 和页眉课程菜单不变。
完成后运行 node scripts/build-lessons.js、node --test tests/site.test.js
和 node scripts/build-lessons.js --check。
```

## 离线与发布

网站使用本地 MathJax 和本地图片，断网仍可阅读。双击 `index.html` 可以查看基本页面；需要可靠共享学习记录时，使用固定的本地预览地址或正式网站地址。不要只上传 HTML 而遗漏 `css/`、`js/` 或 `assets/`。
