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

let pendingBackup = null;
fetch("roadmap.json")
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

function updateStreak() {
  const today = new Date().toISOString().split("T")[0];
  let current = parseInt(localStorage.getItem(STREAK_CURRENT) || "0");
  let best = parseInt(localStorage.getItem(STREAK_BEST) || "0");
  const lastDate = localStorage.getItem(STREAK_LAST_DATE);

  // Already counted today
  if (lastDate === today) {
    return;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (lastDate === yesterdayStr) {
    current++;
  } else {
    current = 1;
  }

  best = Math.max(best, current);

  localStorage.setItem(STREAK_CURRENT, current);
  localStorage.setItem(STREAK_BEST, best);
  localStorage.setItem(STREAK_LAST_DATE, today);
}

// ============================
// DASHBOARD
// ============================

function updateDashboard() {
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
        const solved =
            localStorage.getItem(
                kCP(cp.id, x.id)
            ) === "true";

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
  document.getElementById("overallSolvedText").innerText = solvedProblems + " / " + totalProblems + " Problems";
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
  document.getElementById("easyCount").innerText = `${easySolved} / ${easyTotal}`;
  document.getElementById("mediumCount").innerText = `${mediumSolved} / ${mediumTotal}`;
  document.getElementById("hardCount").innerText = `${hardSolved} / ${hardTotal}`;

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
    if(percent(m) === 100){
        b.classList.add("moduleCompleted");
    }
    const icon = percent(m) === 100 ? "✅" : "📦";
    b.innerHTML =
      `${icon} ${m.name}
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
        if(checkpointPercent(cp) === 100){
          cpBtn.classList.add("checkpointCompleted");
        }
        const cpIcon =
          checkpointPercent(cp) === 100
          ? "🏆"
          : "🏁";
        cpBtn.innerHTML =
          `${cpIcon} ${cp.name}
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

    <button
        class="noteBtn"
        onclick="event.stopPropagation();
                  openNote(
                  '${kPatternNote(p.id)}',
                  '${p.title}'
                  )">
        📝 Notes
    </button>

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

  cp.practice.forEach(x => {
      if (localStorage.getItem(kCP(cp.id, x.id)) === "true")
          solved++;
  });

  return total
      ? Math.round((solved * 100) / total)
      : 0;
}

// ===========================
// NOTES
// ===========================

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
