import { mountToolShell } from "../../shared/shell.js";
import { getActiveClass, listStudents, getToolDoc, addToToolArray } from "../../shared/data.js";
import { icon } from "../../shared/icons.js";

const { user, container } = await mountToolShell({
  eyebrow: "Baholash",
  title: `Baho <span>kalkulyatori</span>`,
  width: "wide",
  sharedPath: "../../shared",
  rootPath: "../../",
  loginPath: "../../login/",
});

const activeClass = await getActiveClass(user.uid);
const LAST_STUDENT_KEY = (classId) => `mt_last_student_${user.uid}_${classId}`;

if (!activeClass) {
  container.innerHTML = `
    <div class="no-class-notice">
      Hali faol sinf tanlanmagan. Avval <a href="../../">bosh sahifada</a> sinf yarating yoki tanlang — shundan keyin bu yerda ishlaydi.
    </div>
  `;
} else {
  container.innerHTML = `
    <p class="section-lead">Sinf: <strong>${activeClass.name}</strong> — <a href="../../">almashtirish</a></p>
    <div class="card">
      <p class="section-lead">O'quvchini tanlang, baho kiriting yoki tezkor tugmani bosing — o'rtacha avtomatik hisoblanadi.</p>
      <label for="studentSelect">O'quvchi</label>
      <select id="studentSelect"></select>

      <label for="scoreInput">Yangi baho (0–100)</label>
      <input type="text" id="scoreInput" inputmode="decimal" placeholder="masalan: 4.5 yoki 87" autocomplete="off">

      <div class="quick-scores" id="quickScores" aria-label="Tezkor baholar">
        <button type="button" class="chip" data-score="5">5</button>
        <button type="button" class="chip" data-score="4">4</button>
        <button type="button" class="chip" data-score="3">3</button>
        <button type="button" class="chip" data-score="2">2</button>
        <button type="button" class="chip" data-score="100">100</button>
        <button type="button" class="chip" data-score="90">90</button>
        <button type="button" class="chip" data-score="80">80</button>
        <button type="button" class="chip" data-score="70">70</button>
      </div>

      <div class="btn-row">
        <button class="btn-main" id="addScoreBtn">${icon('plus', 16)} Qo'shish</button>
      </div>

      <div class="sync-status" id="syncStatus"></div>
    </div>

    <div class="card" id="resultCard" style="display:none;">
      <h2 class="with-icon">${icon('chart', 16)} Natija</h2>
      <div class="scores-list" id="scoresList"></div>
      <div class="avg-row">
        O'rtacha: <span class="avg-value" id="avgValue"></span>
        <span class="score-count" id="scoreCount"></span>
      </div>
    </div>
  `;

  const studentSelect = document.getElementById('studentSelect');
  const scoreInput = document.getElementById('scoreInput');
  const addScoreBtn = document.getElementById('addScoreBtn');
  const syncStatus = document.getElementById('syncStatus');
  const resultCard = document.getElementById('resultCard');
  const scoresList = document.getElementById('scoresList');
  const avgValue = document.getElementById('avgValue');
  const scoreCount = document.getElementById('scoreCount');

  let students = [];
  // Mahalliy kesh — qayta-qayta getToolDoc kutmaslik uchun
  const scoresCache = new Map();

  async function loadStudents() {
    syncStatus.textContent = "Yuklanmoqda...";
    try {
      students = await listStudents(user.uid, activeClass.id);
      if (students.length === 0) {
        studentSelect.innerHTML = `<option value="">Avval "Sinflar" sahifasida o'quvchi kiriting</option>`;
        syncStatus.textContent = "";
        return;
      }

      let lastId = null;
      try { lastId = localStorage.getItem(LAST_STUDENT_KEY(activeClass.id)); } catch {}

      studentSelect.innerHTML = students
        .map(s => `<option value="${s.id}" ${s.id === lastId ? 'selected' : ''}>${s.name}</option>`)
        .join('');
      syncStatus.textContent = "";
      await loadScoresForSelected();
      scoreInput.focus();
    } catch (err) {
      syncStatus.textContent = "Yuklashda xatolik: " + err.message;
      syncStatus.className = "sync-status error";
    }
  }

  async function loadScoresForSelected() {
    const studentId = studentSelect.value;
    if (!studentId) { resultCard.style.display = 'none'; return; }

    try { localStorage.setItem(LAST_STUDENT_KEY(activeClass.id), studentId); } catch {}

    if (scoresCache.has(studentId)) {
      renderScores(scoresCache.get(studentId));
      return;
    }

    const gradeDoc = await getToolDoc(user.uid, "grades", studentId);
    const scores = gradeDoc?.scores || [];
    scoresCache.set(studentId, scores);
    renderScores(scores);
  }

  function renderScores(scores) {
    if (scores.length === 0) {
      resultCard.style.display = 'none';
      return;
    }
    resultCard.style.display = 'block';
    scoresList.textContent = scores.join(', ');
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    avgValue.textContent = avg.toFixed(1);
    scoreCount.textContent = `(${scores.length} ta baho)`;
  }

  function addScore(rawValue) {
    const studentId = studentSelect.value;
    const value = Number(rawValue ?? scoreInput.value);

    if (!studentId) {
      syncStatus.textContent = "Avval o'quvchini tanlang.";
      syncStatus.className = "sync-status error";
      return;
    }
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      syncStatus.textContent = "0 dan 100 gacha son kiriting.";
      syncStatus.className = "sync-status error";
      return;
    }

    // Optimistik UI: darhol ro'yxatga qo'shamiz
    const prev = scoresCache.get(studentId) || [];
    const next = [...prev, value];
    scoresCache.set(studentId, next);
    renderScores(next);

    addToToolArray(user.uid, "grades", studentId, "scores", value).then((updated) => {
      const serverScores = updated.scores || next;
      scoresCache.set(studentId, serverScores);
      renderScores(serverScores);
    }).catch(err => {
      scoresCache.set(studentId, prev);
      renderScores(prev);
      syncStatus.textContent = "Saqlanmadi: " + err.message;
      syncStatus.className = "sync-status error";
    });

    scoreInput.value = '';
    scoreInput.focus();
    syncStatus.textContent = "Saqlandi ✓";
    syncStatus.className = "sync-status saved";
  }

  studentSelect.addEventListener('change', () => {
    loadScoresForSelected();
    scoreInput.focus();
  });
  addScoreBtn.addEventListener('click', () => addScore());

  // Enter → qo'shish
  scoreInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addScore();
    }
  });

  // Tezkor chip'lar
  document.getElementById('quickScores').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-score]');
    if (!btn) return;
    addScore(btn.dataset.score);
  });

  // ← / → o'quvchini almashtirish (input fokusda bo'lmasa yoki Alt bilan)
  document.addEventListener('keydown', (e) => {
    if (e.target === scoreInput) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const opts = [...studentSelect.options];
      if (opts.length < 2) return;
      e.preventDefault();
      let idx = studentSelect.selectedIndex;
      idx = e.key === 'ArrowDown' ? Math.min(opts.length - 1, idx + 1) : Math.max(0, idx - 1);
      studentSelect.selectedIndex = idx;
      studentSelect.dispatchEvent(new Event('change'));
    }
  });

  await loadStudents();
}
