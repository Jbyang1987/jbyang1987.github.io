/* 页面行为：课程地图、完成按钮和章节目录。数学正文始终写在 HTML 里。 */
(function () {
  "use strict";
  const chapters = window.Course.chapters;
  const progress = window.CourseProgress;

  function showStorageNotice() {
    document.querySelectorAll("[data-storage-notice]").forEach(function (notice) {
      notice.textContent = progress.getStorageIssue();
      notice.hidden = !notice.textContent;
    });
  }

  function makeTextElement(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
  }

  function renderCourseMap() {
    const list = document.querySelector("[data-chapter-list]");
    if (!list) return;
    list.replaceChildren();
    chapters.forEach(function (chapter) {
      const completed = progress.isCompleted(chapter.id);
      const item = document.createElement("li");
      const row = document.createElement(chapter.path ? "a" : "div");
      row.className = "chapter-row" + (chapter.path ? " is-available" : " is-upcoming");
      if (chapter.path) row.href = chapter.path;
      row.append(makeTextElement("span", "chapter-number", chapter.number));
      const content = makeTextElement("div", "chapter-row-content", "");
      const title = makeTextElement("h3", "", chapter.title);
      content.append(title, makeTextElement("p", "", chapter.description));
      row.append(content);
      const status = completed ? "✓ 已完成" : chapter.path ? chapter.sections + " 节 · 开始学习" : "即将开放";
      row.append(makeTextElement("span", "chapter-status" + (completed ? " is-complete" : ""), status));
      const arrow = makeTextElement("span", "chapter-arrow", chapter.path ? "↗" : "—");
      arrow.setAttribute("aria-hidden", "true");
      row.append(arrow);
      item.append(row);
      list.append(item);
    });
  }

  function updateHome() {
    if (document.body.dataset.page !== "home") return;
    const summary = progress.getSummary(chapters);
    document.querySelector("[data-progress-percent]").textContent = summary.percent + "%";
    document.querySelector("[data-progress-count]").textContent = summary.completed + " / " + summary.total + " 章已完成";
    const meter = document.querySelector("[data-course-progress]");
    meter.value = summary.percent;
    meter.textContent = summary.percent + "%";
    const nextChapter = chapters.find(function (chapter) { return chapter.path && !progress.isCompleted(chapter.id); });
    const target = nextChapter || chapters.find(function (chapter) { return chapter.path; });
    if (target) {
      const title = "第 " + Number(target.number) + " 章 · " + target.title;
      document.querySelector("[data-continue-title]").textContent = title;
      document.querySelector("[data-continue-description]").textContent = nextChapter ? "从这里继续，循序探索本章的核心概念。" : "已完成所有开放章节。回到本章，复习定义、例题与概念之间的联系。";
      const link = document.querySelector("[data-continue-link]");
      link.href = target.path;
      link.setAttribute("aria-label", (nextChapter ? "继续学习 " : "复习 ") + title);
    }
    renderCourseMap();
  }

  function updateChapter() {
    const chapterId = document.body.dataset.chapter;
    if (!chapterId) return;
    const completed = progress.isCompleted(chapterId);
    const button = document.querySelector("[data-complete-button]");
    if (button) {
      button.disabled = false;
      button.textContent = completed ? "标记为未完成" : "标记为已完成";
      button.classList.toggle("button-secondary", completed);
    }
    document.querySelectorAll("[data-chapter-status]").forEach(function (label) {
      label.textContent = completed ? "✓ 本章已完成" : "学习中";
      label.classList.toggle("is-complete", completed);
    });
  }

  function refreshProgress() {
    updateHome();
    updateChapter();
    showStorageNotice();
  }

  const completeButton = document.querySelector("[data-complete-button]");
  if (completeButton) {
    completeButton.addEventListener("click", function () {
      const chapterId = document.body.dataset.chapter;
      const completed = !progress.isCompleted(chapterId);
      const saved = progress.setCompleted(chapterId, completed);
      refreshProgress();
      document.querySelector("[data-completion-message]").textContent = saved
        ? (completed ? "已保存本章完成状态。回到首页即可看到更新后的课程进度。" : "已恢复为未完成；可以继续复习本章。")
        : "状态已在本页更新，但未能保存到浏览器。";
    });
  }

  // 当前小节高亮不写入存储；以后如需“最近阅读位置”，集中扩展 progress.js。
  const lessons = Array.from(document.querySelectorAll(".lesson"));
  if (lessons.length) {
    let queued = false;
    function highlightCurrentSection() {
      let current = lessons[0];
      lessons.forEach(function (lesson) {
        if (lesson.getBoundingClientRect().top <= 180) current = lesson;
      });
      document.querySelectorAll("[data-section-link]").forEach(function (link) {
        if (link.getAttribute("href") === "#" + current.id) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
      queued = false;
    }
    window.addEventListener("scroll", function () {
      if (!queued) { queued = true; window.requestAnimationFrame(highlightCurrentSection); }
    }, { passive: true });
    highlightCurrentSection();
  }

  refreshProgress();
  // 回退缓存与同源的另一个标签页发生变化时，重新读取课程进度。
  window.addEventListener("pageshow", refreshProgress);
  window.addEventListener("storage", refreshProgress);
}());
