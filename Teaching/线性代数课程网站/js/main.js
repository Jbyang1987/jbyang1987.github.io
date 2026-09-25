/* 课程地图、知识页进度、阅读位置与目录。正文和翻页链接均在静态 HTML 中。 */
(function () {
  "use strict";
  const course = window.Course, chapters = course.chapters, progress = window.CourseProgress;
  const root = document.body.dataset.root || "./";
  const url = path => root + path;
  const chapterOrdinal = number => "第" + ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一"][Number(number)] + "章";
  function textElement(tag, className, text) {
    const element = document.createElement(tag); element.className = className; element.textContent = text; return element;
  }
  function celebrate(button, large = false) {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = button.getBoundingClientRect(), burst = document.createElement("span");
    burst.className = "confetti-burst" + (large ? " confetti-burst-large" : "");
    burst.setAttribute("aria-hidden", "true");
    burst.style.left = (rect.left + rect.width / 2) + "px";
    burst.style.top = (rect.top + rect.height / 2 + window.scrollY) + "px";
    const colors = ["#e76f51", "#e9b949", "#45a778", "#4b91c8", "#aa78c2", "#ef8a9b"];
    const waves = large ? 6 : 1, pieceCount = large ? 38 : 26;
    for (let wave = 0; wave < waves; wave += 1) {
      for (let index = 0; index < pieceCount; index += 1) {
        const piece = document.createElement("i"), angle = Math.PI * 2 * index / pieceCount + Math.random() * .25;
        const distance = large ? 100 + Math.random() * 210 : 55 + Math.random() * 95;
        piece.style.setProperty("--confetti-x", Math.cos(angle) * distance + "px");
        piece.style.setProperty("--confetti-y", Math.sin(angle) * distance - 28 + "px");
        piece.style.setProperty("--confetti-rotation", (Math.random() * 900 - 450) + "deg");
        piece.style.setProperty("--confetti-color", colors[index % colors.length]);
        piece.style.setProperty("--confetti-delay", (wave * 800 + Math.random() * 160) + "ms");
        burst.append(piece);
      }
    }
    document.body.append(burst);
    window.setTimeout(function () { burst.remove(); }, large ? 5300 : 1100);
  }
  function unitLabel(unit) {
    const number = unit.sectionNumber ? `${unit.sectionNumber}.${unit.number}` : unit.number;
    return number + " · " + unit.title;
  }
  function nextUnlearnedUnit(currentId) {
    const units = course.getUnits(), currentIndex = units.findIndex(function (unit) { return unit.id === currentId; });
    if (!units.length) return null;
    for (let offset = 1; offset <= units.length; offset++) {
      const unit = units[(Math.max(currentIndex, -1) + offset) % units.length];
      if (unit.id !== currentId && !progress.isUnitCompleted(unit.id)) return unit;
    }
    return null;
  }
  function showDifficultyReminder(unitId) {
    document.querySelectorAll(".difficulty-toast").forEach(function (notice) { notice.remove(); });
    const rows = new Set();
    const reminderToken = String(Date.now());
    document.querySelectorAll("[data-difficulty-unit]").forEach(function (button) {
      if (button.dataset.difficultyUnit === unitId) rows.add(button.closest(".unit-difficulty"));
    });
    rows.forEach(function (row) { if (row) { row.dataset.reminderToken = reminderToken; row.classList.add("is-reminder"); } });
    const notice = document.createElement("p");
    notice.className = "difficulty-toast";
    notice.textContent = "请先选择本页难度";
    notice.setAttribute("role", "status");
    document.body.append(notice);
    window.setTimeout(function () {
      notice.remove();
      rows.forEach(function (row) { if (row && row.dataset.reminderToken === reminderToken) row.classList.remove("is-reminder"); });
    }, 1800);
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
      const content = textElement("div", "chapter-row-content", "");
      const heading = textElement("div", "chapter-heading", "");
      heading.append(textElement("span", "chapter-number", chapterOrdinal(chapter.number)), textElement("h3", "", chapter.title));
      content.append(heading, textElement("p", "", chapter.description)); row.append(content);
      const summary = chapter.path ? progress.getChapterSummary(chapter.id) : null;
      const status = completed ? "✓ 已完成" : summary ? "掌握 " + summary.completed + " / " + summary.total : "即将开放";
      row.append(textElement("span", "chapter-status" + (completed ? " is-complete" : ""), status));
      item.append(row); list.append(item);
    });
  }
  function updateHome() {
    if (document.body.dataset.page !== "home") return;
    const summary = progress.getSummary();
    document.querySelector("[data-progress-percent]").textContent = summary.percent + "%";
    document.querySelector("[data-progress-count]").textContent = "掌握 " + summary.completed + " / " + summary.total;
    const meter = document.querySelector("[data-course-progress]"); meter.value = summary.percent; meter.textContent = summary.percent + "%";
    const lastVisited = progress.getLastVisitedUnit();
    const hasLearningRecord = Boolean(lastVisited) || summary.completed > 0;
    document.querySelector("[data-start-link]").hidden = hasLearningRecord;
    document.querySelector("[data-continue-link]").hidden = !hasLearningRecord;
    document.querySelector("[data-learning-progress]").hidden = !hasLearningRecord;
    document.querySelector(".hero-actions").classList.toggle("has-learning-record", hasLearningRecord);
    document.querySelector("[data-continue-action]").textContent = summary.percent === 0 ? "开始学习" : summary.percent === 100 ? "学习完成" : "继续学习";
    const target = progress.getResumeUnit();
    if (target) {
      const targetLabel = target.sectionNumber ? `${target.sectionNumber}.${target.number}` : target.number;
      const label = targetLabel + " · " + target.title;
      const link = document.querySelector("[data-continue-link]"); link.href = url(target.path); link.setAttribute("aria-label", "继续学习 " + label);
    }
    renderCourseMap();
  }
  function updateProgress() {
    const chapterId = document.body.dataset.chapter;
    if (chapterId) {
      const done = progress.isCompleted(chapterId), summary = progress.getChapterSummary(chapterId);
      document.querySelectorAll("[data-chapter-progress-percent]").forEach(function (label) { label.textContent = summary.percent + "%"; });
      document.querySelectorAll("[data-chapter-progress-count]").forEach(function (label) { label.textContent = "掌握 " + summary.completed + " / " + summary.total; });
      document.querySelectorAll("[data-chapter-progress]").forEach(function (meter) { meter.max = summary.total; meter.value = summary.completed; meter.textContent = summary.percent + "%"; });
      updateChapterResume();
      document.querySelectorAll("[data-chapter-status]").forEach(function (label) {
        label.textContent = done ? "✓ 本章已完成" : "掌握 " + summary.completed + " / " + summary.total;
        label.classList.toggle("is-complete", done);
      });
    }
    document.querySelectorAll("[data-unit-complete]").forEach(function (button) {
      const done = progress.isUnitCompleted(button.dataset.unitComplete), label = button.dataset.unitLabel || "本页";
      const hasDifficulty = Boolean(progress.getUnitDifficulty(button.dataset.unitComplete));
      button.disabled = false; button.textContent = done ? "撤销学会标记" : "标记为已学会";
      button.title = !done && !hasDifficulty ? "请先选择本页难度" : "";
      button.classList.toggle("button-secondary", done); button.setAttribute("aria-pressed", String(done));
    });
    document.querySelectorAll("[data-unit-difficulty]").forEach(function (button) {
  const selected = progress.getUnitDifficulty(button.dataset.difficultyUnit) === button.dataset.unitDifficulty;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    document.querySelectorAll("[data-unit-status]").forEach(function (label) {
      const done = progress.isUnitCompleted(label.dataset.unitStatus); label.textContent = done ? "✓ 已学会" : "未标记"; label.classList.toggle("is-complete", done);
    });
    document.querySelectorAll("[data-next-unlearned-link]").forEach(function (link) {
      const next = nextUnlearnedUnit(link.dataset.nextUnlearnedLink);
      link.hidden = !next;
      if (!next) { link.removeAttribute("href"); return; }
      link.href = url(next.path);
    });
    document.querySelectorAll("[data-section-progress]").forEach(function (label) {
      const summary = progress.getSectionSummary(label.dataset.sectionProgress); label.textContent = "掌握 " + summary.completed + " / " + summary.total;
    });
    document.querySelectorAll("[data-section-progress-count]").forEach(function (label) {
      const summary = progress.getSectionSummary(document.body.dataset.section); label.textContent = "掌握 " + summary.completed + " / " + summary.total;
    });
    document.querySelectorAll("[data-section-progress-percent]").forEach(function (label) {
      label.textContent = progress.getSectionSummary(document.body.dataset.section).percent + "%";
    });
    document.querySelectorAll("[data-section-meter]").forEach(function (meter) {
      const summary = progress.getSectionSummary(meter.dataset.sectionMeter); meter.max = summary.total; meter.value = summary.completed; meter.textContent = summary.percent + "%";
    });
    document.querySelectorAll("[data-section-resume]").forEach(function (link) {
      const section = course.getSection(link.dataset.sectionResume); if (!section || !section.pages) return;
      const recent = progress.getLastVisitedUnit();
      const target = recent && recent.sectionId === section.id ? recent : section.pages.find(page => !progress.isUnitCompleted(page.id)) || section.pages[0];
      const summary = progress.getSectionSummary(section.id);
      const action = summary.percent === 0 ? "开始学习" : summary.percent === 100 ? "学习完成" : "继续学习";
      const actionLabel = link.querySelector("[data-section-resume-action]");
      if (actionLabel) actionLabel.textContent = action;
      if (summary.percent === 100) {
        link.removeAttribute("href");
        link.setAttribute("aria-disabled", "true");
      } else {
        link.href = url(target.path);
        link.removeAttribute("aria-disabled");
      }
    });
  }
  function refreshProgress() { updateHome(); updateProgress(); showStorageNotice(); }
  function updateChapterResume() {
    if (document.body.dataset.page !== "chapter") return;
    const target = progress.getResumeUnit();
    const summary = progress.getChapterSummary(document.body.dataset.chapter);
    const action = summary.percent === 0 ? "开始学习" : summary.percent === 100 ? "学习完成" : "继续学习";
    document.querySelectorAll("[data-chapter-resume-action]").forEach(function (label) { label.textContent = action; });
    document.querySelectorAll("[data-chapter-resume]").forEach(function (link) {
      if (summary.percent === 100) {
        link.removeAttribute("href");
        link.setAttribute("aria-disabled", "true");
      } else if (target) {
        link.href = url(target.path);
        link.removeAttribute("aria-disabled");
      }
    });
  }
  document.querySelectorAll("[data-unit-complete]").forEach(function (button) {
    button.addEventListener("click", function () {
      const id = button.dataset.unitComplete, done = !progress.isUnitCompleted(id);
      if (done && !progress.getUnitDifficulty(id)) {
        showDifficultyReminder(id);
        return;
      }
      const saved = progress.setUnitCompleted(id, done); refreshProgress();
      if (saved && done) {
        const chapterFinished = Boolean(document.body.dataset.chapter)
          && progress.getChapterSummary(document.body.dataset.chapter).percent === 100;
        celebrate(button, chapterFinished);
        if (chapterFinished) {
          document.querySelectorAll("[data-unit-message]").forEach(function (message) {
            if (message.dataset.unitMessage === id) message.textContent = "本章学习完成，太棒了！";
          });
          return;
        }
        return;
      }
      document.querySelectorAll("[data-unit-message]").forEach(function (message) {
        if (message.dataset.unitMessage === id) message.textContent = saved ? "" : "标记仅保留在当前页面，尚未保存到浏览器。";
      });
    });
  });
  document.querySelectorAll("[data-unit-difficulty]").forEach(function (button) {
    button.addEventListener("click", function () {
    progress.setUnitDifficulty(button.dataset.difficultyUnit, button.dataset.unitDifficulty);
      refreshProgress();
    });
  });
  document.querySelectorAll("[data-print-page]").forEach(function (button) {
    button.addEventListener("click", function () { window.print(); });
  });
  document.querySelectorAll("[data-clear-records]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (!window.confirm("确定清除本浏览器保存的全部学习记录吗？此操作无法撤销。")) return;
      progress.clearRecords();
      refreshProgress();
    });
  });
  document.querySelectorAll("[data-backup-records]").forEach(function (button) {
    button.addEventListener("click", function () {
      const blob = new Blob([progress.exportRecords()], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url;
      link.download = "线性代数学习记录-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.append(link); link.click(); link.remove(); window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
  });
  const recordsFile = document.querySelector("[data-records-file]");
  document.querySelectorAll("[data-restore-records]").forEach(function (button) {
    button.addEventListener("click", function () { if (recordsFile) { recordsFile.value = ""; recordsFile.click(); } });
  });
  if (recordsFile) recordsFile.addEventListener("change", async function () {
    const file = recordsFile.files && recordsFile.files[0];
    if (!file) return;
    if (!window.confirm("恢复备份会替换当前浏览器中的学习记录，确定继续吗？")) return;
    let result;
    try { result = progress.importRecords(await file.text()); }
    catch (error) { result = { success: false, message: "读取备份失败，请检查文件后重试。" }; }
    refreshProgress();
    const notice = document.querySelector("[data-storage-notice]");
    if (notice) { notice.textContent = result.message; notice.hidden = false; }
  });
  const recordsDialog = document.querySelector("[data-records-dialog]");
  document.querySelectorAll("[data-view-records]").forEach(function (button) {
    button.addEventListener("click", function () {
      const summary = progress.getSummary();
      document.querySelector("[data-records-summary]").textContent = "总进度：掌握 " + summary.completed + " / " + summary.total + "（" + summary.percent + "%）";
      const lastVisited = progress.getLastVisitedUnit();
      const lastLabel = lastVisited ? (lastVisited.sectionNumber ? `${lastVisited.sectionNumber}.${lastVisited.number}` : lastVisited.number) + " · " + lastVisited.title : "尚无阅读记录";
      document.querySelector("[data-records-last-visited]").textContent = "上次阅读：" + lastLabel;
      const list = document.querySelector("[data-records-sections]");
      list.replaceChildren();
      course.getSections().forEach(function (section) {
        const sectionSummary = progress.getSectionSummary(section.id);
        list.append(textElement("li", "", section.number + " · " + section.title + "：掌握 " + sectionSummary.completed + " / " + sectionSummary.total));
      });
      recordsDialog.showModal();
    });
  });
  document.querySelectorAll("[data-close-records]").forEach(function (button) {
    button.addEventListener("click", function () { recordsDialog.close(); });
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
    if (id && (force || id !== lastRecorded)) { progress.setVisited(id); lastRecorded = id; showStorageNotice(); updateChapterResume(); }
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
