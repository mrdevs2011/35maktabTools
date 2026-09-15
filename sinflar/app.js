import { mountToolShell } from "../shared/shell.js";
import {
  listClasses, createClass, deleteClass, getActiveClass, setActiveClass,
  listStudents, addStudent, deleteStudent,
} from "../shared/data.js";
import { icon } from "../shared/icons.js";

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
        <button type="submit" class="btn-main">${icon('plus', 16)} Qo'shish</button>
      </div>
    </form>
  </div>

  <div id="classList"></div>
`;

const classList = document.getElementById('classList');
const newClassForm = document.getElementById('newClassForm');

// Boshlang'ich yuklash — bu yagona joy qayerda haqiqatan Firestore/keshdan
// kutamiz, chunki hali qo'lda hech narsa qilinmagan.
let classes = await listClasses(user.uid);
let activeClass = await getActiveClass(user.uid);
let studentsByClass = {}; // classId -> student[] — sahifa davomida xotirada saqlanadi
let openId = null;
const preselectId = new URLSearchParams(window.location.search).get('classId');

function renderClasses() {
  if (classes.length === 0) {
    classList.innerHTML = `<div class="empty-state">Hali birorta sinf yo'q. Yuqoridagi formadan birinchisini qo'sh.</div>`;
    return;
  }

  classList.innerHTML = classes.map(c => `
    <div class="class-card ${openId === c.id ? 'open' : ''}">
      <div class="class-card-head" data-toggle="${c.id}">
        <div class="class-card-name">${icon('chevronDown', 16)} ${c.name}</div>
        <div class="class-card-actions">
          ${activeClass && activeClass.id === c.id
            ? `<span class="badge-active">${icon('check', 12)} Faol</span>`
            : `<button class="btn-small" data-activate="${c.id}" type="button">${icon('check', 13)} Faol qilish</button>`}
          <button class="btn-small danger" data-delete="${c.id}" type="button" aria-label="Sinfni o'chirish">${icon('trash', 13)}</button>
        </div>
      </div>
      <div class="class-body" id="body-${c.id}"></div>
    </div>
  `).join('');

  classList.querySelectorAll('[data-toggle]').forEach(el => {
    el.addEventListener('click', () => toggleClass(el.dataset.toggle));
  });

  classList.querySelectorAll('[data-activate]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.dataset.activate;
      const cls = classes.find(c => c.id === id);
      // Darhol UI: "Faol" belgisi shu zahoti shu tugma ustida ko'chadi.
      activeClass = cls;
      setActiveClass(user.uid, id, cls.name).catch(err => {
        alert("Faol sinfni saqlab bo'lmadi: " + err.message);
      });
      renderClasses();
      if (openId) document.getElementById(`body-${openId}`)?.classList.add('open');
    });
  });

  classList.querySelectorAll('[data-delete]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.dataset.delete;
      const cls = classes.find(c => c.id === id);
      if (!confirm(`"${cls.name}" sinfini va undagi BARCHA o'quvchilarni o'chirmoqchimisiz? Bu qaytarilmaydi.`)) return;

      // Darhol ro'yxatdan olib tashlaymiz — Firestore'dagi cascade o'chirish orqa fonda ketadi.
      classes = classes.filter(c => c.id !== id);
      delete studentsByClass[id];
      if (openId === id) openId = null;
      deleteClass(user.uid, id).catch(err => {
        alert("Sinfni o'chirib bo'lmadi: " + err.message);
      });
      renderClasses();
    });
  });

  if (openId && classes.some(c => c.id === openId)) {
    document.getElementById(`body-${openId}`)?.classList.add('open');
    document.querySelector(`[data-toggle="${openId}"]`)?.classList.add('is-open');
    renderStudents(openId);
  }
}

async function toggleClass(classId) {
  if (openId === classId) {
    document.getElementById(`body-${classId}`)?.classList.remove('open');
    document.querySelector(`[data-toggle="${classId}"]`)?.classList.remove('is-open');
    openId = null;
    return;
  }
  if (openId) {
    document.getElementById(`body-${openId}`)?.classList.remove('open');
    document.querySelector(`[data-toggle="${openId}"]`)?.classList.remove('is-open');
  }
  openId = classId;
  const body = document.getElementById(`body-${classId}`);
  body.classList.add('open');
  document.querySelector(`[data-toggle="${classId}"]`)?.classList.add('is-open');

  if (!studentsByClass[classId]) {
    body.innerHTML = `<div class="empty-state">Yuklanmoqda...</div>`;
    studentsByClass[classId] = await listStudents(user.uid, classId);
  }
  renderStudents(classId);
}

function renderStudents(classId) {
  const body = document.getElementById(`body-${classId}`);
  if (!body) return;
  const students = studentsByClass[classId] || [];

  body.innerHTML = `
    ${students.length === 0
      ? `<div class="empty-state">Hali o'quvchi yo'q — pastdan qo'shing.</div>`
      : students.map((s, i) => `
          <div class="student-row">
            <span><span class="student-num">${i + 1}.</span> ${s.name}</span>
            <button class="student-remove" data-remove="${s.id}" type="button" aria-label="O'chirish">${icon('close', 15)}</button>
          </div>
        `).join('')}
    <form class="add-student-form" id="addStudentForm">
      <input type="text" id="firstName" placeholder="Ism" required>
      <input type="text" id="lastName" placeholder="Familya">
      <button type="submit" class="btn-small">${icon('plus', 13)} Qo'shish</button>
    </form>
  `;

  body.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.remove;
      // Darhol ro'yxatdan olib tashlaymiz, orqa fonda Firestore'dan ham o'chadi.
      studentsByClass[classId] = studentsByClass[classId].filter(s => s.id !== id);
      deleteStudent(user.uid, classId, id).catch(err => {
        alert("O'quvchini o'chirib bo'lmadi: " + err.message);
      });
      renderStudents(classId);
    });
  });

  body.querySelector('#addStudentForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const firstInput = body.querySelector('#firstName');
    const lastInput = body.querySelector('#lastName');
    const first = firstInput.value.trim();
    const last = lastInput.value.trim();
    if (!first) return;
    const fullName = last ? `${first} ${last}` : first;

    // Darhol ro'yxatga qo'shamiz va qayta chizamiz — addStudent() Firestore
    // javobini kutmaydi, id localStorage'ga yozilgach shu zahoti qaytadi.
    addStudent(user.uid, classId, fullName).then((id) => {
      studentsByClass[classId] = [...(studentsByClass[classId] || []), { id, name: fullName }];
      renderStudents(classId);
      body.querySelector('#firstName')?.focus();
    }).catch(err => {
      alert("O'quvchini saqlab bo'lmadi: " + err.message);
    });
  });
}

newClassForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('newClassName');
  const name = input.value.trim();
  if (!name) return;

  let classId;
  try {
    const hadNoActiveClass = !activeClass;
    classId = await createClass(user.uid, name);
    if (hadNoActiveClass) {
      activeClass = { id: classId, name };
      await setActiveClass(user.uid, classId, name);
    }
  } catch (err) {
    alert("Yangi sinf yaratib bo'lmadi: " + err.message);
    return;
  }

  classes = [...classes, { id: classId, name }];
  input.value = '';
  renderClasses();
  await toggleClass(classId);
});

renderClasses();

if (preselectId && classes.some(c => c.id === preselectId)) {
  await toggleClass(preselectId);
}
