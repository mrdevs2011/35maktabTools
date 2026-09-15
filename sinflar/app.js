// app.js — Sinflarni boshqarish. Tool emas, root bilan bir qatorda turadigan
// CORE sahifa (settings kabi): sinf yaratish/o'chirish/faol qilish + har bir
// sinfning o'quvchilar ro'yxatini (ism+familya) boshqarish shu yerda.
import { mountToolShell } from "../shared/shell.js";
import {
  listClasses, createClass, deleteClass, getActiveClass, setActiveClass,
  listStudents, addStudent, deleteStudent,
} from "../shared/data.js";

const { user, container } = await mountToolShell({
  eyebrow: "35MaktabTools",
  title: `Sinflarni <span>boshqarish</span>`,
  layout: "page",
  width: "wide",
});

container.innerHTML = `
  <p class="section-lead">Har bir sinf o'z mustaqil o'quvchilar ro'yxatiga ega. Bosh sahifada "faol" qilingan sinf — Ism tanlash, Baho kalkulyatori va boshqa barcha tool'larda avtomatik ishlatiladi.</p>

  <div class="card">
    <h2>Yangi sinf</h2>
    <form id="newClassForm">
      <label for="newClassName">Sinf nomi</label>
      <input type="text" id="newClassName" required placeholder="masalan: 5-A">
      <div class="btn-row">
        <button type="submit" class="btn-main">Qo'shish</button>
      </div>
    </form>
  </div>

  <div id="classList"></div>
`;

const classList = document.getElementById('classList');
const newClassForm = document.getElementById('newClassForm');

let classes = [];
let activeClass = null;
let openId = null;
const preselectId = new URLSearchParams(window.location.search).get('classId');

async function loadClasses() {
  classes = await listClasses(user.uid);
  activeClass = await getActiveClass(user.uid);
  renderClasses();
}

function renderClasses() {
  if (classes.length === 0) {
    classList.innerHTML = `<div class="empty-state">Hali birorta sinf yo'q. Yuqoridagi formadan birinchisini qo'sh.</div>`;
    return;
  }

  classList.innerHTML = classes.map(c => `
    <div class="class-card">
      <div class="class-card-head" data-toggle="${c.id}">
        <div class="class-card-name">${c.name}</div>
        <div class="class-card-actions">
          ${activeClass && activeClass.id === c.id
            ? `<span class="badge-active">Faol</span>`
            : `<button class="btn-small" data-activate="${c.id}" type="button">Faol qilish</button>`}
          <button class="btn-small danger" data-delete="${c.id}" type="button">O'chirish</button>
        </div>
      </div>
      <div class="class-body" id="body-${c.id}"></div>
    </div>
  `).join('');

  classList.querySelectorAll('[data-toggle]').forEach(el => {
    el.addEventListener('click', () => toggleClass(el.dataset.toggle));
  });

  classList.querySelectorAll('[data-activate]').forEach(el => {
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = el.dataset.activate;
      const cls = classes.find(c => c.id === id);
      await setActiveClass(user.uid, id, cls.name);
      activeClass = cls;
      renderClasses();
      if (openId) document.getElementById(`body-${openId}`)?.classList.add('open');
    });
  });

  classList.querySelectorAll('[data-delete]').forEach(el => {
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = el.dataset.delete;
      const cls = classes.find(c => c.id === id);
      if (!confirm(`"${cls.name}" sinfini va undagi BARCHA o'quvchilarni o'chirmoqchimisiz? Bu qaytarilmaydi.`)) return;
      await deleteClass(user.uid, id);
      if (openId === id) openId = null;
      await loadClasses();
    });
  });

  // Agar biror sinf ochiq turgan bo'lsa (toggle qilingan), qayta chizilgandan
  // keyin ham ochiq holatini va o'quvchilar ro'yxatini tiklaymiz.
  if (openId && classes.some(c => c.id === openId)) {
    document.getElementById(`body-${openId}`)?.classList.add('open');
    renderStudents(openId);
  }
}

async function toggleClass(classId) {
  if (openId === classId) {
    document.getElementById(`body-${classId}`)?.classList.remove('open');
    openId = null;
    return;
  }
  if (openId) document.getElementById(`body-${openId}`)?.classList.remove('open');
  openId = classId;
  const body = document.getElementById(`body-${classId}`);
  body.classList.add('open');
  body.innerHTML = `<div class="empty-state">Yuklanmoqda...</div>`;
  await renderStudents(classId);
}

async function renderStudents(classId) {
  const body = document.getElementById(`body-${classId}`);
  if (!body) return;
  const students = await listStudents(user.uid, classId);

  body.innerHTML = `
    ${students.length === 0
      ? `<div class="empty-state">Hali o'quvchi yo'q — pastdan qo'shing.</div>`
      : students.map(s => `
          <div class="student-row">
            <span>${s.name}</span>
            <button class="student-remove" data-remove="${s.id}" type="button">&times;</button>
          </div>
        `).join('')}
    <form class="add-student-form" id="addStudentForm">
      <input type="text" id="firstName" placeholder="Ism" required>
      <input type="text" id="lastName" placeholder="Familya">
      <button type="submit" class="btn-small">Qo'shish</button>
    </form>
  `;

  body.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await deleteStudent(user.uid, classId, btn.dataset.remove);
      await renderStudents(classId);
    });
  });

  body.querySelector('#addStudentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstInput = body.querySelector('#firstName');
    const lastInput = body.querySelector('#lastName');
    const first = firstInput.value.trim();
    const last = lastInput.value.trim();
    if (!first) return;
    const fullName = last ? `${first} ${last}` : first;
    await addStudent(user.uid, classId, fullName);
    await renderStudents(classId);
    body.querySelector('#firstName')?.focus();
  });
}

newClassForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('newClassName');
  const name = input.value.trim();
  if (!name) return;
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  // Agar bu birinchi sinf bo'lsa (hali faol sinf tanlanmagan bo'lsa),
  // avtomatik faol qilib qo'yamiz — teacher darhol ishlata boshlaydi.
  const hadNoActiveClass = !activeClass;
  const classId = await createClass(user.uid, name);
  if (hadNoActiveClass) {
    await setActiveClass(user.uid, classId, name);
  }
  input.value = '';
  submitBtn.disabled = false;
  await loadClasses();
  await toggleClass(classId);
});

await loadClasses();

if (preselectId && classes.some(c => c.id === preselectId)) {
  await toggleClass(preselectId);
}
