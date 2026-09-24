/* 课程地图、知识页进度、阅读位置与目录。正文和翻页链接均在静态 HTML 中。 */
(function () {
  "use strict";
  const course = window.Course, chapters = course.chapters, progress = window.CourseProgress;
  const root = document.body.dataset.root || "./";
  const url = path => root + path;
  function textElement(tag, className, text) {
    const element = document.createElement(tag); element.className = className; element.textContent = text; return element;
  }
  function showStorageNotice() {
    document.querySelectorAll("[data-storage-notice]").forEach(function (notice) { notice.textContent = progress.getStorageIssue(); notice.hidden = !notice.textContent; });
  }
  function renderCourseMap() {
    const list = document.querySelector("[data-chapter-list]"); if (!list) return;
    list.replaceChildren();
    chapters.forEach(function (chapter) {
      const completed = progress.isCompleted(chapter.id), item = document.createElement("li");
      const row = document.createElement(chapter.path ? "a" : "div");
      row.className = "chapter-row" + (chapter.path ? " is-available" : " is-upcoming");
      if (chapter.path) row.href = url(chapter.path);
      row.append(textElement("span", "chapter-number", chapter.number));
      const content = textElement("div", "chapter-row-content", "");
      content.append(textElement("h3", "", chapter.title), textElement("p", "", chapter.description)); row.append(content);
      const summary = chapter.path ? progress.getChapterSummary(chapter.id) : null;
      const status = completed ? "✓ 已完成" : summary ? "已学会 " + summary.completed + " / " + summary.total + " 项" : "即将开放";
      row.append(textElement("span", "chapter-status" + (completed ? " is-complete" : ""), status));
      const arrow = textElement("span", "chapter-arrow", chapter.path ? "↗" : "—"); arrow.setAttribute("aria-hidden", "true"); row.append(arrow);
      item.append(row); list.append(item);
    });
  }
  function updateHome() {
    if (document.body.dataset.page !== "home") return;
    const summary = progress.getSummary();
    document.querySelector("[data-progress-percent]").textContent = summary.percent + "%";
    document.querySelector("[data-progress-count]").textContent = "已学会 " + summary.completed + " / " + summary.total + " 项";
    const meter = document.querySelector("[data-course-progress]"); meter.value = summary.percent; meter.textContent = summary.percent + "%";
    const target = progress.getResumeUnit();
    if (target) {
      const label = (target.sectionNumber || target.number) + " · " + target.title;
      document.querySelector("[data-continue-title]").textContent = label;
      document.querySelector("[data-continue-description]").textContent = progress.getLastVisitedUnit() ? "回到上次阅读的位置；学会后可在页末标记。" : "从这里开始，逐页理解概念；学会后可在页末标记。";
      const link = document.querySelector("[data-continue-link]"); link.href = url(target.path); link.setAttribute("aria-label", "继续学习 " + label);
    }
    renderCourseMap();
  }
  function updateProgress() {
    const chapterId = document.body.dataset.chapter;
    if (chapterId) {
      const done = progress.isCompleted(chapterId), summary = progress.getChapterSummary(chapterId);
      document.querySelectorAll("[data-chapter-status]").forEach(function (label) {
        label.textContent = done ? "✓ 本章已完成" : "已学会 " + summary.completed + " / " + summary.total + " 项";
        label.classList.toggle("is-complete", done);
      });
      document.querySelectorAll("[data-complete-button]").forEach(function (button) {
        button.disabled = false; button.textContent = done ? "撤销整章的已学会标记" : "标记整章为已学会";
        button.classList.toggle("button-secondary", done); button.setAttribute("aria-pressed", String(done));
      });
    }
    document.querySelectorAll("[data-unit-complete]").forEach(function (button) {
      const done = progress.isUnitCompleted(button.dataset.unitComplete), label = button.dataset.unitLabel || "本页";
      button.disabled = false; button.textContent = done ? "撤销" + label + "的已学会标记" : "标记" + label + "为已学会";
      button.classList.toggle("button-secondary", done); button.setAttribute("aria-pressed", String(done));
    });
    document.querySelectorAll("[data-unit-status]").forEach(function (label) {
      const done = progress.isUnitCompleted(label.dataset.unitStatus); label.textContent = done ? "✓ 已学会" : "未标记"; label.classList.toggle("is-complete", done);
    });
    document.querySelectorAll("[data-section-progress]").forEach(function (label) {
      const summary = progress.getSectionSummary(label.dataset.sectionProgress); label.textContent = "已学会 " + summary.completed + " / " + summary.total + " 页";
    });
    document.querySelectorAll("[data-section-meter]").forEach(function (meter) {
      const summary = progress.getSectionSummary(meter.dataset.sectionMeter); meter.max = summary.total; meter.value = summary.completed; meter.textContent = summary.percent + "%";
    });
    document.querySelectorAll("[data-section-resume]").forEach(function (link) {
      const section = course.getSection(link.dataset.sectionResume); if (!section || !section.pages) return;
      const recent = progress.getLastVisitedUnit();
      const target = recent && recent.sectionId === section.id ? recent : section.pages.find(page => !progress.isUnitCompleted(page.id)) || section.pages[0];
      link.href = url(target.path); link.textContent = (recent && recent.sectionId === section.id ? "继续第 " : "从第 ") + target.number + (recent && recent.sectionId === section.id ? " 页 →" : " 页开始 →");
    });
  }
  function refreshProgress() { updateHome(); updateProgress(); showStorageNotice(); }
  document.querySelectorAll("[data-unit-complete]").forEach(function (button) {
    button.addEventListener("click", function () {
      const id = button.dataset.unitComplete, done = !progress.isUnitCompleted(id);
      const saved = progress.setUnitCompleted(id, done); refreshProgress();
      document.querySelectorAll("[data-unit-message]").forEach(function (message) {
        if (message.dataset.unitMessage === id) message.textContent = saved ? (done ? "已保存。可以继续下一页，也可以随时撤销标记。" : "已撤销标记，可以继续复习。") : "标记仅保留在当前页面，尚未保存到浏览器。";
      });
    });
  });
  document.querySelectorAll("[data-complete-button]").forEach(function (button) {
    button.addEventListener("click", function () {
      const id = document.body.dataset.chapter, done = !progress.isCompleted(id), saved = progress.setCompleted(id, done);
      refreshProgress(); const message = document.querySelector("[data-completion-message]");
      if (message) message.textContent = saved ? (done ? "已将本章所有知识页和小节标记为已学会。" : "已撤销本章所有知识页和小节的标记。") : "标记仅保留在当前页面，尚未保存到浏览器。";
    });
  });
  const menu = document.querySelector(".knowledge-menu");
  if (menu) {
    const narrow = window.matchMedia("(max-width: 1050px)");
    function adaptMenu() { menu.open = !narrow.matches; }
    adaptMenu(); narrow.addEventListener("change", adaptMenu);
  }
  const readingParts = Array.from(document.querySelectorAll("[data-reading-unit]"));
  const lessons = Array.from(document.querySelectorAll(".lesson[id]"));
  let queued = false, lastRecorded = "";
  function trackReading(force) {
    queued = false;
    if (document.visibilityState === "hidden") return;
    let id = document.body.dataset.unit;
    if (!id && readingParts.length) {
      let active;
      readingParts.forEach(function (part) { if (part.getBoundingClientRect().top <= 180) active = part; });
      if (!active && readingParts[0].getBoundingClientRect().top < innerHeight * .75) active = readingParts[0];
      id = active && active.dataset.readingUnit;
    }
    if (id && (force || id !== lastRecorded)) { progress.setVisited(id); lastRecorded = id; showStorageNotice(); }
    let current = lessons[0];
    lessons.forEach(function (lesson) { if (lesson.getBoundingClientRect().top <= 180) current = lesson; });
    document.querySelectorAll("[data-section-link]").forEach(function (link) {
      const match = current && (link.getAttribute("href") === "#" + current.id ||
        (current.closest("#vector-operations") && link.getAttribute("href") === "#vector-operations"));
      if (match) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current");
    });
  }
  window.addEventListener("scroll", function () { if (!queued) { queued = true; requestAnimationFrame(function () { trackReading(false); }); } }, { passive: true });
  window.addEventListener("load", function () { trackReading(true); });
  window.addEventListener("pageshow", function () { refreshProgress(); trackReading(true); });
  document.addEventListener("visibilitychange", function () { trackReading(true); });
  window.addEventListener("storage", refreshProgress);
  refreshProgress(); trackReading(true);
}());
