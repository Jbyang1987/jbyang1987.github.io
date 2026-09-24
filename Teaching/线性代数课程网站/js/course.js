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
