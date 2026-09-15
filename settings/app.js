import { mountToolShell } from "../shared/shell.js";
import {
  auth, db, doc, getDoc, updateDoc, setDoc,
  updatePassword, reauthenticateWithCredential, EmailAuthProvider
} from "../shared/firebase-config.js";

const { user, container } = await mountToolShell({
  eyebrow: "35MaktabTools",
  title: "Sozlamalar",
  layout: "page",
  rootPath: "../index.html",
});

container.innerHTML = `
  <p class="section-lead">Profilingiz va hisob xavfsizligi shu yerda.</p>

  <div class="card">
    <h2>Profil</h2>
    <form id="profileForm">
      <label for="name">Ism-familiya</label>
      <input type="text" id="name" required placeholder="Aziza Karimova">

      <label for="username">Username</label>
      <input type="text" id="username" disabled>
      <div class="hint">Username hozircha o'zgartirib bo'lmaydi.</div>

      <button type="submit" class="submit" id="profileSubmit">Saqlash</button>
      <div class="msg" id="profileMsg"></div>
    </form>
  </div>

  <div class="card">
    <h2>Parolni almashtirish</h2>
    <form id="passwordForm">
      <label for="currentPassword">Joriy parol</label>
      <input type="password" id="currentPassword" required>

      <label for="newPassword">Yangi parol</label>
      <input type="password" id="newPassword" required minlength="6" placeholder="kamida 6 belgi">

      <label for="confirmPassword">Yangi parolni tasdiqlang</label>
      <input type="password" id="confirmPassword" required minlength="6">

      <button type="submit" class="submit" id="passwordSubmit">Parolni yangilash</button>
      <div class="msg" id="passwordMsg"></div>
    </form>
  </div>
`;

const nameInput = document.getElementById('name');
const usernameInput = document.getElementById('username');
const profileForm = document.getElementById('profileForm');
const profileSubmit = document.getElementById('profileSubmit');
const profileMsg = document.getElementById('profileMsg');

const passwordForm = document.getElementById('passwordForm');
const passwordSubmit = document.getElementById('passwordSubmit');
const passwordMsg = document.getElementById('passwordMsg');

const profileSnap = await getDoc(doc(db, "teachers", user.uid));
if (profileSnap.exists()) {
  const data = profileSnap.data();
  nameInput.value = data.name || '';
  usernameInput.value = data.username || '';
}

function showMsg(el, text, type){
  el.textContent = text;
  el.className = `msg ${type}`;
  el.style.display = 'block';
}

profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  profileMsg.style.display = 'none';
  profileSubmit.disabled = true;

  const name = nameInput.value.trim();
  if (!name) {
    showMsg(profileMsg, "Ism bo'sh bo'lishi mumkin emas.", 'error');
    profileSubmit.disabled = false;
    return;
  }

  try {
    await setDoc(doc(db, "teachers", user.uid), { name }, { merge: true });
    showMsg(profileMsg, "Saqlandi.", 'success');
  } catch (err) {
    showMsg(profileMsg, "Xatolik yuz berdi. Qayta urinib ko'ring.", 'error');
  } finally {
    profileSubmit.disabled = false;
  }
});

passwordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  passwordMsg.style.display = 'none';

  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (newPassword !== confirmPassword) {
    showMsg(passwordMsg, "Yangi parollar mos kelmadi.", 'error');
    return;
  }

  passwordSubmit.disabled = true;
  try {
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
    showMsg(passwordMsg, "Parol muvaffaqiyatli yangilandi.", 'success');
    passwordForm.reset();
  } catch (err) {
    const message = err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
      ? "Joriy parol noto'g'ri."
      : "Xatolik yuz berdi. Qayta urinib ko'ring.";
    showMsg(passwordMsg, message, 'error');
  } finally {
    passwordSubmit.disabled = false;
  }
});
