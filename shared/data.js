
import {
  db, auth,
  collection, addDoc, getDocs, deleteDoc, doc, getDoc, setDoc, updateDoc,
  writeBatch, query, orderBy, serverTimestamp, arrayUnion
} from "./firebase-config.js";

/* ============================================================
   Bu qatlam endi Firestore'ning O'ZINING offline-persistence'iga
   tayanadi (qarang: firebase-config.js). Ilgarigi qo'lda-yozilgan
   localStorage + orqa fon "queue" tizimi OLIB TASHLANDI — u yerda tez
   ketma-ket yozuvlarda navbat o'zini-o'zi ustidan yozib, ba'zi yozuvlarni
   butunlay yo'qotib qo'yadigan race condition bor edi.

   XULQ O'ZGARISHI (bu funksiyalarni chaqiradigan sahifalar buni bilishi
   kerak): quyidagi funksiyalar endi haqiqiy `await setDoc(...)` qiladi —
   ya'ni Firestore serverga (yoki, offline bo'lsa, mahalliy IndexedDb
   navbatiga) yozuv "qabul qilingunicha" kutadi, ilgarigidek darhol
   qaytmaydi. "Optimistik" UI (tugma bosilgach darhol "Saqlandi ✓"
   ko'rsatish) endi CHAQIRUVCHI TOMONDA: funksiyani await qilmasdan
   chaqirib, natijani/xatoni `.then()/.catch()` bilan orqa fonda kutish
   kerak — bu naqsh allaqachon `sinflar/app.js`, `tools/*/app.js`,
   `settings/app.js` fayllarida qo'llanildi.
   ============================================================ */

function genId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function classesCollection(uid) {
  return collection(db, "teachers", uid, "classes");
}

function studentsCollection(uid, classId) {
  return collection(db, "teachers", uid, "classes", classId, "students");
}

/* ============================================================
   Sinflar
   ============================================================ */

export async function listClasses(uid) {
  const q = query(classesCollection(uid), orderBy("createdAt"));
  const snapshot = await getDocs(q);
  const out = [];
  snapshot.forEach(d => out.push({ id: d.id, name: d.data().name }));
  return out;
}

export async function createClass(uid, name) {
  const id = genId();
  await setDoc(doc(db, "teachers", uid, "classes", id), {
    name,
    createdAt: serverTimestamp(),
  });
  return id;
}

export async function deleteClass(uid, classId) {
  // Cascade o'chirish: sinfning barcha o'quvchilari + sinfning o'zi —
  // bitta batch orqali, hammasi yo hammasi yo'q (atomik).
  const studentsSnap = await getDocs(studentsCollection(uid, classId));
  const batch = writeBatch(db);
  studentsSnap.forEach(d => batch.delete(d.ref));
  batch.delete(doc(db, "teachers", uid, "classes", classId));
  await batch.commit();
}

export async function getActiveClass(uid) {
  const snap = await getDoc(doc(db, "teachers", uid));
  const data = snap.exists() ? snap.data() : {};
  return data.activeClassId
    ? { id: data.activeClassId, name: data.activeClassName || "" }
    : null;
}

export async function setActiveClass(uid, classId, name) {
  await setDoc(
    doc(db, "teachers", uid),
    { activeClassId: classId, activeClassName: name },
    { merge: true }
  );
}

/* ============================================================
   O'quvchilar
   ============================================================ */

export async function listStudents(uid, classId) {
  const q = query(studentsCollection(uid, classId), orderBy("createdAt"));
  const snapshot = await getDocs(q);
  const out = [];
  snapshot.forEach(d => out.push({ id: d.id, name: d.data().name }));
  return out;
}

export async function addStudent(uid, classId, name) {
  const id = genId();
  await setDoc(doc(db, "teachers", uid, "classes", classId, "students", id), {
    name,
    createdAt: serverTimestamp(),
  });
  return id;
}

export async function deleteStudent(uid, classId, studentId) {
  await deleteDoc(doc(db, "teachers", uid, "classes", classId, "students", studentId));
}

export async function replaceStudents(uid, classId, names) {
  // Eski ro'yxatni o'chirish + yangisini yozish — bitta batch'da (atomik),
  // shuning uchun tarmoq o'rtada uzilib qolsa ham "yarim o'chgan, yarim
  // yozilgan" holat bo'lmaydi.
  const snapshot = await getDocs(studentsCollection(uid, classId));
  const batch = writeBatch(db);
  snapshot.forEach(d => batch.delete(d.ref));

  const newList = names.map(name => ({ id: genId(), name }));
  newList.forEach(s => {
    batch.set(doc(db, "teachers", uid, "classes", classId, "students", s.id), {
      name: s.name,
      createdAt: serverTimestamp(),
    });
  });

  await batch.commit();
  return newList;
}

/* ============================================================
   Tool-xos hujjatlar (bitta qavatli, studentId bilan bog'langan)
   ============================================================ */

export async function setToolDoc(uid, toolCollection, docId, data) {
  await setDoc(doc(db, "teachers", uid, toolCollection, docId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getToolDoc(uid, toolCollection, docId) {
  const snap = await getDoc(doc(db, "teachers", uid, toolCollection, docId));
  return snap.exists() ? snap.data() : null;
}

export async function listToolDocs(uid, toolCollection, orderField = null) {
  const col = collection(db, "teachers", uid, toolCollection);
  const q = orderField ? query(col, orderBy(orderField)) : col;
  const snapshot = await getDocs(q);
  const out = [];
  snapshot.forEach(docSnap => out.push({ id: docSnap.id, ...docSnap.data() }));
  return out;
}

// Arrayga bitta qiymat qo'shadi. setDoc(..., {merge:true}) + arrayUnion
// ishlatilgani uchun hujjat mavjud bo'lmasa ham avtomatik yaratiladi.
export async function addToToolArray(uid, toolCollection, docId, field, value) {
  const ref = doc(db, "teachers", uid, toolCollection, docId);
  await setDoc(
    ref,
    { [field]: arrayUnion(value), updatedAt: serverTimestamp() },
    { merge: true }
  );
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : { [field]: [value] };
}

/* ============================================================
   Tool-xos hujjatlar (ko'p qavatli, nested)
   ============================================================ */

export async function setNestedDoc(uid, segments, data) {
  await setDoc(doc(db, "teachers", uid, ...segments), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getNestedDoc(uid, segments) {
  const snap = await getDoc(doc(db, "teachers", uid, ...segments));
  return snap.exists() ? snap.data() : null;
}

export async function listNestedCollection(uid, segments, orderField = null) {
  const col = collection(db, "teachers", uid, ...segments);
  const q = orderField ? query(col, orderBy(orderField)) : col;
  const snapshot = await getDocs(q);
  const out = [];
  snapshot.forEach(docSnap => out.push({ id: docSnap.id, ...docSnap.data() }));
  return out;
}

export async function deleteNestedDoc(uid, segments) {
  await deleteDoc(doc(db, "teachers", uid, ...segments));
}

/* ============================================================
   O'qituvchi profili (settings sahifasi)
   ============================================================ */

export async function getTeacherProfile(uid) {
  const snap = await getDoc(doc(db, "teachers", uid));
  return snap.exists() ? snap.data() : null;
}

export async function updateTeacherProfile(uid, data) {
  await setDoc(doc(db, "teachers", uid), data, { merge: true });
  return data;
}

export { auth };
