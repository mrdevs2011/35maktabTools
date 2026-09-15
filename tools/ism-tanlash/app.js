import { mountToolShell } from "../../shared/shell.js";
import { getActiveClass, listStudents, replaceStudents, getToolDoc, setToolDoc } from "../../shared/data.js";
import { icon } from "../../shared/icons.js";

const { user, container } = await mountToolShell({
  eyebrow: "O'quvchi tanlash",
  title: `Ism <span>Roulette</span>`,
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
      <div class="stage" id="stage">
        <div class="stage-empty" id="stageEmpty">Ismlarni kiriting va "Tanla" bosing</div>
      </div>
      <div class="kbd-hint">Space / Enter — tanlash · R — qayta yuklash</div>

      <textarea id="namesInput" placeholder="Har bir qatorga bitta ism:&#10;Ali&#10;Vali&#10;Guli&#10;Madina"></textarea>

      <div class="meta-row">
        <label class="toggle">
          <input type="checkbox" id="removeAfterPick" checked>
          Tanlangach ro'yxatdan olib tashlash
        </label>
        <span id="countLabel">0 ta ism</span>
      </div>

      <div class="btn-row">
        <button class="btn-save" id="saveBtn">${icon('check', 15)} Saqlash</button>
        <button class="btn-main" id="pickBtn">${icon('shuffle', 16)} Tanla</button>
        <button class="btn-ghost" id="resetBtn">${icon('close', 15)} Qayta yuklash</button>
        <button class="btn-ghost" id="excludeToggleBtn" type="button">${icon('users', 15)} O'quvchi chiqarib yuborish</button>
      </div>

      <div class="sync-status" id="syncStatus"></div>

      <div class="pool-count" id="poolCount" style="display:none;">
        <span class="dot"></span>
        <span id="poolCountText"></span>
      </div>
    </div>

    <div class="card" id="excludePanel" style="display:none;">
      <p class="section-lead">O'chirilgan (off) o'quvchi shu sinfda hech qachon tanlanmaydi — ro'yxatdan butunlay o'chmaydi, faqat roulette'dan chetlatiladi. Holat saqlanadi, keyingi safar kirganda ham eslab qoladi.</p>
      <div id="excludeList"></div>
    </div>
  `;

  const namesInput = document.getElementById('namesInput');
  const stage = document.getElementById('stage');
  const stageEmpty = document.getElementById('stageEmpty');
  const pickBtn = document.getElementById('pickBtn');
  const resetBtn = document.getElementById('resetBtn');
  const saveBtn = document.getElementById('saveBtn');
  const removeAfterPick = document.getElementById('removeAfterPick');
  const countLabel = document.getElementById('countLabel');
  const poolCount = document.getElementById('poolCount');
  const poolCountText = document.getElementById('poolCountText');
  const syncStatus = document.getElementById('syncStatus');
  const excludeToggleBtn = document.getElementById('excludeToggleBtn');
  const excludePanel = document.getElementById('excludePanel');
  const excludeList = document.getElementById('excludeList');

  let pool = [];
  let fullList = [];
  let spinning = false;
  let studentsWithId = [];
  let excludedIds = new Set();

  async function loadStudents() {
    syncStatus.textContent = "Yuklanmoqda...";
    try {
      const [students, excludeDoc] = await Promise.all([
        listStudents(user.uid, activeClass.id),
        getToolDoc(user.uid, "ism-tanlash-excluded", activeClass.id),
      ]);
      studentsWithId = students;
      excludedIds = new Set(excludeDoc?.ids || []);
      namesInput.value = students.map(s => s.name).join('\n');
      syncFromTextarea();
      syncStatus.textContent = students.length ? `${students.length} ta ism yuklandi` : "";
      syncStatus.className = "sync-status";
      renderExcludeList();
    } catch (err) {
      syncStatus.textContent = "Yuklashda xatolik: " + err.message;
      syncStatus.className = "sync-status error";
    }
  }

  // "Saqlandi ✓" darhol ko'rsatiladi (optimistik UI), replaceStudents()
  // promise'i await qilinmaydi. Tarmoq o'chib qolsa, Firestore'ning o'z
  // IndexedDb navbati ma'lumotni saqlab turadi va internet qaytganda
  // avtomatik sinxronlaydi. Xato chiqsa (masalan ruxsat rad etilsa),
  // .catch() "Saqlandi ✓" xabarini "Saqlanmadi: ..." bilan almashtiradi.
  function saveStudents() {
    replaceStudents(user.uid, activeClass.id, parseNames()).catch(err => {
      syncStatus.textContent = "Saqlanmadi: " + err.message;
      syncStatus.className = "sync-status error";
    });
    syncStatus.textContent = "Saqlandi ✓";
    syncStatus.className = "sync-status saved";
  }

  saveBtn.addEventListener('click', saveStudents);

  // Avto-saqlash: yozish to'xtagach 1.2s ichida (yoki blur'da) — alohida
  // "Saqlash" bosish shart emas, lekin tugma ham ishlaydi.
  let saveTimer = null;
  namesInput.addEventListener('input', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveStudents, 1200);
  });
  namesInput.addEventListener('blur', () => {
    clearTimeout(saveTimer);
    if (namesInput.value.trim()) saveStudents();
  });

  function parseNames() {
    return namesInput.value.split('\n').map(n => n.trim()).filter(n => n.length > 0);
  }

  function syncFromTextarea() {
    const parsed = parseNames();
    const excludedNames = new Set(
      studentsWithId.filter(s => excludedIds.has(s.id)).map(s => s.name)
    );
    fullList = parsed.filter(name => !excludedNames.has(name));
    pool = [...fullList];
    updateCount();
  }

  function updateCount() {
    countLabel.textContent = fullList.length + ' ta ism';
    if (removeAfterPick.checked && fullList.length > 0) {
      poolCount.style.display = 'flex';
      poolCountText.textContent = pool.length + ' / ' + fullList.length + ' hali tanlanmagan';
    } else {
      poolCount.style.display = 'none';
    }
  }

  namesInput.addEventListener('input', syncFromTextarea);
  removeAfterPick.addEventListener('change', updateCount);

  function pickRandom() {
    if (spinning) return;

    const source = removeAfterPick.checked ? pool : fullList;

    if (source.length === 0) {
      stageEmpty.style.display = 'block';
      stageEmpty.textContent = fullList.length === 0
        ? "Avval ism kiriting!"
        : "Hammasi tanlandi! Qayta yuklang.";
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

    // Tezroq, lekin "rulletka" hissi saqlanadi: 12–16 aylanish, sekinlashib boradi
    const totalSpins = 12 + Math.floor(Math.random() * 5);
    let spins = 0;

    function tick() {
      const randomIndex = Math.floor(Math.random() * source.length);
      nameEl.textContent = source[randomIndex];
      spins++;

      if (spins >= totalSpins) {
        const finalIndex = Math.floor(Math.random() * source.length);
        const winner = source[finalIndex];
        nameEl.textContent = winner;
        stage.classList.add('winner');

        if (removeAfterPick.checked) {
          pool.splice(finalIndex, 1);
        }
        updateCount();

        spinning = false;
        pickBtn.disabled = false;
        return;
      }

      // Boshida ~40ms, oxiriga ~110ms — sekinlashish effekt
      const delay = 40 + Math.floor((spins / totalSpins) * 70);
      setTimeout(tick, delay);
    }
    tick();
  }

  function resetPool() {
    pool = [...fullList];
    stage.innerHTML = '';
    stageEmpty.style.display = 'block';
    stageEmpty.textContent = "Ismlarni kiriting va \"Tanla\" bosing";
    stage.appendChild(stageEmpty);
    stage.classList.remove('winner');
    updateCount();
  }

  pickBtn.addEventListener('click', pickRandom);
  resetBtn.addEventListener('click', resetPool);

  // Klaviatura: Space / Enter → Tanla (textarea fokusda emas bo'lsa)
  // R → Qayta yuklash
  document.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    const inField = tag === 'TEXTAREA' || tag === 'INPUT';
    if ((e.code === 'Space' || e.code === 'Enter') && !inField && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      pickRandom();
    }
    if ((e.key === 'r' || e.key === 'R') && !inField && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      resetPool();
    }
  });

  function renderExcludeList() {
    if (studentsWithId.length === 0) {
      excludeList.innerHTML = `<div class="empty-state">Bu sinfda hali o'quvchi yo'q.</div>`;
      return;
    }
    excludeList.innerHTML = studentsWithId.map(s => `
      <div class="student-row">
        <span>${s.name}</span>
        <label class="toggle" title="${excludedIds.has(s.id) ? 'Chiqarib yuborilgan' : 'Ro\'yxatda'}">
          ${excludedIds.has(s.id) ? icon('eyeOff', 16) : icon('eye', 16)}
          <input type="checkbox" data-exclude-toggle="${s.id}" ${excludedIds.has(s.id) ? '' : 'checked'}>
        </label>
      </div>
    `).join('');

    excludeList.querySelectorAll('[data-exclude-toggle]').forEach(input => {
      input.addEventListener('change', (e) => toggleExclude(e.target.dataset.excludeToggle, !e.target.checked));
    });
  }

  function toggleExclude(studentId, excluded) {
    if (excluded) excludedIds.add(studentId);
    else excludedIds.delete(studentId);

    setToolDoc(user.uid, "ism-tanlash-excluded", activeClass.id, { ids: [...excludedIds] })
      .catch(err => {
        syncStatus.textContent = "Saqlanmadi: " + err.message;
        syncStatus.className = "sync-status error";
      });
    syncFromTextarea();
  }

  excludeToggleBtn.addEventListener('click', () => {
    const opening = excludePanel.style.display === 'none';
    excludePanel.style.display = opening ? 'block' : 'none';
    if (opening) renderExcludeList();
  });

  await loadStudents();
}
