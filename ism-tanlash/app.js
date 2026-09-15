// app.js — Ism Roulette. FAQAT shu tool'ning logikasi. Shell, CSS, auth — shared/'da.
import { mountToolShell } from "../shared/shell.js";
import { listStudents, replaceStudents } from "../shared/data.js";

const { user, container } = await mountToolShell({
  eyebrow: "O'quvchi tanlash",
  title: `Ism <span>Roulette</span>`,
});

container.innerHTML = `
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
    </div>

    <div class="sync-status" id="syncStatus"></div>

    <div class="pool-count" id="poolCount" style="display:none;">
      <span class="dot"></span>
      <span id="poolCountText"></span>
    </div>
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

let pool = [];
let fullList = [];
let spinning = false;

// ---------- FIRESTORE (yagona umumiy students ro'yxati orqali) ----------
async function loadStudents() {
  syncStatus.textContent = "Yuklanmoqda...";
  try {
    const students = await listStudents(user.uid);
    namesInput.value = students.map(s => s.name).join('\n');
    syncFromTextarea();
    syncStatus.textContent = students.length ? `${students.length} ta ism yuklandi` : "";
    syncStatus.className = "sync-status";
  } catch (err) {
    syncStatus.textContent = "Yuklashda xatolik: " + err.message;
    syncStatus.className = "sync-status error";
  }
}

async function saveStudents() {
  saveBtn.disabled = true;
  syncStatus.textContent = "Saqlanmoqda...";
  syncStatus.className = "sync-status";
  try {
    await replaceStudents(user.uid, parseNames());
    syncStatus.textContent = "Saqlandi ✓";
    syncStatus.className = "sync-status saved";
  } catch (err) {
    syncStatus.textContent = "Saqlashda xatolik: " + err.message;
    syncStatus.className = "sync-status error";
  } finally {
    saveBtn.disabled = false;
  }
}

saveBtn.addEventListener('click', saveStudents);

// ---------- RANDOM TANLASH LOGIKASI ----------
function parseNames(){
  return namesInput.value.split('\n').map(n => n.trim()).filter(n => n.length > 0);
}

function syncFromTextarea(){
  fullList = parseNames();
  pool = [...fullList];
  updateCount();
}

function updateCount(){
  countLabel.textContent = fullList.length + ' ta ism';
  if(removeAfterPick.checked && fullList.length > 0){
    poolCount.style.display = 'flex';
    poolCountText.textContent = pool.length + ' / ' + fullList.length + ' hali tanlanmagan';
  } else {
    poolCount.style.display = 'none';
  }
}

namesInput.addEventListener('input', syncFromTextarea);
removeAfterPick.addEventListener('change', updateCount);

function pickRandom(){
  if(spinning) return;

  const source = removeAfterPick.checked ? pool : fullList;

  if(source.length === 0){
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

    if(spins >= totalSpins){
      clearInterval(interval);

      const finalIndex = Math.floor(Math.random() * source.length);
      const winner = source[finalIndex];
      nameEl.textContent = winner;
      stage.classList.add('winner');

      if(removeAfterPick.checked){
        pool.splice(finalIndex, 1);
      }
      updateCount();

      spinning = false;
      pickBtn.disabled = false;
    }
  }, 60 + spins * 4);
}

function resetPool(){
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

await loadStudents();
