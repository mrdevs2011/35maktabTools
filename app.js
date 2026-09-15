import { mountToolShell, prefetch } from "./shared/shell.js";
import { TOOLS } from "./shared/tools-registry.js";
import {
  listClasses, createClass, deleteClass, getActiveClass, setActiveClass,
  listStudents, addStudent, deleteStudent,
} from "./shared/data.js";
import { icon } from "./shared/icons.js";

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

let [classes, activeClass] = await Promise.all([
  listClasses(user.uid),
  getActiveClass(user.uid),
]);
let studentsByClass = {};
let openId = null;

const initialTab = (location.hash === "#class" || location.hash === "#sinf") ? "class" : "tools";

container.innerHTML = `
  <div class="dash-tabs" role="tablist">
    <button type="button" class="dash-tab ${initialTab === "tools" ? "active" : ""}" data-tab="tools" role="tab">
      ${icon("shuffle", 16)} Tool'lar
    </button>
    <button type="button" class="dash-tab ${initialTab === "class" ? "active" : ""}" data-tab="class" role="tab">
      ${icon("users", 16)} Sinf
    </button>
  </div>

  <div class="dash-panel ${initialTab === "tools" ? "active" : ""}" id="panel-tools" role="tabpanel">
    <p class="lead">Faol sinfni tanlang, keyin tool'ni oching. O'quvchilar <strong>Sinf</strong> tabida boshqariladi.</p>

    <div class="card class-bar">
      <span class="class-label">Faol sinf:</span>
      <select id="classSelect" ${classes.length === 0 ? "disabled" : ""}></select>
      <button class="btn-ghost" id="gotoClassTab" type="button">Sinfni boshqarish →</button>
    </div>

    <div class="grid" id="toolsGrid"></div>
  </div>

  <div class="dash-panel ${initialTab === "class" ? "active" : ""}" id="panel-class" role="tabpanel">
    <p class="section-lead">Har bir sinf o'z o'quvchilar ro'yxatiga ega. <strong>Faol</strong> qilingan sinf — Ism tanlash va boshqa tool'larda ishlatiladi.</p>

    <div class="card">
      <h2>Yangi sinf</h2>
      <form id="newClassForm">
        <label for="newClassName">Sinf nomi</label>
        <input type="text" id="newClassName" required placeholder="masalan: 5-A" autocomplete="off">
        <div class="btn-row">
          <button type="submit" class="btn-main">${icon("plus", 16)} Qo'shish</button>
        </div>
      </form>
    </div>

    <div id="classList"></div>
  </div>

  <footer>Muhammadrasul tomonidan, 35-maktab uchun.</footer>
`;

const classSelect = document.getElementById("classSelect");
const toolsGrid = document.getElementById("toolsGrid");
const classList = document.getElementById("classList");
const newClassForm = document.getElementById("newClassForm");

function setTab(tab) {
  document.querySelectorAll(".dash-tab").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  document.querySelectorAll(".dash-panel").forEach((p) => {
    p.classList.toggle("active", p.id === `panel-${tab}`);
  });
  history.replaceState(null, "", tab === "class" ? "#class" : "#tools");
  if (tab === "class") renderClasses();
}

document.querySelectorAll(".dash-tab").forEach((btn) => {
  btn.addEventListener("click", () => setTab(btn.dataset.tab));
});
document.getElementById("gotoClassTab").addEventListener("click", () => setTab("class"));

function fillClassSelect() {
  if (classes.length === 0) {
    classSelect.innerHTML = `<option value="">Hali sinf yo'q</option>`;
    classSelect.disabled = true;
    return;
  }
  classSelect.disabled = false;
  classSelect.innerHTML = classes
    .map(
      (c) =>
        `<option value="${c.id}" ${activeClass && activeClass.id === c.id ? "selected" : ""}>${c.name}</option>`
    )
    .join("");
}

function renderTools() {
  const ready = TOOLS.filter((t) => t.status === "ready");
  if (ready.length === 0) {
    toolsGrid.innerHTML = `<div class="empty-state">Hali tool yo'q.</div>`;
    return;
  }
  toolsGrid.innerHTML = ready
    .map(
      (tool) => `
    <a class="tool-card" href="${tool.path}">
      <div class="tool-status ready"><span class="dot"></span> Tayyor</div>
      <div class="tool-name">${tool.name}</div>
      <div class="tool-desc">${tool.desc}</div>
    </a>`
    )
    .join("");

  ready.forEach((t) => prefetch(t.path));
  toolsGrid.querySelectorAll(".tool-card[href]").forEach((a) => {
    a.addEventListener("pointerenter", () => prefetch(a.getAttribute("href")), { once: true });
  });
}

function renderClasses() {
  if (classes.length === 0) {
    classList.innerHTML = `<div class="empty-state">Hali birorta sinf yo'q. Yuqoridagi formadan birinchisini qo'shing.</div>`;
    return;
  }

  classList.innerHTML = classes
    .map(
      (c) => `
    <div class="class-card">
      <div class="class-card-head" data-toggle="${c.id}">
        <div class="class-card-name">${icon("chevronDown", 16)} ${c.name}</div>
        <div class="class-card-actions">
          ${
            activeClass && activeClass.id === c.id
              ? `<span class="badge-active">${icon("check", 12)} Faol</span>`
              : `<button class="btn-small" data-activate="${c.id}" type="button">${icon("check", 13)} Faol qilish</button>`
          }
          <button class="btn-small danger" data-delete="${c.id}" type="button" aria-label="Sinfni o'chirish">${icon("trash", 13)}</button>
        </div>
      </div>
      <div class="class-body ${openId === c.id ? "open" : ""}" id="body-${c.id}"></div>
    </div>`
    )
    .join("");

  classList.querySelectorAll("[data-toggle]").forEach((el) => {
    el.addEventListener("click", () => toggleClass(el.dataset.toggle));
    if (openId === el.dataset.toggle) el.classList.add("is-open");
  });

  classList.querySelectorAll("[data-activate]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = el.dataset.activate;
      const cls = classes.find((c) => c.id === id);
      activeClass = cls;
      setActiveClass(user.uid, id, cls.name).catch((err) => {
        alert("Faol sinfni saqlab bo'lmadi: " + err.message);
      });
      fillClassSelect();
      renderClasses();
    });
  });

  classList.querySelectorAll("[data-delete]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = el.dataset.delete;
      const cls = classes.find((c) => c.id === id);
      if (!confirm(`"${cls.name}" sinfini va undagi BARCHA o'quvchilarni o'chirmoqchimisiz? Bu qaytarilmaydi.`)) return;
      classes = classes.filter((c) => c.id !== id);
      delete studentsByClass[id];
      if (openId === id) openId = null;
      if (activeClass && activeClass.id === id) activeClass = null;
      deleteClass(user.uid, id).catch((err) => {
        alert("Sinfni o'chirib bo'lmadi: " + err.message);
      });
      fillClassSelect();
      renderClasses();
    });
  });

  if (openId && classes.some((c) => c.id === openId)) {
    renderStudents(openId);
  }
}

async function toggleClass(classId) {
  if (openId === classId) {
    document.getElementById(`body-${classId}`)?.classList.remove("open");
    document.querySelector(`[data-toggle="${classId}"]`)?.classList.remove("is-open");
    openId = null;
    return;
  }
  if (openId) {
    document.getElementById(`body-${openId}`)?.classList.remove("open");
    document.querySelector(`[data-toggle="${openId}"]`)?.classList.remove("is-open");
  }
  openId = classId;
  const body = document.getElementById(`body-${classId}`);
  body?.classList.add("open");
  document.querySelector(`[data-toggle="${classId}"]`)?.classList.add("is-open");

  if (!studentsByClass[classId]) {
    if (body) body.innerHTML = `<div class="empty-state">Yuklanmoqda...</div>`;
    studentsByClass[classId] = await listStudents(user.uid, classId);
  }
  renderStudents(classId);
}

function renderStudents(classId) {
  const body = document.getElementById(`body-${classId}`);
  if (!body) return;
  const students = studentsByClass[classId] || [];

  body.innerHTML = `
    ${
      students.length === 0
        ? `<div class="empty-state">Hali o'quvchi yo'q — pastdan qo'shing.</div>`
        : students
            .map(
              (s, i) => `
          <div class="student-row">
            <span><span class="student-num">${i + 1}.</span> ${s.name}</span>
            <button class="student-remove" data-remove="${s.id}" type="button" aria-label="O'chirish">${icon("close", 15)}</button>
          </div>`
            )
            .join("")
    }
    <form class="add-student-form" id="addStudentForm-${classId}">
      <input type="text" id="firstName-${classId}" placeholder="Ism" required autocomplete="off">
      <input type="text" id="lastName-${classId}" placeholder="Familya" autocomplete="off">
      <button type="submit" class="btn-small">${icon("plus", 13)} Qo'shish</button>
    </form>
  `;

  body.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.remove;
      studentsByClass[classId] = studentsByClass[classId].filter((s) => s.id !== id);
      deleteStudent(user.uid, classId, id).catch((err) => {
        alert("O'quvchini o'chirib bo'lmadi: " + err.message);
      });
      renderStudents(classId);
    });
  });

  body.querySelector(`#addStudentForm-${classId}`).addEventListener("submit", (e) => {
    e.preventDefault();
    const firstInput = body.querySelector(`#firstName-${classId}`);
    const lastInput = body.querySelector(`#lastName-${classId}`);
    const first = firstInput.value.trim();
    const last = lastInput.value.trim();
    if (!first) return;
    const fullName = last ? `${first} ${last}` : first;

    addStudent(user.uid, classId, fullName)
      .then((id) => {
        studentsByClass[classId] = [...(studentsByClass[classId] || []), { id, name: fullName }];
        renderStudents(classId);
        body.querySelector(`#firstName-${classId}`)?.focus();
      })
      .catch((err) => {
        alert("O'quvchini saqlab bo'lmadi: " + err.message);
      });
  });
}

classSelect.addEventListener("change", (e) => {
  const classId = e.target.value;
  if (!classId) return;
  const cls = classes.find((c) => c.id === classId);
  activeClass = cls;
  setActiveClass(user.uid, classId, cls.name);
  if (document.getElementById("panel-class").classList.contains("active")) {
    renderClasses();
  }
});

newClassForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("newClassName");
  const name = input.value.trim();
  if (!name) return;

  try {
    const hadNoActive = !activeClass;
    const classId = await createClass(user.uid, name);
    if (hadNoActive) {
      activeClass = { id: classId, name };
      await setActiveClass(user.uid, classId, name);
    }
    classes = [...classes, { id: classId, name }];
    input.value = "";
    fillClassSelect();
    renderClasses();
    await toggleClass(classId);
  } catch (err) {
    alert("Yangi sinf yaratib bo'lmadi: " + err.message);
  }
});

fillClassSelect();
renderTools();
if (initialTab === "class") renderClasses();

const preselectId = new URLSearchParams(window.location.search).get("classId");
if (preselectId && classes.some((c) => c.id === preselectId)) {
  setTab("class");
  openId = null;
  await toggleClass(preselectId);
}
