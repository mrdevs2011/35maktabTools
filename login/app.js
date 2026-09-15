import { auth, db, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged,
  doc, getDoc, setDoc }
  from "../shared/firebase-config.js";

const EMAIL_DOMAIN = "35maktab.uz";
const usernameToEmail = (username) => `${username.toLowerCase()}@${EMAIL_DOMAIN}`;

const nameField = document.getElementById('nameField');
const modeBtns = document.querySelectorAll('.mode-btn');
const submitBtn = document.getElementById('submitBtn');
const form = document.getElementById('authForm');
const errorBox = document.getElementById('errorBox');
let mode = 'signin';

onAuthStateChanged(auth, (user) => {
  if (user) window.location.href = "../index.html";
});

modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    modeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    mode = btn.dataset.mode;
    submitBtn.textContent = mode === 'signin' ? 'Kirish' : "Ro'yxatdan o'tish";
    nameField.style.display = mode === 'signup' ? 'block' : 'none';
    document.getElementById('name').required = mode === 'signup';
    errorBox.style.display = 'none';
  });
});

function showError(message){
  errorBox.textContent = message;
  errorBox.style.display = 'block';
}

function translateError(code){
  switch(code){
    case 'auth/email-already-in-use': return "Bu username allaqachon band. Boshqasini tanlang yoki 'Kirish'ni bosing.";
    case 'auth/invalid-email': return "Username formati noto'g'ri.";
    case 'auth/weak-password': return "Parol juda oddiy — kamida 6 belgi bo'lsin.";
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return "Username yoki parol noto'g'ri.";
    case 'auth/too-many-requests': return "Juda ko'p urinish. Biroz kutib, qayta urinib ko'ring.";
    default: return "Xatolik yuz berdi. Qayta urinib ko'ring.";
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.style.display = 'none';
  submitBtn.disabled = true;

  const usernameRaw = document.getElementById('username').value.trim();
  const username = usernameRaw.toLowerCase();
  const password = document.getElementById('password').value;
  const name = document.getElementById('name').value.trim();

  try {
    if (mode === 'signin') {
      const mapSnap = await getDoc(doc(db, "usernames", username));
      if (!mapSnap.exists()) {
        showError("Username yoki parol noto'g'ri.");
        submitBtn.disabled = false;
        return;
      }
      const email = mapSnap.data().email;
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      if (!name) {
        showError("Ism-familiyani kiriting.");
        submitBtn.disabled = false;
        return;
      }
      const existing = await getDoc(doc(db, "usernames", username));
      if (existing.exists()) {
        showError("Bu username allaqachon band. Boshqasini tanlang.");
        submitBtn.disabled = false;
        return;
      }

      const email = usernameToEmail(username);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await cred.user.getIdToken(true);

      await setDoc(doc(db, "usernames", username), {
        uid: cred.user.uid,
        email
      });
      await setDoc(doc(db, "teachers", cred.user.uid), {
        name,
        username,
        email
      });
    }
    window.location.href = "../index.html";
  } catch (err) {
    showError(translateError(err.code));
    submitBtn.disabled = false;
  }
});
