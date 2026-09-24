/* 课程目录。顺序对应「讲稿/tex/线性代数 智慧课程.tex」的 include 列表。
   章节中文名对应 sections 中各文件的 section 标题；* 表示讲稿中的选学内容。
   增加章节时，在这里登记；未开放章节的 path 保持 null。
   id 是学习记录的永久编号。发布后不要随意更改已有 id。 */
window.Course = {
  chapters: [
    { id: "chapter01", number: "01", title: "向量", description: "从空间向量与线性运算，到坐标变换、数域与高维数组。", path: "chapters/chapter01.html", sections: 5 },
    { id: "chapter02", number: "02", title: "线性方程组", description: "方程组的基本问题、高斯消元法及其矩阵表示。", path: null },
    { id: "chapter03", number: "03", title: "矩阵(一)", description: "矩阵运算、乘法与应用、逆矩阵、转置及分块矩阵。", path: null },
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
    { id: "chapter01-section01", number: "1.1", title: "向量及其运算", path: base + "index.html", readingPath: base + "all.html", anchor: "vector-operations",
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
    { id: "chapter01-section02", number: "1.2", title: "向量线性相关性", path: "chapters/chapter01.html#vector-dependence", anchor: "vector-dependence" },
    { id: "chapter01-section03", number: "1.3", title: "坐标系、坐标与坐标变换", path: "chapters/chapter01.html#coordinates", anchor: "coordinates" },
    { id: "chapter01-section04", number: "1.4", title: "复数与数域", path: "chapters/chapter01.html#complex-and-fields", anchor: "complex-and-fields" },
    { id: "chapter01-section05", number: "1.5", title: "数组向量", path: "chapters/chapter01.html#array-vectors", anchor: "array-vectors" }
  ];
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
  course.getSections = function () { return course.chapters.flatMap(function (chapter) { return chapter.lessons || []; }); };
  course.getSection = function (id) { return course.getSections().find(function (section) { return section.id === id; }); };
  course.getUnits = function (chapterId) {
    return course.chapters.filter(function (chapter) { return chapter.path && (!chapterId || chapter.id === chapterId); }).flatMap(function (chapter) {
      return chapter.lessons ? chapter.lessons.flatMap(function (section) { return section.pages || [section]; }) : [chapter];
    });
  };
  course.getUnit = function (id) { return course.getUnits().find(function (unit) { return unit.id === id; }); };
}(window.Course));
