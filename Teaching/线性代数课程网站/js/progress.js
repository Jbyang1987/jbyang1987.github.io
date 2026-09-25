/* 学习记录唯一存储入口：阅读位置与“学会”标记分别记录，仅存本机。
   v2 按知识页（未拆分的部分按整节）计数；v1 整章完成状态迁移到各页，保留旧键。 */
window.CourseProgress = (function () {
  "use strict";
  const course = window.Course;
  const STORAGE_KEY = "linear-algebra.learning.v2";
  const LEGACY_KEY = "linear-algebra.learning.v1";
  let memoryState = emptyState();
  let storageIssue = "";
  let memoryOnly = false;
  function emptyState() { return { version: 2, chapters: {}, units: {}, lastVisited: null }; }
  function isObject(value) { return value && typeof value === "object" && !Array.isArray(value); }
  function cleanRecord(record) {
    return {
      completed: record.completed,
      completedAt: typeof record.completedAt === "string" ? record.completedAt : null,
      difficulty: ["hard", "okay", "easy"].includes(record.difficulty) ? record.difficulty : null
    };
  }
  function readState() {
    if (memoryOnly) return memoryState;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const legacy = saved === null ? localStorage.getItem(LEGACY_KEY) : null;
      if (saved === null && legacy === null) { storageIssue = ""; memoryState = emptyState(); return memoryState; }
      const parsed = JSON.parse(saved === null ? legacy : saved);
      if (!isObject(parsed) || !isObject(parsed.chapters) ||
          (saved === null ? parsed.version !== 1 : parsed.version !== 2 || !isObject(parsed.units))) throw new Error("不支持的学习记录格式");
      const state = emptyState();
      Object.keys(parsed.chapters).forEach(function (id) {
        const record = parsed.chapters[id];
        if (/^chapter\d+$/.test(id) && isObject(record) && typeof record.completed === "boolean") state.chapters[id] = cleanRecord(record);
      });
      if (saved === null) {
        course.chapters.forEach(function (chapter) {
          const record = state.chapters[chapter.id];
          if (record) course.getUnits(chapter.id).forEach(function (unit) { state.units[unit.id] = cleanRecord(record); });
        });
      } else {
        Object.keys(parsed.units).forEach(function (id) {
          const record = parsed.units[id];
          if (/^chapter\d+(?:-[a-z0-9]+)*$/.test(id) && isObject(record) && typeof record.completed === "boolean") state.units[id] = cleanRecord(record);
        });
        if (isObject(parsed.lastVisited) && course.getUnit(parsed.lastVisited.unitId)) {
          state.lastVisited = { unitId: parsed.lastVisited.unitId, visitedAt: typeof parsed.lastVisited.visitedAt === "string" ? parsed.lastVisited.visitedAt : null };
        }
      }
      storageIssue = "";
      memoryState = state;
      return state;
    } catch (error) {
      memoryOnly = true;
      storageIssue = "浏览器未能读取学习记录。本页仍可阅读；新的记录暂存于当前页面，请检查浏览器的存储设置。";
      return memoryState;
    }
  }
  function saveState(state) {
    memoryState = state;
    // 读取失败时不覆盖无法读取的原记录。
    if (memoryOnly) return false;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); storageIssue = ""; return true; }
    catch (error) { memoryOnly = true; storageIssue = "此次记录仅保留在当前页面，刷新后可能丢失。浏览器禁止了存储或存储空间已满，请检查设置。"; return false; }
  }
  function summaryFor(units, state) {
    const completed = units.filter(function (unit) { return state.units[unit.id] && state.units[unit.id].completed; }).length;
    return { completed: completed, total: units.length, percent: units.length ? Math.round(completed / units.length * 100) : 0 };
  }
  function isUnitCompleted(id) { const record = readState().units[id]; return Boolean(record && record.completed); }
  function getSectionSummary(id) { const section = course.getSection(id); return summaryFor(section ? section.pages || [section] : [], readState()); }
  function getChapterSummary(id) { return summaryFor(course.getUnits(id), readState()); }
  function isCompleted(id) {
    const state = readState(), units = course.getUnits(id);
    return units.length ? summaryFor(units, state).completed === units.length : Boolean(state.chapters[id] && state.chapters[id].completed);
  }
  function setRecords(units, completed) {
    const state = readState(), stamp = completed ? new Date().toISOString() : null;
    units.forEach(function (unit) {
      const previous = state.units[unit.id] || {};
      state.units[unit.id] = { completed: Boolean(completed), completedAt: stamp, difficulty: previous.difficulty || null };
    });
    course.chapters.forEach(function (chapter) {
      if (!units.some(function (unit) { return (unit.chapterId || unit.id) === chapter.id; })) return;
      const summary = summaryFor(course.getUnits(chapter.id), state);
      const done = summary.total > 0 && summary.completed === summary.total;
      state.chapters[chapter.id] = { completed: done, completedAt: done ? stamp : null };
    });
    return saveState(state);
  }
  function setUnitCompleted(id, completed) { const unit = course.getUnit(id); return unit ? setRecords([unit], completed) : false; }
  function getUnitDifficulty(id) {
    const record = readState().units[id];
    return record && ["hard", "okay", "easy"].includes(record.difficulty) ? record.difficulty : null;
  }
  function setUnitDifficulty(id, difficulty) {
    if (!course.getUnit(id) || !["hard", "okay", "easy"].includes(difficulty)) return false;
    const state = readState(), previous = state.units[id] || {};
    state.units[id] = {
      completed: Boolean(previous.completed),
      completedAt: typeof previous.completedAt === "string" ? previous.completedAt : null,
      difficulty: difficulty
    };
    return saveState(state);
  }
  function setCompleted(id, completed) {
    const chapter = course.chapters.find(function (entry) { return entry.id === id && entry.path; });
    return chapter ? setRecords(course.getUnits(id), completed) : false;
  }
  function setVisited(id) {
    if (!course.getUnit(id)) return false;
    const state = readState();
    if (state.lastVisited && state.lastVisited.unitId === id) return !memoryOnly;
    state.lastVisited = { unitId: id, visitedAt: new Date().toISOString() };
    return saveState(state);
  }
  function getResumeUnit() {
    const state = readState();
    return (state.lastVisited && course.getUnit(state.lastVisited.unitId)) || course.getUnits().find(function (unit) { return !state.units[unit.id] || !state.units[unit.id].completed; }) || course.getUnits()[0];
  }
  function getLastVisitedUnit() {
    const recent = readState().lastVisited;
    return recent ? course.getUnit(recent.unitId) : undefined;
  }
  function clearRecords() {
    memoryState = emptyState();
    if (memoryOnly) return false;
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_KEY);
      storageIssue = "";
      return true;
    } catch (error) {
      memoryOnly = true;
      storageIssue = "无法清除浏览器中已保存的学习记录。";
      return false;
    }
  }
  function exportRecords() {
    return JSON.stringify({
      format: "linear-algebra-learning-records",
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      records: readState()
    }, null, 2);
  }
  function importRecords(text) {
    if (memoryOnly) return { success: false, message: "浏览器存储不可用，无法恢复记录。" };
    let backup;
    try { backup = JSON.parse(text); }
    catch (error) { return { success: false, message: "文件不是有效的 JSON 备份。" }; }
    if (!isObject(backup) || backup.format !== "linear-algebra-learning-records" || backup.formatVersion !== 1 ||
        !isObject(backup.records) || backup.records.version !== 2 || !isObject(backup.records.chapters) || !isObject(backup.records.units)) {
      return { success: false, message: "备份格式不正确或版本不受支持。" };
    }
    const state = emptyState(), chapterIds = new Set(course.chapters.map(function (chapter) { return chapter.id; }));
    const units = new Set(course.getUnits().map(function (unit) { return unit.id; }));
    for (const id of Object.keys(backup.records.units)) {
      const record = backup.records.units[id];
      if (!isObject(record) || typeof record.completed !== "boolean") return { success: false, message: "备份中的学习标记内容有误，未恢复任何记录。" };
      if (units.has(id)) state.units[id] = cleanRecord(record);
    }
    for (const id of Object.keys(backup.records.chapters)) {
      const record = backup.records.chapters[id];
      if (!isObject(record) || typeof record.completed !== "boolean") return { success: false, message: "备份中的章节记录内容有误，未恢复任何记录。" };
      if (chapterIds.has(id)) state.chapters[id] = cleanRecord(record);
    }
    const lastVisited = backup.records.lastVisited;
    if (isObject(lastVisited) && units.has(lastVisited.unitId)) {
      state.lastVisited = { unitId: lastVisited.unitId, visitedAt: typeof lastVisited.visitedAt === "string" ? lastVisited.visitedAt : null };
    }
    const saved = saveState(state);
    return saved ? { success: true, message: "学习记录已恢复。" } : { success: false, message: storageIssue || "学习记录未能保存到浏览器。" };
  }
  function getSummary() {
    const state = readState(), summary = summaryFor(course.getUnits(), state);
    const available = course.chapters.filter(function (chapter) { return chapter.path; });
    summary.chaptersCompleted = available.filter(function (chapter) {
      const units = course.getUnits(chapter.id); return units.length && summaryFor(units, state).completed === units.length;
    }).length;
    summary.chaptersTotal = available.length;
    return summary;
  }
  return { isCompleted: isCompleted, setCompleted: setCompleted, isUnitCompleted: isUnitCompleted, setUnitCompleted: setUnitCompleted, getUnitDifficulty: getUnitDifficulty, setUnitDifficulty: setUnitDifficulty,
    getSectionSummary: getSectionSummary, getChapterSummary: getChapterSummary, setVisited: setVisited, getResumeUnit: getResumeUnit, getLastVisitedUnit: getLastVisitedUnit,
    getSummary: getSummary, clearRecords: clearRecords, exportRecords: exportRecords, importRecords: importRecords,
    getStorageIssue: function () { return storageIssue; } };
}());
