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
      <p class="section-lead">O'quvchini tanlang, baho kiriting — o'rtacha avtomatik hisoblanadi.</p>
      <label for="studentSelect">O'quvchi</label>
      <select id="studentSelect" style="width:100%;background:var(--bg-soft);border:1px solid var(--border);border-radius:10px;color:var(--text);font-family:'Inter',sans-serif;font-size:14px;padding:11px 13px;"></select>

      <label for="scoreInput">Yangi baho (0-100)</label>
      <input type="text" id="scoreInput" inputmode="numeric" placeholder="masalan: 87">

      <div class="btn-row">
        <button class="btn-main" id="addScoreBtn">${icon('plus', 16)} Qo'shish</button>
      </div>

      <div class="sync-status" id="syncStatus"></div>
    </div>

    <div class="card" id="resultCard" style="display:none;">
      <h2 style="display:flex;align-items:center;gap:8px;">${icon('chart', 16)} Natija</h2>
      <div id="scoresList" style="color:var(--text-dim);font-size:14px;line-height:1.8;"></div>
      <div style="margin-top:14px;font-family:'Space Grotesk',sans-serif;font-size:20px;">
        O'rtacha: <span id="avgValue" style="color:var(--gold);"></span>
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

  let students = [];

  async function loadStudents() {
    syncStatus.textContent = "Yuklanmoqda...";
    try {
      students = await listStudents(user.uid, activeClass.id);
      if (students.length === 0) {
        studentSelect.innerHTML = `<option value="">Avval "Sinflar" sahifasida o'quvchi kiriting</option>`;
        syncStatus.textContent = "";
        return;
      }
      studentSelect.innerHTML = students
        .map(s => `<option value="${s.id}">${s.name}</option>`)
        .join('');
      syncStatus.textContent = "";
      await loadScoresForSelected();
    } catch (err) {
      syncStatus.textContent = "Yuklashda xatolik: " + err.message;
      syncStatus.className = "sync-status error";
    }
  }

  async function loadScoresForSelected() {
    const studentId = studentSelect.value;
    if (!studentId) { resultCard.style.display = 'none'; return; }

    const gradeDoc = await getToolDoc(user.uid, "grades", studentId);
    const scores = gradeDoc?.scores || [];
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
  }

  // addToToolArray setDoc(...,{merge:true}) + arrayUnion ishlatadi — hujjat
  // mavjud bo'lmasa ham avtomatik yaratiladi, avval "bor-yo'qligini"
  // tekshirish kerak emas. UI darhol "Saqlandi ✓" ko'rsatadi (optimistik),
  // promise await qilinmaydi — xato chiqsa .catch() xabarni almashtiradi.
  function addScore() {
    const studentId = studentSelect.value;
    const value = Number(scoreInput.value);

    if (!studentId) { return; }
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      syncStatus.textContent = "0 dan 100 gacha son kiriting.";
      syncStatus.className = "sync-status error";
      return;
    }

    addToToolArray(user.uid, "grades", studentId, "scores", value).then((updated) => {
      renderScores(updated.scores || []);
    }).catch(err => {
      syncStatus.textContent = "Saqlanmadi: " + err.message;
      syncStatus.className = "sync-status error";
    });

    scoreInput.value = '';
    syncStatus.textContent = "Saqlandi ✓";
    syncStatus.className = "sync-status saved";
  }

  studentSelect.addEventListener('change', loadScoresForSelected);
  addScoreBtn.addEventListener('click', addScore);

  await loadStudents();
}
