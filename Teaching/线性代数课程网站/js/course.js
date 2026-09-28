/* 课程目录。顺序对应「讲稿/tex/线性代数 智慧课程.tex」的 include 列表。
   章节中文名对应 sections 中各文件的 section 标题；* 表示讲稿中的选学内容。
   增加章节时，在这里登记；未开放章节的 path 保持 null。
   id 是学习记录的永久编号。发布后不要随意更改已有 id。 */
window.Course = {
  chapters: [
    { id: "chapter01", number: "01", title: "向量", description: "从空间向量与线性运算，到坐标变换、数域与高维数组。", path: "chapters/chapter01.html", sections: 5 },
    { id: "chapter02", number: "02", title: "线性方程组", description: "方程组的基本问题、高斯消元法及其矩阵表示。", path: "chapters/chapter02.html", sections: 5 },
    { id: "chapter03", number: "03", title: "矩阵(一)", description: "矩阵运算、乘法与应用、逆矩阵、转置及分块矩阵。", path: "chapters/chapter03.html", sections: 6 },
    { id: "chapter04", number: "04", title: "行列式", description: "行列式的定义、性质与计算，可逆判定与 克拉默法则。", path: null },
    { id: "chapter05", number: "05", title: "矩阵(二)", description: "初等变换、初等矩阵与分块运算，矩阵的秩与相抵。", path: null },
    { id: "chapter06", number: "06", title: "线性空间", description: "子空间、线性相关性、极大无关组、秩、基与维数。", path: null },
    { id: "chapter07", number: "07", title: "线性映射", description: "映射与矩阵、相似关系、特征值、对角化与若当标准形。", path: null },
    { id: "chapter08", number: "08", title: "内积空间及变换", description: "内积、标准正交基、正交与伴随变换、正交投影。", path: null },
    { id: "chapter09", number: "09", title: "实二次型", description: "二次型的标准形、规范形与正定性，二次曲线和曲面。", path: null },
    { id: "chapter10", number: "10", title: "张量简介*", description: "选学：张量积、不同基下的表象、对称与反对称张量。", path: null },
    { id: "chapter11", number: "11", title: "应用*", description: "选学：桁架静力分析、电网络分析与层次分析法。", path: null }
  ]
};

/* 三级目录：稳定的 id 用于学习记录，slug 用于网址。 */
(function (course) {
  const base = "chapters/chapter01/section01/";
  course.chapters[0].lessons = [
    { id: "chapter01-section01", number: "1.1", title: "向量及其运算", description: "从认识向量开始，逐步理解加法、减法、数乘及其基本性质。", path: base + "index.html", readingPath: base + "index.html", anchor: "vector-operations",
      pages: [
        { slug: "what-is-a-vector", title: "什么是向量？", description: "从速度、位移和力认识大小、方向与向量记号。" },
        { slug: "equal-vectors", title: "什么时候两个向量相等？", description: "理解向量相等，以及为什么平移不改变向量。" },
        { slug: "special-vectors", title: "几种特殊的向量", description: "认识零向量、单位向量和负向量。" },
        { slug: "vector-addition", title: "向量怎样相加？", description: "用平行四边形法则与三角形法则作图。" },
        { slug: "vector-subtraction", title: "向量怎样相减？", description: "先取负向量，再做加法，注意箭头方向。" },
        { slug: "scalar-multiplication", title: "一个数乘向量意味着什么？", description: "判断长度与方向的变化，认识线性运算。" },
        { slug: "addition-laws", title: "向量加法满足什么规律？", description: "理解交换律、结合律、零元与负元。" },
        { slug: "scalar-laws", title: "数乘满足什么规律？", description: "理解单位元、结合律与两条分配律。" },
        { slug: "review", title: "本节回顾与自测", description: "串联概念，用两道题检查是否理解。" }
      ] },
    { id: "chapter01-section02", number: "1.2", title: "向量线性相关性", description: "从线性组合与张成空间出发，理解向量组中方向是否冗余。", path: "chapters/chapter01/section02/index.html", readingPath: "chapters/chapter01/section02/index.html", legacyPath: "chapters/chapter01.html#vector-dependence", anchor: "vector-dependence", pages: [
      { slug: "linear-combinations", title: "什么是线性组合？", description: "用加法和数乘，从一组向量得到新的向量。" },
      { slug: "span", title: "线性组合能到达哪些位置？", description: "从直线、平面理解向量组的张成。" },
      { slug: "linear-independence", title: "什么叫线性相关？", description: "理解“不全为零”的系数条件。" },
      { slug: "dependence-example", title: "怎样证明向量组线性相关？", description: "跟随讲稿例题，找出一组不全为零的系数。" },
      { slug: "review", title: "线性相关性的几何判断", description: "联系三维几何与即时自测。" }
    ] },
    { id: "chapter01-section03", number: "1.3", title: "坐标系、坐标与坐标变换", description: "从仿射坐标系出发，理解向量坐标运算与基变换。", path: "chapters/chapter01/section03/index.html", readingPath: "chapters/chapter01/section03/index.html", legacyPath: "chapters/chapter01.html#coordinates", anchor: "coordinates", pages: [
      { slug: "coordinate-intuition", title: "坐标轴一定要互相垂直吗？", description: "从空间中的点、向量和仿射坐标系开始。" },
      { slug: "affine-basis", title: "什么是仿射坐标系？", description: "理解原点与一组基如何描述空间中的点。" },
      { slug: "coordinate-operations", title: "坐标怎样进行线性运算？", description: "在坐标中逐分量计算向量的和与数乘。" },
      { slug: "coordinate-change", title: "坐标怎样变换？", description: "推导原点和平移、基改变时的坐标关系。" },
      { slug: "review", title: "坐标与坐标变换回顾", description: "区分点的坐标与自由向量的坐标。" }
    ] },
    { id: "chapter01-section04", number: "1.4", title: "复数与数域", description: "从实数坐标推广到复数，认识复平面与数域。", path: "chapters/chapter01/section04/index.html", readingPath: "chapters/chapter01/section04/index.html", legacyPath: "chapters/chapter01.html#complex-and-fields", anchor: "complex-and-fields", pages: [
      { slug: "complex-intuition", title: "向量的分量一定是实数吗？", description: "为什么需要复数与更一般的数域？" },
      { slug: "complex-plane", title: "怎样在复平面上表示复数？", description: "连接代数表示、模长、辐角和共轭。" },
      { slug: "number-fields", title: "什么是数域？", description: "明确允许作为坐标和系数的数集。" },
      { slug: "review", title: "复数与数域回顾", description: "用一个复数例子检查模长、共轭与数域。" }
    ] },
    { id: "chapter01-section05", number: "1.5", title: "数组向量", description: "把三维几何向量推广为任意维数组，掌握分量运算与基本向量。", path: "chapters/chapter01/section05/index.html", readingPath: "chapters/chapter01/section05/index.html", legacyPath: "chapters/chapter01.html#array-vectors", anchor: "array-vectors", pages: [
      { slug: "array-intuition", title: "怎样从三个坐标走向任意多个分量？", description: "认识数组向量以及高维表示。" },
      { slug: "array-definition", title: "什么是 n 维数组向量？", description: "学习数域、分量、行向量和列向量的记号。" },
      { slug: "high-dimensional-examples", title: "高维数组可以表示什么？", description: "从时空事件、颜色、成绩和特征向量建立直觉。" },
      { slug: "array-operations", title: "数组向量怎样进行线性运算？", description: "逐分量定义加法、数乘、零向量和相等。" },
      { slug: "standard-vectors", title: "什么是基本向量？", description: "用基本向量表示任意数组向量。" },
      { slug: "review", title: "数组向量回顾与自测", description: "联系高维线性运算、相关性与基本向量。" }
    ] }
  ];
  const additionalSections = {
    chapter02: [
      { number: "2.1", title: "概念和基本问题", description: "认识线性方程组、解与解集。", pages: ["研究对象", "线性方程组", "线性方程组的解", "关于线性方程组的几个基本问题"] },
      { number: "2.2", title: "Gauss 消元法", description: "用初等变换逐步化简并求解方程组。", pages: ["Gauss消元法", "方程的三种初等变换"] },
      { number: "2.3", title: "Gauss 消元法的矩阵表示", description: "用矩阵记录消元过程和方程组结构。", pages: ["矩阵", "Gauss消元法的矩阵表示"] },
      { number: "2.4", title: "一般线性方程组的 Gauss 消元法", description: "分析一般方程组的解与消元算法。", pages: ["一般线性方程组的 Gauss 消元法（算法）", "线性方程组解空间定性分析", "高斯消元法的计算效率"] },
      { number: "2.5", title: "练习题", description: "通过典型题目检查本章掌握情况。", pages: ["本章内容相关考题"] }
    ],
    chapter03: [
      { number: "3.1", title: "矩阵及其线性运算", description: "认识矩阵、特殊矩阵及矩阵的线性运算。", pages: ["矩阵的定义", "特殊矩阵命名", "矩阵的例子", "应用中的一些例子", "矩阵的线性运算", "基本矩阵"] },
      { number: "3.2", title: "矩阵乘法", description: "从线性映射理解矩阵乘法及其基本性质。", pages: ["数组向量空间之间的线性映射", "矩阵与线性映射", "线性映射的合成与矩阵的乘法", "矩阵的乘法", "矩阵乘法运算的基本性质", "矩阵多项式"] },
      { number: "3.3", title: "矩阵乘法的应用", description: "用矩阵乘法描述图论、复数、方程组和坐标变换。", pages: ["图论与矩阵乘法", "复数与二阶实数矩阵", "线性方程组与矩阵乘法", "线性映射与矩阵乘法", "坐标变换与矩阵乘法", "大模型注意力机制"] },
      { number: "3.4", title: "逆矩阵", description: "理解逆矩阵的定义、性质和计算。", pages: ["需要什么样的逆", "逆矩阵定义", "逆矩阵性质", "逆矩阵（例）"] },
      { number: "3.5", title: "转置、共轭与迹", description: "学习矩阵的转置、共轭和迹及其性质。", pages: ["转置、共轭与迹", "转置和共轭的基本性质"] },
      { number: "3.6", title: "分块矩阵", description: "用分块结构理解矩阵的表示与运算。", pages: ["分块矩阵", "分块矩阵例子", "几类特殊分块矩阵", "分块矩阵基本性质", "分块矩阵的乘法"] }
    ]
  };
  /* 第四至第九章的网页正文已放入 content/chapterXX；这里登记其子节和知识页数量，页面标题按原稿层级生成。 */
  const preparedChapters = {
    chapter04: { sections: [["行列式定义", 6], ["行列式性质", 7], ["可逆判定", 2], ["Cramer 法则", 1], ["行列式的计算", 1]] },
    chapter05: { sections: [["初等变换", 2], ["初等矩阵的应用", 4], ["分块矩阵的初等变换及应用", 3], ["秩与相抵", 6], ["相关例题", 2]] },
    chapter06: { sections: [["数组空间", 4], ["线性相关性", 3], ["极大无关组", 3], ["秩", 5], ["基与维数", 2], ["坐标与坐标变换", 2], ["线性方程组解集的结构", 5], ["一般线性空间的定义", 7], ["一般线性空间的理论", 5], ["子空间*", 3]] },
    chapter07: { sections: [["线性映射", 3], ["线性映射与矩阵的对应", 3], ["线性变换与方阵的对应", 5], ["线性函数与对偶空间*", 3], ["不同基下的矩阵与相抵（相似）关系", 3], ["特征值与特征向量", 5], ["相似不变量", 2], ["相似对角化", 4], ["相似上三角化与若当标准形", 3]] },
    chapter08: { sections: [["欧氏空间的定义", 5], ["度量矩阵（内积的矩阵表示）", 2], ["标准正交基", 2], ["正交变换", 4], ["伴随变换", 3], ["实对称矩阵的对角化", 1], ["欧氏空间的子空间", 2], ["酉空间*", 7]] },
    chapter09: { sections: [["正交相合标准形与相合规范形", 2], ["二次型", 2], ["二次型的标准形", 6], ["正定二次型", 5], ["二次曲线与二次曲面的分类", 2]] }
  };
  Object.keys(preparedChapters).forEach(function (chapterId) {
    const target = course.chapters.find(function (item) { return item.id === chapterId; });
    const prepared = preparedChapters[chapterId];
    if (!target) return;
    target.path = "chapters/" + chapterId + ".html";
    target.sections = prepared.sections.length;
    additionalSections[chapterId] = prepared.sections.map(function (entry, index) {
      const number = Number(target.number) + "." + (index + 1);
      return { number: number, title: entry[0], description: "围绕" + entry[0] + "展开定义、性质、计算与应用。", pages: Array.from({ length: entry[1] }, function (_, pageIndex) { return entry[0] + " · 第" + (pageIndex + 1) + "页"; }) };
    });
  });
  Object.keys(additionalSections).forEach(function (chapterId) {
    const target = course.chapters.find(function (item) { return item.id === chapterId; });
    if (!target) return;
    target.lessons = additionalSections[chapterId].map(function (section, sectionIndex) {
      const folder = "section" + String(sectionIndex + 1).padStart(2, "0");
      const base = "chapters/" + chapterId + "/" + folder + "/";
      return {
        id: chapterId + "-section" + String(sectionIndex + 1).padStart(2, "0"),
        number: section.number,
        title: section.title,
        description: section.description,
        path: base + "index.html",
        readingPath: base + "index.html",
        pages: section.pages.map(function (title, pageIndex) {
          return { slug: "lesson-" + Number(target.number) + "-" + (sectionIndex + 1) + "-" + (pageIndex + 1), title: title, description: title };
        })
      };
    });
  });
  course.chapters.forEach(function (chapter) {
    (chapter.lessons || []).forEach(function (section) {
      section.chapterId = chapter.id;
      (section.pages || []).forEach(function (page, index) {
        page.id = section.id + "-" + page.slug;
        page.chapterId = chapter.id;
        page.sectionId = section.id;
        page.sectionNumber = section.number;
        page.number = index + 1;
        page.path = section.path.replace(/index\.html$/, page.slug + ".html");
      });
    });
  });
  const allSections = function () { return course.chapters.flatMap(function (chapter) { return chapter.lessons || []; }); };
  const allUnits = function () { return course.chapters.filter(function (chapter) { return chapter.path; }).flatMap(function (chapter) {
    return chapter.lessons ? chapter.lessons.flatMap(function (section) { return section.pages || [section]; }) : [chapter];
  }); };
  /* 无参数形式保留第一章旧接口；跨章节功能使用显式的 all 方法。 */
  course.getSections = function (includeAll) { return includeAll ? allSections() : (course.chapters[0].lessons || []); };
  course.getSection = function (id) { return allSections().find(function (section) { return section.id === id; }); };
  course.getUnits = function (chapterId) {
    if (chapterId) {
      const chapter = course.chapters.find(function (entry) { return entry.id === chapterId; });
      return chapter ? (chapter.lessons || []).flatMap(function (section) { return section.pages || [section]; }) : [];
    }
    return course.chapters[0].lessons ? course.chapters[0].lessons.flatMap(function (section) { return section.pages || [section]; }) : [];
  };
  course.getAllUnits = allUnits;
  course.getUnit = function (id) { return allUnits().find(function (unit) { return unit.id === id; }); };
}(window.Course));
