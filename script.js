let modules = [];
let checkpoints = [];

const STREAK_CURRENT = "streak_current";
const STREAK_BEST = "streak_best";
const STREAK_LAST_DATE = "streak_last_date";

const platformLogo = {
  LC: "leetcode.png",
  GFG: "gfg.png",
  CC: "codechef.png",
  CF: "codeforces.png",
};

const BACKUP_KEYS = [
  "prob_",
  "practice_",
  "checkpoint_",
  "pattern_note_",
  "problem_note_",
  "streak_",
];
const APP_VERSION = "1.0.1";
let pendingBackup = null;
fetch(`roadmap.json?v=${APP_VERSION}`)
  .then((r) => r.json())
  .then((d) => {
    modules = d.modules;
    checkpoints = d.checkpoints || [];

    renderSidebar();
    updateDashboard();
  });

const kPatternNote = (id) => "pattern_note_" + id,
  kProblemNote = (id) => "problem_note_" + id,
  kP = (m, p, id) => `prob_${m}_${p}_${id}`,
  kPr = (m, id) => `practice_${m}_${id}`,
  kCP = (cp, id) => `checkpoint_${cp}_${id}`;

const quill = new Quill("#noteEditor", {
  theme: "snow",
  placeholder: "Write algorithm, intuition, edge cases, complexity...",
  modules: {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      [{ font: [] }],
      [{ size: ["small", false, "large", "huge"] }],
      ["bold", "italic", "underline", "strike"],
      [{ color: [] }, { background: [] }],
      [{ script: "sub" }, { script: "super" }],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ indent: "-1" }, { indent: "+1" }],
      [{ align: [] }],
      ["blockquote", "code-block"],
      ["link"],
      ["clean"],
    ],
  },
});


quill.clipboard.addMatcher(Node.ELEMENT_NODE, (node, delta) => {
  delta.ops = delta.ops.map((op) => {
    if (!op.attributes) return op;

    delete op.attributes.font;
    delete op.attributes.size;
    delete op.attributes.color;

    if ("background" in op.attributes) {
      op.attributes.background = "#302b3d";
    }

    return op;
  });

  return delta;
});


const toolbar = quill.getModule("toolbar").container;
// Start in read mode
quill.enable(false);
toolbar.style.display = "none";

function percent(m) {
  let t = 0,
    d = 0;
  m.patterns.forEach((p) =>
    p.problems.forEach((x) => {
      t++;
      if (localStorage.getItem(kP(m.id, p.id, x.id)) === "true") d++;
    }),
  );
  m.practice.forEach((x) => {
    t++;
    if (localStorage.getItem(kPr(m.id, x.id)) === "true") d++;
  });
  return t ? Math.round((d * 100) / t) : 0;
}

function isBackupKey(key) {
  return BACKUP_KEYS.some((prefix) => key.startsWith(prefix));
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "";
  toast.classList.add(type);
  toast.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function updateStreak() {
  const today = getLocalDateKey();

  let current = parseInt(localStorage.getItem(STREAK_CURRENT) || "0", 10);

  let best = parseInt(localStorage.getItem(STREAK_BEST) || "0", 10);

  const lastDate = localStorage.getItem(STREAK_LAST_DATE);

  // Already counted today
  if (lastDate === today) {
    return;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const yesterdayKey = getLocalDateKey(yesterday);

  if (lastDate === yesterdayKey) {
    current++;
  } else {
    current = 1;
  }

  best = Math.max(best, current);

  localStorage.setItem(STREAK_CURRENT, current);
  localStorage.setItem(STREAK_BEST, best);
  localStorage.setItem(STREAK_LAST_DATE, today);
}

function refreshStreakStatus() {
  const lastDate = localStorage.getItem(STREAK_LAST_DATE);

  if (!lastDate) {
    return;
  }

  const today = getLocalDateKey();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const yesterdayKey = getLocalDateKey(yesterday);

  if (lastDate !== today && lastDate !== yesterdayKey) {
    localStorage.setItem(STREAK_CURRENT, "0");
  }
}

// ============================
// DASHBOARD
// ============================

function updateDashboard() {
  refreshStreakStatus();

  let totalProblems = 0;
  let solvedProblems = 0;
  let completedModules = 0;
  let completedCheckpoints = 0;

  let easyTotal = 0;
  let mediumTotal = 0;
  let hardTotal = 0;

  let easySolved = 0;
  let mediumSolved = 0;
  let hardSolved = 0;

  modules.forEach((m) => {
    let moduleTotal = 0;
    let moduleSolved = 0;

    m.patterns.forEach((p) => {
      p.problems.forEach((x) => {
        const solved = localStorage.getItem(kP(m.id, p.id, x.id)) === "true";

        switch (x.difficulty) {
          case "Easy":
            easyTotal++;
            if (solved) easySolved++;
            break;
          case "Medium":
            mediumTotal++;
            if (solved) mediumSolved++;
            break;
          case "Hard":
            hardTotal++;
            if (solved) hardSolved++;
            break;
        }

        totalProblems++;
        moduleTotal++;

        if (solved) {
          solvedProblems++;
          moduleSolved++;
        }
      });
    });

    m.practice.forEach((x) => {
      const solved = localStorage.getItem(kPr(m.id, x.id)) === "true";

      switch (x.difficulty) {
        case "Easy":
          easyTotal++;
          if (solved) easySolved++;
          break;
        case "Medium":
          mediumTotal++;
          if (solved) mediumSolved++;
          break;
        case "Hard":
          hardTotal++;
          if (solved) hardSolved++;
          break;
      }

      totalProblems++;
      moduleTotal++;

      if (solved) {
        solvedProblems++;
        moduleSolved++;
      }
    });

    if (moduleSolved === moduleTotal && moduleTotal > 0) completedModules++;
  });

  // ----------------------------
  // Checkpoints
  // ----------------------------

  checkpoints.forEach((cp) => {
    cp.practice.forEach((x) => {
      const solved = localStorage.getItem(kCP(cp.id, x.id)) === "true";

      switch (x.difficulty) {
        case "Easy":
          easyTotal++;
          if (solved) easySolved++;
          break;
        case "Medium":
          mediumTotal++;
          if (solved) mediumSolved++;
          break;
        case "Hard":
          hardTotal++;
          if (solved) hardSolved++;
          break;
      }
      totalProblems++;
      if (solved) {
        solvedProblems++;
      }
    });
  });

  checkpoints.forEach((cp) => {
    let solved = 0;
    const total = cp.practice.length;
    cp.practice.forEach((x) => {
      if (localStorage.getItem(kCP(cp.id, x.id)) === "true") {
        solved++;
      }
    });
    if (solved === total && total > 0) {
      completedCheckpoints++;
    }
  });

  const percent =
    totalProblems === 0
      ? 0
      : Math.round((solvedProblems / totalProblems) * 100);

  document.getElementById("overallProgressBar").style.width = percent + "%";
  document.getElementById("overallProgressText").innerText = percent + "%";
  document.getElementById("overallSolvedText").innerText =
    solvedProblems + " / " + totalProblems + " Problems";
  document.getElementById("moduleCompletedText").innerHTML = `
  <div class="completion-row">
    <span>📦 Modules</span>
    <span>${completedModules} / ${modules.length}</span>
  </div>

  <div class="completion-row">
      <span>🏁 Checkpoints</span>
      <span>${completedCheckpoints} / ${checkpoints.length}</span>
  </div>
                                                            `;
  document.getElementById("easyCount").innerText =
    `${easySolved} / ${easyTotal}`;
  document.getElementById("mediumCount").innerText =
    `${mediumSolved} / ${mediumTotal}`;
  document.getElementById("hardCount").innerText =
    `${hardSolved} / ${hardTotal}`;

  const current = localStorage.getItem(STREAK_CURRENT) || "0";
  const best = localStorage.getItem(STREAK_BEST) || "0";
  document.getElementById("currentStreak").innerText = `${current} Days`;
  document.getElementById("bestStreak").innerText = `${best} Days`;
}

function renderSidebar() {
  const l = document.getElementById("moduleList");
  l.innerHTML = "";

  modules.forEach((m) => {
    // ---------- Module ----------
    const b = document.createElement("button");
    b.className = "moduleButton";
    if (percent(m) === 100) {
      b.classList.add("moduleCompleted");
    }
    const icon = percent(m) === 100 ? "✅" : "📦";
    b.innerHTML = `${icon} ${m.name}
      <span class='percent'>
      ${percent(m)}%
      </span>`;
    b.onclick = () => show(m);
    l.appendChild(b);

    // ---------- Checkpoints after this module ----------
    checkpoints
      .filter((cp) => cp.afterModule === m.id)
      .forEach((cp) => {
        const cpBtn = document.createElement("button");
        cpBtn.className = "moduleButton checkpointButton";
        if (checkpointPercent(cp) === 100) {
          cpBtn.classList.add("checkpointCompleted");
        }
        const cpIcon = checkpointPercent(cp) === 100 ? "🏆" : "🏁";
        cpBtn.innerHTML = `${cpIcon} ${cp.name}
          <span class="percent">
              ${checkpointPercent(cp)}%
          </span>`;
        cpBtn.onclick = () => showCheckpoint(cp);
        l.appendChild(cpBtn);
      });
  });
}

function show(m) {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
  document.getElementById("homePage").style.display = "none";
  document.getElementById("modulePage").style.display = "block";

  let c = document.getElementById("modulePage");
  let h = `<h2>${m.name}</h2><h3>Patterns</h3>`;
  m.patterns.forEach((p) => {
    h += `
          <div class="pattern">

            <div class="pattern-header">

              <div class="pattern-left"
                  onclick="togglePattern('${p.id}')">

                  <span id="arrow_${p.id}" class="arrow">▼</span>

                  <h4 class="pattern-title">
                      ${p.id}: ${p.title}
                      <span id="count_${p.id}" class="pattern-count">
                        (${patternProgress(m, p)})
                      </span>
                  </h4>

              </div>

              <div class="pattern-actions">

                <button class="learnPatternBtn"
                  type="button"
                  onclick="event.stopPropagation(); openPatternGuide('${p.id}')">
                  📖 Learn Pattern
                </button>

                <button class="noteBtn"
                  type="button"
                  onclick="event.stopPropagation();
                            openNote(
                            '${kPatternNote(p.id)}',
                            ${JSON.stringify(p.title).replace(/"/g, "&quot;")}
                            )">
                  📝 Notes
                </button>

              </div>

            </div>

<div
    class="pattern-body"
    id="body_${p.id}">
          `;
    p.problems.forEach((x) => {
      h += `
<div class="problem-row">

<input id="c_${m.id}_${p.id}_${x.id}" type="checkbox">

<div class="problem-content">

<div class="problem-top">

<div class="problem-name">

<span class="problem-id">
${x.id}:
</span>

<span class="problem-title">
${x.name}
</span>

</div>

<span class="tag ${x.difficulty.toLowerCase()}">
${x.difficulty}
</span>

</div>

<div class="problem-bottom">

<span
class="problem-note"
title="Problem Notes"
onclick="openNote(
'${kProblemNote(x.id)}',
'${x.name}'
)">
📝
</span>

<img
class="platform-logo"
src="logos/${platformLogo[x.platform]}"
title="${x.platform}">

<a
href="${x.url}"
target="_blank"
class="open-link">
🔗
</a>

</div>

</div>

</div>
  `;
    });
    h += `
    </div>
</div>
`;
  });
  h += `<div class='practice'><h3>Practice Problems</h3>`;
  m.practice.forEach((x) => {
    h += `
<div class="problem-row">

<input id="p_${m.id}_${x.id}" type="checkbox">

<div class="problem-content">

<div class="problem-top">

<div class="problem-name">

<span class="problem-id">
${x.id}:
</span>

<span class="problem-title">
${x.name}
</span>

</div>

<span class="tag ${x.difficulty.toLowerCase()}">
${x.difficulty}
</span>

</div>

<div class="problem-bottom">

<span
class="problem-note"
title="Problem Notes"
onclick="openNote(
'${kProblemNote(x.id)}',
'${x.name}'
)">
📝
</span>

<img
class="platform-logo"
src="logos/${platformLogo[x.platform]}"
title="${x.platform}">

<a
href="${x.url}"
target="_blank"
class="open-link">
🔗
</a>

</div>

</div>

</div>
  `;
  });

  h += `
    </div>
</div>
`;
  c.innerHTML = h;
  m.patterns.forEach((p) => {
    p.problems.forEach((x) => {
      let cb = document.getElementById(`c_${m.id}_${p.id}_${x.id}`);
      cb.checked = localStorage.getItem(kP(m.id, p.id, x.id)) === "true";
      cb.onchange = () => {
        localStorage.setItem(kP(m.id, p.id, x.id), cb.checked);
        updatePatternCount(m, p);

        if (cb.checked) {
          updateStreak();
        }

        markDataModified();
        renderSidebar();
        updateDashboard();
      };
    });
    const body = document.getElementById("body_" + p.id);
    const arrow = document.getElementById("arrow_" + p.id);

    body.classList.remove("show");
    arrow.innerText = "▶";
  });
  m.practice.forEach((x) => {
    let cb = document.getElementById(`p_${m.id}_${x.id}`);
    cb.checked = localStorage.getItem(kPr(m.id, x.id)) === "true";
    cb.onchange = () => {
      localStorage.setItem(kPr(m.id, x.id), cb.checked);

      if (cb.checked) {
        updateStreak();
      }

      markDataModified();
      renderSidebar();
      updateDashboard();
    };
  });
}

function showCheckpoint(cp) {
  document.getElementById("homePage").style.display = "none";
  document.getElementById("modulePage").style.display = "block";
  const c = document.getElementById("modulePage");
  let h = `
          <h2 class="checkpoint-title">
              🏁 ${cp.name}
          </h2>

          <p class="checkpoint-subtitle">
              ${cp.subtitle}
          </p>
          <p style="color:#7dd3fc; font-weight:bold;">
            Test yourself before moving ahead.
          </p>

          <div class="practice">
              <h3>Practice Problems</h3>
          `;

  cp.practice.forEach((x) => {
    h += `
<div class="problem-row">

<input id="cp_${cp.id}_${x.id}" type="checkbox">

<div class="problem-content">

<div class="problem-top">

<div class="problem-name">

<span class="problem-id">
${x.id}:
</span>

<span class="problem-title">
${x.name}
</span>

</div>

<span class="tag ${x.difficulty.toLowerCase()}">
${x.difficulty}
</span>

</div>

<div class="problem-bottom">

<span
class="problem-note"
title="Problem Notes"
onclick="openNote(
'${kProblemNote(x.id)}',
${JSON.stringify(x.name).replace(/"/g, "&quot;")}
)">
📝
</span>

<img
class="platform-logo"
src="logos/${platformLogo[x.platform]}"
title="${x.platform}">

<a
href="${x.url}"
target="_blank"
class="open-link">
🔗
</a>

</div>

</div>

</div>
        `;
  });

  h += `
            </div>

        </div>
    `;
  c.innerHTML = h;
  cp.practice.forEach((x) => {
    const cb = document.getElementById(`cp_${cp.id}_${x.id}`);
    cb.checked = localStorage.getItem(kCP(cp.id, x.id)) === "true";

    cb.onchange = () => {
      localStorage.setItem(kCP(cp.id, x.id), cb.checked);
      if (cb.checked) {
        updateStreak();
      }
      markDataModified();
      renderSidebar();
      updateDashboard();
    };
  });
}

function checkpointPercent(cp) {
  let solved = 0;
  const total = cp.practice.length;

  cp.practice.forEach((x) => {
    if (localStorage.getItem(kCP(cp.id, x.id)) === "true") solved++;
  });

  return total ? Math.round((solved * 100) / total) : 0;
}

// ===========================
// NOTES
// ===========================

// =========================
// PATTERN GUIDE
// =========================

// let patternGuideQuill = null;

// function initPatternGuideQuill() {
//   if (patternGuideQuill) return;

//   patternGuideQuill = new Quill("#patternGuideEditor", {
//     theme: "snow",
//     readOnly: true,
//     modules: {
//       toolbar: false,
//     },
//   });
// }

function findPatternById(patternId) {
  for (const module of modules) {
    const pattern = module.patterns?.find((p) => p.id === patternId);

    if (pattern) {
      return pattern;
    }
  }

  return null;
}

function openPatternGuide(patternId) {
  const pattern = findPatternById(patternId);

  if (!pattern) {
    showToast("Pattern not found.", "error");
    return;
  }

  if (
    !pattern.learning ||
    pattern.learning.format !== "html" ||
    !pattern.learning.html
  ) {
    showToast("Learning guide will be added soon...", "info");
    return;
  }

  const editor = document.getElementById("patternGuideEditor");

  // Create the Shadow DOM once.
  if (!editor.shadowRoot) {
    editor.attachShadow({ mode: "open" });
  }

  const shadow = editor.shadowRoot;

  shadow.innerHTML = "";

  // Pattern-specific CSS
  const style = document.createElement("style");
  style.textContent = pattern.learning.css || "";

const globalStyle = document.createElement("style");
globalStyle.textContent = `
  /* ===== Pattern Learning — Graphite + Indigo Theme ===== */

  .guide-content{background:#202329;color:#e8ebf2}
  .guide-content h1,.guide-content h2,.guide-content h3{color:#f4f6fa}
  .guide-content p{color:#cdd2dc}

  .guide-hero{background:linear-gradient(135deg,#2b3039,#363d4b);border-color:#454c59}
  .guide-eyebrow{color:#9eafff}
  .guide-lead{color:#d7dbe4}

  .guide-section h2{color:#f4f6fa}
  .guide-section h3{color:#e8ebf2}

  .guide-callout{background:linear-gradient(135deg,#292e36,#343a45);border-left-color:#788cf0;color:#dfe3eb}

  .state-card{background:linear-gradient(135deg,#272c34,#313640);border-color:#414752}
  .state-card p{color:#c8ced8}
  .state-icon{background:#39404b;color:#b9c5ff}

  .guide-list{color:#cdd2dc}
  .clue{background:linear-gradient(135deg,#272c34,#303640);border-color:#414752;color:#d5dae3}

  .code-card{background:#191c21;border-color:#3d434d}
  .code-header{background:linear-gradient(135deg,#2b3039,#343a45);border-bottom-color:#424853;color:#e8ebf2}

  .language-switcher{background:#22262c;border-bottom-color:#393f48}
  .language-tab{background:#30353d;border-color:#424852;color:#cbd0d9}
  .language-tab.active{background:#6577d9;color:#fff}

  .language-code pre{background:#16191d;color:#dfe3e9}
  .language-code code{color:inherit}

  .complexity-grid{color:#cdd2dc}
  .trigger-section .guide-callout{color:#e5e8ee}
`;

  // Pattern-specific HTML
  const content = document.createElement("div");
  content.className = "pattern-guide-content";
  content.innerHTML = pattern.learning.html;

  shadow.appendChild(style);
  shadow.appendChild(globalStyle);
  shadow.appendChild(content);

  content.querySelectorAll(".language-switcher").forEach((switcher) => {
  const group = switcher.dataset.codeGroup;

  switcher.querySelectorAll(".language-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const language = tab.dataset.language;

        switcher.querySelectorAll(".language-tab").forEach((btn) => {
          btn.classList.toggle("active", btn === tab);
        });

        content
          .querySelectorAll(`.language-code[data-code-group="${group}"]`)
          .forEach((block) => {
            block.classList.toggle(
              "active",
              block.dataset.language === language
            );
          });
      });
    });
  });

  document.getElementById("patternGuideTitle").textContent =
    `${pattern.id} · ${pattern.title}`;

  document.getElementById("patternGuideModal").classList.add("show");
}

// function openPatternGuide(patternId) {
//   const pattern = findPatternById(patternId);

//   if (!pattern) {
//     showToast("Pattern not found.", "error");
//     return;
//   }

//   if (
//     !pattern.learning ||
//     pattern.learning.format !== "quill" ||
//     !pattern.learning.content
//   ) {
//     showToast("Learning guide is not available for this pattern.", "error");
//     return;
//   }

//   initPatternGuideQuill();

//   document.getElementById("patternGuideTitle").textContent =
//     `${pattern.id} · ${pattern.title}`;

//   try {
//     patternGuideQuill.setContents(pattern.learning.content);
//   } catch (error) {
//     console.error("Failed to load Pattern Guide:", error);
//     showToast("Could not load the learning guide.", "error");
//     return;
//   }

//   document.getElementById("patternGuideModal").classList.add("show");
// }

function closePatternGuide() {
  document.getElementById("patternGuideModal").classList.remove("show");
}

window.openPatternGuide = openPatternGuide;
window.closePatternGuide = closePatternGuide;

let originalDelta = null;
let isEditing = false;
let currentNoteKey = "";

function openNote(storageKey, title) {
  currentNoteKey = storageKey;
  document.getElementById("noteTitle").innerText = title;
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    quill.setContents(JSON.parse(saved));
  } else {
    quill.setText("");
  }
  originalDelta = quill.getContents();
  isEditing = false;
  quill.enable(false);
  toolbar.style.display = "none";
  document.getElementById("editNoteBtn").style.display = "inline-block";
  document.getElementById("saveNoteBtn").style.display = "none";
  document.getElementById("noteModal").classList.add("show");
}

window.openNote = openNote;

function closeNote() {
  document.getElementById("noteModal").classList.remove("show");
}

function hasUnsavedChanges() {
  return JSON.stringify(originalDelta) !== JSON.stringify(quill.getContents());
}

function patternProgress(module, pattern) {
  let solved = 0;
  const total = pattern.problems.length;

  pattern.problems.forEach((problem) => {
    if (
      localStorage.getItem(kP(module.id, pattern.id, problem.id)) === "true"
    ) {
      solved++;
    }
  });

  return `${solved}/${total}`;
}

function updatePatternCount(module, pattern) {
  const el = document.getElementById(`count_${pattern.id}`);
  if (!el) return;

  el.textContent = `(${patternProgress(module, pattern)})`;
}

// ===========================
// COLLAPSSE
// ===========================

function togglePattern(id) {
  const body = document.getElementById("body_" + id);
  const arrow = document.getElementById("arrow_" + id);

  if (body.classList.contains("show")) {
    body.classList.remove("show");
    arrow.innerText = "▶";
  } else {
    body.classList.add("show");
    arrow.innerText = "▼";
  }
}

// ===========================
// EXPORT BACKUP
// ===========================

function markDataModified() {
  localStorage.setItem("lastModified", new Date().toISOString());
}

function createBackupObject() {
  const backup = {
    app: "DSA Handbook Tracker",
    version: 1,
    lastModified:
      localStorage.getItem("lastModified") ?? new Date().toISOString(),
    data: {},
  };

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (isBackupKey(key)) {
      backup.data[key] = localStorage.getItem(key);
    }
  }
  return backup;
}

function downloadBackupObject(backup) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  const date = new Date().toISOString().split("T")[0];
  link.download = `DSA_Backup_${date}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportBackup() {
  downloadBackupObject(createBackupObject());
}

document.getElementById("importFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function () {
    try {
      const backup = JSON.parse(reader.result);
      if (
        backup.app !== "DSA Handbook Tracker" ||
        backup.version !== 1 ||
        typeof backup.data !== "object" ||
        !backup.lastModified
      ) {
        showToast("Invalid backup file.", "error");
        return;
      }
      pendingBackup = backup;
      document.getElementById("restoreModal").classList.add("show");
    } catch (err) {
      showToast("Invalid backup file.", "error");
      console.error(err);
    }
  };
  reader.readAsText(file);
});

window.togglePattern = togglePattern;

// ============================
// HOME BUTTON
// ============================

document.getElementById("homeBtn").onclick = () => {
  document.getElementById("homePage").style.display = "block";
  document.getElementById("modulePage").style.display = "none";
  updateDashboard();
};

// ===========================
// MODAL EVENTS
// ===========================

// Pattern Guide modal controls

document
  .getElementById("patternGuideClose")
  .addEventListener("click", closePatternGuide);

document
  .getElementById("patternGuideDone")
  .addEventListener("click", closePatternGuide);

document
  .getElementById("patternGuideModal")
  .addEventListener("click", (event) => {
    if (event.target.id === "patternGuideModal") {
      closePatternGuide();
    }
  });

document.getElementById("closeModal").onclick = () => {
  if (isEditing && hasUnsavedChanges()) {
    document.getElementById("discardModal").classList.add("show");
  } else {
    closeNote();
  }
};

document.getElementById("saveNoteBtn").onclick = () => {
  localStorage.setItem(currentNoteKey, JSON.stringify(quill.getContents()));
  markDataModified();
  // Mark current state as saved
  originalDelta = quill.getContents();
  isEditing = false;
  quill.enable(false);
  toolbar.style.display = "none";
  document.getElementById("editNoteBtn").style.display = "inline-block";
  document.getElementById("saveNoteBtn").style.display = "none";
};

document.getElementById("editNoteBtn").onclick = () => {
  isEditing = true;
  quill.enable(true);
  toolbar.style.display = "block";
  document.getElementById("editNoteBtn").style.display = "none";
  document.getElementById("saveNoteBtn").style.display = "inline-block";
};

document.getElementById("cancelDiscard").onclick = () => {
  document.getElementById("discardModal").classList.remove("show");
};

document.getElementById("confirmDiscard").onclick = () => {
  document.getElementById("discardModal").classList.remove("show");
  closeNote();
};

quill.keyboard.addBinding(
  {
    key: "S",
    shortKey: true,
  },
  () => {
    if (isEditing) {
      document.getElementById("saveNoteBtn").click();
    }
  },
);

document.getElementById("exportBtn").onclick = exportBackup;
document.getElementById("importBtn").onclick = () => {
  document.getElementById("importFile").click();
};

document.getElementById("cancelRestore").onclick = () => {
  pendingBackup = null;
  document.getElementById("restoreModal").classList.remove("show");
};

function restoreBackupObject(backup) {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (isBackupKey(key)) {
      localStorage.removeItem(key);
    }
  }
  for (const key in backup.data) {
    localStorage.setItem(key, backup.data[key]);
  }
  localStorage.setItem("lastModified", backup.lastModified);
  document.getElementById("importFile").value = "";
  refreshUI();
  showToast("Backup restored successfully.");
}

//refresh ui after backup restore
function refreshUI() {
  renderSidebar();
  updateDashboard();

  // If user is on Home page
  if (document.getElementById("homePage").style.display !== "none") {
    return;
  }
  // Otherwise simply go back Home
  document.getElementById("homePage").style.display = "block";
  document.getElementById("modulePage").style.display = "none";
}

document.getElementById("confirmRestore").onclick = () => {
  if (!pendingBackup) return;

  document.getElementById("restoreModal").classList.remove("show");
  const backup = pendingBackup;
  pendingBackup = null;
  restoreBackupObject(backup);
};

const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("moduleList");
const overlay = document.getElementById("sidebarOverlay");

menuBtn.onclick = () => {
  sidebar.classList.toggle("open");
  overlay.classList.toggle("show");
};

overlay.onclick = () => {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
};
