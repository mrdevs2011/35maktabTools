import { mountToolShell } from "../../shared/shell.js";
import { getActiveClass, listStudents, replaceStudents, getToolDoc, setToolDoc } from "../../shared/data.js";

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

      <textarea id="namesInput" placeholder="Har bir qatorga bitta ism:&#10;Ali&#10;Vali&#10;Guli&#10;Madina"></textarea>

      <div class="meta-row">
        <label class="toggle">
          <input type="checkbox" id="removeAfterPick" checked>
          Tanlangach ro'yxatdan olib tashlash
        </label>
        <span id="countLabel">0 ta ism</span>
      </div>

      <div class="btn-row">
        <button class="btn-save" id="saveBtn">Saqlash</button>
        <button class="btn-main" id="pickBtn">Tanla</button>
        <button class="btn-ghost" id="resetBtn">Qayta yuklash</button>
        <button class="btn-ghost" id="excludeToggleBtn" type="button">O'quvchi chiqarib yuborish</button>
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

  // replaceStudents() Firestore javobini kutmaydi — localStorage'ga
  // yozilgach shu zahoti qaytadi, shuning uchun bu yerda "Saqlanmoqda..."
  // holati kerak emas, to'g'ridan-to'g'ri "Saqlandi ✓" ko'rsatiladi.
  // Haqiqiy Firestore yozuvi orqa fonda ketadi, tarmoq o'chib qolsa ham
  // ma'lumot localStorage'da qoladi va keyinroq avtomatik sinxronlanadi.
  function saveStudents() {
    replaceStudents(user.uid, activeClass.id, parseNames());
    syncStatus.textContent = "Saqlandi ✓";
    syncStatus.className = "sync-status saved";
  }

  saveBtn.addEventListener('click', saveStudents);

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

    let spins = 0;
    const totalSpins = 18 + Math.floor(Math.random() * 6);
    const nameEl = document.createElement('div');
    nameEl.className = 'stage-name';
    stage.innerHTML = '';
    stage.appendChild(nameEl);

    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * source.length);
      nameEl.textContent = source[randomIndex];
      spins++;

      if (spins >= totalSpins) {
        clearInterval(interval);

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
      }
    }, 60 + spins * 4);
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

  function renderExcludeList() {
    if (studentsWithId.length === 0) {
      excludeList.innerHTML = `<div class="empty-state">Bu sinfda hali o'quvchi yo'q.</div>`;
      return;
    }
    excludeList.innerHTML = studentsWithId.map(s => `
      <div class="student-row">
        <span>${s.name}</span>
        <label class="toggle">
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

    // setToolDoc darhol localStorage'ga yozadi, Firestore orqa fonda ketadi.
    setToolDoc(user.uid, "ism-tanlash-excluded", activeClass.id, { ids: [...excludedIds] });
    syncFromTextarea();
  }

  excludeToggleBtn.addEventListener('click', () => {
    const opening = excludePanel.style.display === 'none';
    excludePanel.style.display = opening ? 'block' : 'none';
    if (opening) renderExcludeList();
  });

  await loadStudents();
}
