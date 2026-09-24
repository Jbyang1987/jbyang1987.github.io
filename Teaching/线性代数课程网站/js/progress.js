/* 所有 localStorage 读写都集中在此文件。页面通过 CourseProgress 使用它。
   目前只保存章节完成状态，不记录浏览行为，不上传任何数据。
   结构示例：{ version: 1, chapters: { chapter01: { completed: true, completedAt: "..." } } }
   以后增加错题、收藏、笔记、学习位置、复习计划或导入导出时，
   在这里增加独立字段与函数，并为旧记录编写版本迁移；不要分散存储代码。 */
window.CourseProgress = (function () {
  "use strict";
  const STORAGE_KEY = "linear-algebra.learning.v1";
  let memoryState = emptyState();
  let storageIssue = "";
  let memoryOnly = false;

  function emptyState() {
    return { version: 1, chapters: {} };
  }

  function readState() {
    if (memoryOnly) return memoryState;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) { storageIssue = ""; return emptyState(); }
      const parsed = JSON.parse(saved);
      if (!parsed || parsed.version !== 1 || !parsed.chapters || typeof parsed.chapters !== "object" || Array.isArray(parsed.chapters)) {
        throw new Error("不支持的学习记录格式");
      }
      // 只接受有效的章节编号和明确的布尔值，避免损坏记录影响页面。
      const cleanState = emptyState();
      Object.keys(parsed.chapters).forEach(function (id) {
        const record = parsed.chapters[id];
        if (/^chapter\d+$/.test(id) && record && typeof record.completed === "boolean") {
          cleanState.chapters[id] = {
            completed: record.completed,
            completedAt: typeof record.completedAt === "string" ? record.completedAt : null
          };
        }
      });
      storageIssue = "";
      memoryState = cleanState;
      return cleanState;
    } catch (error) {
      storageIssue = "浏览器未能读取学习记录。本页仍可阅读；如无法保存，请检查浏览器的存储设置。";
      return memoryState;
    }
  }

  function isCompleted(chapterId) {
    const record = readState().chapters[chapterId];
    return Boolean(record && record.completed);
  }

  function setCompleted(chapterId, completed) {
    if (!/^chapter\d+$/.test(chapterId)) return false;
    const state = readState();
    state.chapters[chapterId] = {
      completed: Boolean(completed),
      completedAt: completed ? new Date().toISOString() : null
    };
    memoryState = state;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      memoryOnly = false;
      storageIssue = "";
      return true;
    } catch (error) {
      memoryOnly = true;
      storageIssue = "此次状态仅保留在当前页面，刷新后可能丢失。浏览器禁止了存储或存储空间已满，请检查设置。";
      return false;
    }
  }

  function getSummary(chapters) {
    const state = readState();
    const available = chapters.filter(function (chapter) { return Boolean(chapter.path); });
    const completed = available.filter(function (chapter) {
      return state.chapters[chapter.id] && state.chapters[chapter.id].completed;
    }).length;
    return { completed: completed, total: available.length, percent: available.length ? Math.round(completed / available.length * 100) : 0 };
  }

  function getStorageIssue() { return storageIssue; }

  return { isCompleted: isCompleted, setCompleted: setCompleted, getSummary: getSummary, getStorageIssue: getStorageIssue };
}());
