import { mountToolShell } from "../../shared/shell.js";
import { getActiveClass, listStudents } from "../../shared/data.js";
import { icon } from "../../shared/icons.js";

const { user, container } = await mountToolShell({
  eyebrow: "Tasodifiy o'quvchi tanlash",
  title: `Ism <span>Tanlash</span>`,
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
  const storageKey = `ism-roulette-excluded_${user.uid}_${activeClass.id}`;

  container.innerHTML = `
    <p class="section-lead">Sinf: <strong>${activeClass.name}</strong> — <a href="../../">almashtirish</a></p>
    <div class="card">
      <div style="display:flex; justify-content:flex-end; margin-bottom:8px;">
        <button class="btn-ghost" id="settingsBtn" type="button" title="Sozlamalar">
          ${icon('settings', 16)} Sozlamalar
        </button>
      </div>

      <div class="stage" id="stage">
        <div class="stage-empty" id="stageEmpty">Yuklanmoqda...</div>
      </div>

      <div class="meta-row">
        <span id="countLabel">0 ta ism</span>
      </div>

      <div class="btn-row" style="justify-content:center;">
        <button class="btn-main" id="pickBtn">${icon('shuffle', 16)} Tanla</button>
      </div>

      <div class="pool-count" id="poolCount" style="display:none;">
        <span class="dot"></span>
        <span id="poolCountText"></span>
      </div>

      <div class="sync-status" id="syncStatus"></div>
    </div>

    <div class="card" id="settingsPanel" style="display:none;">
      <p class="section-lead">O'chirilgan (off) o'quvchi roulette'da chiqmaydi. Holat localStorage'da saqlanadi.</p>
      <div id="studentList"></div>
    </div>
  `;

  const stage = document.getElementById('stage');
  const stageEmpty = document.getElementById('stageEmpty');
  const pickBtn = document.getElementById('pickBtn');
  const countLabel = document.getElementById('countLabel');
  const poolCount = document.getElementById('poolCount');
  const poolCountText = document.getElementById('poolCountText');
  const syncStatus = document.getElementById('syncStatus');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const studentList = document.getElementById('studentList');

  let pool = [];          // tanlanishi mumkin bo'lgan ismlar (exclude + already picked hisobga olingan)
  let fullList = [];      // exclude qilinmagan ismlar
  let studentsWithId = []; // {id, name} to'liq ro'yxat
  let excludedIds = new Set();
  let spinning = false;

  function loadExcluded() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) excludedIds = new Set(arr);
      }
    } catch { /* ignore */ }
  }

  function saveExcluded() {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...excludedIds]));
    } catch { /* ignore */ }
  }

  function rebuildLists() {
    fullList = studentsWithId
      .filter(s => !excludedIds.has(s.id))
      .map(s => s.name);
    // pool faqat hali tanlanmaganlarni saqlaydi; agar fullList o'zgarsa, poolni ham yangilaymiz
    // lekin allaqachon tanlanganlarni yo'qotmaslik uchun intersection olamiz
    const fullSet = new Set(fullList);
    pool = pool.filter(n => fullSet.has(n));
    // agar pool bo'sh va fullList bor — to'liq qayta to'ldiramiz
    if (pool.length === 0 && fullList.length > 0) {
      pool = [...fullList];
    }
    updateCount();
  }

  function updateCount() {
    countLabel.textContent = fullList.length + ' ta ism';
    if (fullList.length > 0) {
      poolCount.style.display = 'flex';
      poolCountText.textContent = pool.length + ' / ' + fullList.length + ' hali tanlanmagan';
    } else {
      poolCount.style.display = 'none';
    }
  }

  function renderStudentList() {
    if (studentsWithId.length === 0) {
      studentList.innerHTML = `<div class="empty-state">Bu sinfda hali o'quvchi yo'q.</div>`;
      return;
    }
    studentList.innerHTML = studentsWithId.map(s => {
      const isOn = !excludedIds.has(s.id);
      return `
        <div class="student-row" style="display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
          <span>${s.name}</span>
          <label class="toggle" title="${isOn ? 'Roulette\'da bor' : 'Roulette\'dan chiqarilgan'}">
            ${isOn ? icon('eye', 16) : icon('eyeOff', 16)}
            <input type="checkbox" data-student-id="${s.id}" ${isOn ? 'checked' : ''}>
          </label>
        </div>
      `;
    }).join('');

    studentList.querySelectorAll('[data-student-id]').forEach(input => {
      input.addEventListener('change', (e) => {
        const id = e.target.dataset.studentId;
        if (e.target.checked) {
          excludedIds.delete(id);
        } else {
          excludedIds.add(id);
        }
        saveExcluded();
        rebuildLists();
        // ikonkani yangilash
        renderStudentList();
      });
    });
  }

  async function loadStudents() {
    syncStatus.textContent = "Yuklanmoqda...";
    try {
      loadExcluded();
      const students = await listStudents(user.uid, activeClass.id);
      studentsWithId = students.filter(s => s.name && s.name.trim());
      rebuildLists();

      if (studentsWithId.length === 0) {
        stageEmpty.textContent = "Bu sinfda hali o'quvchi yo'q. Avval sinflar sahifasida qo'shing.";
        stage.innerHTML = '';
        stage.appendChild(stageEmpty);
        pickBtn.disabled = true;
      } else if (fullList.length === 0) {
        stageEmpty.textContent = "Barcha o'quvchilar o'chirilgan. Sozlamalardan yoqing.";
        stage.innerHTML = '';
        stage.appendChild(stageEmpty);
        pickBtn.disabled = true;
      } else {
        stageEmpty.textContent = "\"Tanla\" tugmasini bosing";
        stage.innerHTML = '';
        stage.appendChild(stageEmpty);
        pickBtn.disabled = false;
      }
      syncStatus.textContent = studentsWithId.length ? `${studentsWithId.length} ta ism yuklandi` : "";
      syncStatus.className = "sync-status";
      renderStudentList();
    } catch (err) {
      syncStatus.textContent = "Yuklashda xatolik: " + err.message;
      syncStatus.className = "sync-status error";
      stageEmpty.textContent = "Xatolik yuz berdi";
      pickBtn.disabled = true;
    }
  }

  function pickRandom() {
    if (spinning) return;

    if (pool.length === 0) {
      pool = [...fullList];
      updateCount();
    }

    if (pool.length === 0) {
      stageEmpty.style.display = 'block';
      stageEmpty.textContent = fullList.length === 0
        ? "Barcha o'quvchilar o'chirilgan yoki sinfda o'quvchi yo'q."
        : "Hammasi tanlandi.";
      stage.innerHTML = '';
      stage.appendChild(stageEmpty);
      return;
    }

    spinning = true;
    pickBtn.disabled = true;
    stage.classList.remove('winner');

    const nameEl = document.createElement('div');
    nameEl.className = 'stage-name';
    stage.innerHTML = '';
    stage.appendChild(nameEl);

    let spins = 0;
    const totalSpins = 18 + Math.floor(Math.random() * 6);

    function tick() {
      const randomIndex = Math.floor(Math.random() * pool.length);
      nameEl.textContent = pool[randomIndex];
      spins++;

      if (spins >= totalSpins) {
        const finalIndex = Math.floor(Math.random() * pool.length);
        const winner = pool[finalIndex];
        nameEl.textContent = winner;
        stage.classList.add('winner');

        pool.splice(finalIndex, 1);
        updateCount();

        spinning = false;
        pickBtn.disabled = false;
        return;
      }

      const delay = 60 + Math.floor((spins / totalSpins) * 70);
      setTimeout(tick, delay);
    }
    tick();
  }

  settingsBtn.addEventListener('click', () => {
    const opening = settingsPanel.style.display === 'none';
    settingsPanel.style.display = opening ? 'block' : 'none';
    if (opening) renderStudentList();
  });

  pickBtn.addEventListener('click', pickRandom);

  document.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    const inField = tag === 'TEXTAREA' || tag === 'INPUT';
    if ((e.code === 'Space' || e.code === 'Enter') && !inField && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      pickRandom();
    }
  });

  await loadStudents();
}
