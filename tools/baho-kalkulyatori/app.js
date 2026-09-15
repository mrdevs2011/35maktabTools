// app.js — Baho kalkulyatori. O'quvchilar ro'yxati endi FAOL sinfdan keladi
// (root sahifada tanlanadi) — bu tool o'zi sinf tanlamaydi, faqat o'qiydi.
import { mountToolShell } from "../../shared/shell.js";
import { getActiveClass, listStudents, getToolDoc, setToolDoc, addToToolArray } from "../../shared/data.js";

const { user, container } = await mountToolShell({
  eyebrow: "Baholash",
  title: `Baho <span>kalkulyatori</span>`,
  width: "wide",
  // tools/baho-kalkulyatori/ — root'dan 2 qavat pastda, shuning uchun default
  // "../shared" emas, "../../shared" kerak. Yangi tool yozganda ham xuddi
  // shu 3 ta yo'lni ko'chirib ol.
  sharedPath: "../../shared",
  rootPath: "../../index.html",
  loginPath: "../../login/index.html",
});

const activeClass = await getActiveClass(user.uid);

if (!activeClass) {
  container.innerHTML = `
    <div class="no-class-notice">
      Hali faol sinf tanlanmagan. Avval <a href="../../index.html">bosh sahifada</a> sinf yarating yoki tanlang — shundan keyin bu yerda ishlaydi.
    </div>
  `;
} else {
  container.innerHTML = `
    <p class="section-lead">Sinf: <strong>${activeClass.name}</strong> — <a href="../../index.html">almashtirish</a></p>
    <div class="card">
      <p class="section-lead">O'quvchini tanlang, baho kiriting — o'rtacha avtomatik hisoblanadi.</p>
      <label for="studentSelect">O'quvchi</label>
      <select id="studentSelect" style="width:100%;background:var(--bg-soft);border:1px solid var(--border);border-radius:10px;color:var(--text);font-family:'Inter',sans-serif;font-size:14px;padding:11px 13px;"></select>

      <label for="scoreInput">Yangi baho (0-100)</label>
      <input type="text" id="scoreInput" inputmode="numeric" placeholder="masalan: 87">

      <div class="btn-row">
        <button class="btn-main" id="addScoreBtn">Qo'shish</button>
      </div>

      <div class="sync-status" id="syncStatus"></div>
    </div>

    <div class="card" id="resultCard" style="display:none;">
      <h2>Natija</h2>
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

  // ---------- Faol sinfning students ro'yxatidan o'qish (data.js orqali, boshqa hech qayerdan) ----------
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

  // ---------- grades/{studentId} — faqat shu tool'ga xos, ism emas, studentId bog'langan ----------
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

  async function addScore() {
    const studentId = studentSelect.value;
    const value = Number(scoreInput.value);

    if (!studentId) { return; }
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      syncStatus.textContent = "0 dan 100 gacha son kiriting.";
      syncStatus.className = "sync-status error";
      return;
    }

    addScoreBtn.disabled = true;
    syncStatus.textContent = "Saqlanmoqda...";
    syncStatus.className = "sync-status";
    try {
      // Hujjat mavjud bo'lmasa yaratamiz (studentName saqlaymiz faqat ko'rsatish
      // qulayligi uchun keshlash sifatida — asosiy manba baribir students/{id}).
      const existing = await getToolDoc(user.uid, "grades", studentId);
      if (!existing) {
        await setToolDoc(user.uid, "grades", studentId, { scores: [value] });
      } else {
        await addToToolArray(user.uid, "grades", studentId, "scores", value);
      }
      scoreInput.value = '';
      syncStatus.textContent = "Saqlandi ✓";
      syncStatus.className = "sync-status saved";
      await loadScoresForSelected();
    } catch (err) {
      syncStatus.textContent = "Saqlashda xatolik: " + err.message;
      syncStatus.className = "sync-status error";
    } finally {
      addScoreBtn.disabled = false;
    }
  }

  studentSelect.addEventListener('change', loadScoresForSelected);
  addScoreBtn.addEventListener('click', addScore);

  await loadStudents();
}
