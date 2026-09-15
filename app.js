import { mountToolShell } from "./shared/shell.js";
import { TOOLS } from "./shared/tools-registry.js";
import { listClasses, createClass, getActiveClass, setActiveClass } from "./shared/data.js";

const { user, container } = await mountToolShell({
  eyebrow: "35-maktab uchun",
  title: `35Maktab<span>Tools</span>`,
  layout: "page",
  width: "wide",
  showBack: false,
  showSettings: true,
  sharedPath: "./shared",
  rootPath: "./",
  loginPath: "login/",
  settingsPath: "settings/",
});

let classes = await listClasses(user.uid);
let activeClass = await getActiveClass(user.uid);

function classOptionsHTML() {
  if (classes.length === 0) return `<option value="">Hali sinf yo'q</option>`;
  return classes
    .map(c => `<option value="${c.id}" ${activeClass && activeClass.id === c.id ? 'selected' : ''}>${c.name}</option>`)
    .join('');
}

const cardsHTML = TOOLS.map(tool => {
  const ready = tool.status === "ready";
  const statusLabel = ready ? "Tayyor" : "Rejada";
  const inner = `
    <div class="tool-status ${ready ? 'ready' : ''}"><span class="dot"></span> ${statusLabel}</div>
    <div class="tool-name">${tool.name}</div>
    <div class="tool-desc">${tool.desc}</div>
  `;
  return ready
    ? `<a class="tool-card" href="${tool.path}">${inner}</a>`
    : `<div class="tool-card disabled">${inner}</div>`;
}).join('');

container.insertAdjacentHTML('beforeend', `
  <p class="lead">Maktab hayotini qulaylashtiradigan mustaqil tool'lar to'plami. Har biri o'z ishini qiladi — bittasini boshqasisiz ham ishlatasan.</p>

  <div class="card class-bar">
    <span class="class-label">Faol sinf:</span>
    <select id="classSelect" ${classes.length === 0 ? 'disabled' : ''}>${classOptionsHTML()}</select>
    <button class="btn-ghost" id="newClassBtn" type="button">+ Yangi sinf</button>
    <a class="manage-link" href="sinflar/">Sinflarni boshqarish &rarr;</a>
    <form class="new-class-form" id="newClassForm">
      <input type="text" id="newClassName" placeholder="Sinf nomi, masalan: 5-A" required>
      <button type="submit" class="btn-main">Yaratish</button>
    </form>
  </div>

  <div class="grid">${cardsHTML}</div>
  <footer>Muhammadrasul tomonidan, 35-maktab uchun.</footer>
`);

// Select o'zgarganda — darhol UI yangilanadi, Firestore yozuvi orqa fonda
// ketadi (setActiveClass ichida), tugma/hech narsa kutib turmaydi.
document.getElementById('classSelect').addEventListener('change', (e) => {
  const classId = e.target.value;
  if (!classId) return;
  const cls = classes.find(c => c.id === classId);
  activeClass = cls;
  setActiveClass(user.uid, classId, cls.name);
});

document.getElementById('newClassBtn').addEventListener('click', () => {
  document.getElementById('newClassForm').classList.toggle('open');
  document.getElementById('newClassName').focus();
});

document.getElementById('newClassForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('newClassName');
  const name = input.value.trim();
  if (!name) return;

  // createClass/setActiveClass Firestore javobini kutmaydi — ikkalasi ham
  // faqat localStorage'ga yozib bo'lgach qaytadi, shu zahoti keyingi
  // sahifaga o'tamiz, Firestore yozuvi orqa fonda davom etadi.
  const classId = await createClass(user.uid, name);
  await setActiveClass(user.uid, classId, name);
  window.location.href = `sinflar/?classId=${classId}`;
});
