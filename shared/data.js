
import {
  db, auth,
  collection, addDoc, getDocs, deleteDoc, doc, getDoc, setDoc, updateDoc,
  query, orderBy, serverTimestamp, arrayUnion
} from "./firebase-config.js";

/* ============================================================
   LOCAL-FIRST QATLAM
   Qoida: har qanday yozuv (create/update/delete) DARHOL localStorage'ga
   tushadi va chaqiruvchiga darhol qaytadi — Firestore yozuvi orqa fonda
   navbat (queue) orqali ketadi. Agar tarmoq/Firestore ishlamasa, yozuv
   navbatda qoladi va localStorage'dagi nusxa yo'qolmaydi — keyingi
   'online' hodisasida yoki sahifa qayta ochilganda avtomatik qayta
   urinadi. Hech qanday tugma Firestore javobini kutib turmaydi.
   ============================================================ */

const LS_PREFIX = "mt_";
const QUEUE_KEY = "queue";
let queueFlushing = false;

function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
  } catch {
    // localStorage to'lgan yoki private-mode — jim o'tamiz, Firestore
    // yozuvi baribir navbatga tushib, orqa fonda davom etadi.
  }
}

function lsRemove(key) {
  try { localStorage.removeItem(LS_PREFIX + key); } catch {}
}

function genId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function readQueue() { return lsGet(QUEUE_KEY, []); }
function writeQueue(queue) { lsSet(QUEUE_KEY, queue); }

// Berilgan Firestore yo'lda hali orqa fonda kutayotgan (sync bo'lmagan)
// yozuv bor-yo'qligini tekshiradi — bor bo'lsa, serverdan kelgan (eski)
// natija localStorage'dagi optimistik nusxani ustidan bosib yubormasligi
// kerak.
function isPending(pathSegments) {
  const target = pathSegments.join("/");
  return readQueue().some(op => Array.isArray(op.path) && op.path.join("/") === target);
}

function backgroundWrite(op) {
  const queue = readQueue();
  queue.push({ ...op, _id: genId() });
  writeQueue(queue);
  flushQueue();
}

async function execOp(op) {
  switch (op.kind) {
    case "set": {
      const data = op.timestamp ? { ...op.data, updatedAt: serverTimestamp() } : op.data;
      await setDoc(doc(db, ...op.path), data, op.merge ? { merge: true } : {});
      break;
    }
    case "delete":
      await deleteDoc(doc(db, ...op.path));
      break;
    case "arrayUnionSet": {
      const data = { [op.field]: arrayUnion(op.value) };
      if (op.timestamp) data.updatedAt = serverTimestamp();
      await setDoc(doc(db, ...op.path), data, { merge: true });
      break;
    }
    case "deleteClassCascade": {
      const studentsSnap = await getDocs(studentsCollection(op.uid, op.classId));
      await Promise.all(
        studentsSnap.docs.map(d =>
          deleteDoc(doc(db, "teachers", op.uid, "classes", op.classId, "students", d.id)))
      );
      await deleteDoc(doc(db, "teachers", op.uid, "classes", op.classId));
      break;
    }
    case "replaceStudents": {
      const snapshot = await getDocs(studentsCollection(op.uid, op.classId));
      await Promise.all(
        snapshot.docs.map(d =>
          deleteDoc(doc(db, "teachers", op.uid, "classes", op.classId, "students", d.id)))
      );
      await Promise.all(
        op.names.map(s =>
          setDoc(doc(db, "teachers", op.uid, "classes", op.classId, "students", s.id),
            { name: s.name, createdAt: serverTimestamp() }))
      );
      break;
    }
  }
}

// permission-denied / unauthenticated — bular tarmoq muammosi emas, qayta
// urinib ko'rish befoyda (rules doim rad etadi). Bunday yozuvni queue'da
// abadiy saqlamasdan, "stuck" ro'yxatiga o'tkazamiz va foydalanuvchiga
// signal beramiz — aks holda "Saqlandi ✓" ko'rsatilib, ma'lumot hech qachon
// serverga bormaydi va hech kim buni bilmaydi.
const FATAL_ERROR_CODES = new Set(["permission-denied", "unauthenticated", "invalid-argument"]);

export async function flushQueue() {
  if (queueFlushing) return;
  queueFlushing = true;
  const queue = readQueue();
  const remaining = [];
  const stuck = lsGet("stuck", []);
  for (const op of queue) {
    try {
      await execOp(op);
    } catch (err) {
      if (FATAL_ERROR_CODES.has(err?.code)) {
        stuck.push({ ...op, _failedAt: Date.now(), _error: err.code });
      } else {
        remaining.push(op);
      }
    }
  }
  lsSet("stuck", stuck);
  writeQueue(remaining);
  queueFlushing = false;
  if (remaining.length && typeof window !== "undefined") {
    // Vaqtincha muammo (tarmoq/server) — 15 soniyadan keyin yana urinamiz.
    setTimeout(flushQueue, 15000);
  }
  if (typeof window !== "undefined" && stuck.length) {
    window.dispatchEvent(new CustomEvent("mt-sync-stuck", { detail: { count: stuck.length } }));
  }
}

export function getPendingSyncCount() {
  return readQueue().length;
}

// Rules/permission sababli hech qachon serverga bormaydigan yozuvlar soni.
// UI bularni ko'rsatib, foydalanuvchini ogohlantirishi kerak — bular
// "keyinroq o'zi tuzaladigan" holat emas.
export function getStuckSyncCount() {
  return lsGet("stuck", []).length;
}

if (typeof window !== "undefined") {
  window.addEventListener("online", flushQueue);
  window.addEventListener("load", flushQueue);
  flushQueue();
}

/* ============================================================
   Cache key'lar
   ============================================================ */
const classesKey = uid => `classes_${uid}`;
const studentsKey = (uid, classId) => `students_${uid}_${classId}`;
const activeClassKey = uid => `activeClass_${uid}`;
const toolDocKey = (uid, col, docId) => `tooldoc_${uid}_${col}_${docId}`;
const nestedKey = (uid, segments) => `nested_${uid}_${segments.join("_")}`;
const profileKey = uid => `profile_${uid}`;

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
  try {
    const q = query(classesCollection(uid), orderBy("createdAt"));
    const snapshot = await getDocs(q);
    let fetched = [];
    snapshot.forEach(d => fetched.push({ id: d.id, name: d.data().name }));

    const queue = readQueue();
    // hali orqa fonda o'chirilayotgan sinflarni serverdan kelgan ro'yxatdan olib tashlaymiz
    fetched = fetched.filter(c => !queue.some(op => op.kind === "deleteClassCascade" && op.classId === c.id));
    // hali serverga yetib bormagan (navbatda turgan) yangi sinflarni saqlab qolamiz
    const fetchedIds = new Set(fetched.map(c => c.id));
    const cached = lsGet(classesKey(uid), []);
    const pendingNew = cached.filter(c =>
      !fetchedIds.has(c.id) && isPending(["teachers", uid, "classes", c.id]));

    const merged = [...fetched, ...pendingNew];
    lsSet(classesKey(uid), merged);
    return merged;
  } catch {
    return lsGet(classesKey(uid), []);
  }
}

export async function createClass(uid, name) {
  const id = genId();
  const list = lsGet(classesKey(uid), []);
  list.push({ id, name });
  lsSet(classesKey(uid), list);

  backgroundWrite({
    kind: "set",
    path: ["teachers", uid, "classes", id],
    data: { name },
    merge: false,
    timestamp: true, // createdAt sifatida yoziladi
  });

  return id;
}

export async function deleteClass(uid, classId) {
  const list = lsGet(classesKey(uid), []).filter(c => c.id !== classId);
  lsSet(classesKey(uid), list);
  lsRemove(studentsKey(uid, classId));

  backgroundWrite({ kind: "deleteClassCascade", uid, classId });
}

export async function getActiveClass(uid) {
  const path = ["teachers", uid];
  try {
    const snap = await getDoc(doc(db, ...path));
    const data = snap.exists() ? snap.data() : {};
    const result = data.activeClassId ? { id: data.activeClassId, name: data.activeClassName || "" } : null;

    if (isPending(path)) {
      // hali fon rejimida yozilmagan — local (optimistik) qiymatga ishonamiz
      return lsGet(activeClassKey(uid), result);
    }
    lsSet(activeClassKey(uid), result);
    return result;
  } catch {
    return lsGet(activeClassKey(uid), null);
  }
}

export async function setActiveClass(uid, classId, name) {
  lsSet(activeClassKey(uid), { id: classId, name });

  backgroundWrite({
    kind: "set",
    path: ["teachers", uid],
    data: { activeClassId: classId, activeClassName: name },
    merge: true,
    timestamp: false,
  });
}

/* ============================================================
   O'quvchilar
   ============================================================ */

export async function listStudents(uid, classId) {
  try {
    const q = query(studentsCollection(uid, classId), orderBy("createdAt"));
    const snapshot = await getDocs(q);
    let fetched = [];
    snapshot.forEach(d => fetched.push({ id: d.id, name: d.data().name }));

    const queue = readQueue();
    const studentPathPrefix = `teachers/${uid}/classes/${classId}/students/`;
    fetched = fetched.filter(s =>
      !queue.some(op => op.kind === "delete" && Array.isArray(op.path) && op.path.join("/") === studentPathPrefix + s.id));

    const fetchedIds = new Set(fetched.map(s => s.id));
    const cached = lsGet(studentsKey(uid, classId), []);
    const pendingNew = cached.filter(s =>
      !fetchedIds.has(s.id) && isPending(["teachers", uid, "classes", classId, "students", s.id]));

    const merged = [...fetched, ...pendingNew];
    lsSet(studentsKey(uid, classId), merged);
    return merged;
  } catch {
    return lsGet(studentsKey(uid, classId), []);
  }
}

export async function addStudent(uid, classId, name) {
  const id = genId();
  const list = lsGet(studentsKey(uid, classId), []);
  list.push({ id, name });
  lsSet(studentsKey(uid, classId), list);

  backgroundWrite({
    kind: "set",
    path: ["teachers", uid, "classes", classId, "students", id],
    data: { name },
    merge: false,
    timestamp: true,
  });

  return id;
}

export async function deleteStudent(uid, classId, studentId) {
  const list = lsGet(studentsKey(uid, classId), []).filter(s => s.id !== studentId);
  lsSet(studentsKey(uid, classId), list);

  backgroundWrite({
    kind: "delete",
    path: ["teachers", uid, "classes", classId, "students", studentId],
  });
}

export async function replaceStudents(uid, classId, names) {
  const newList = names.map(name => ({ id: genId(), name }));
  lsSet(studentsKey(uid, classId), newList);

  backgroundWrite({ kind: "replaceStudents", uid, classId, names: newList });
  return newList;
}

/* ============================================================
   Tool-xos hujjatlar (bitta qavatli, studentId bilan bog'langan)
   ============================================================ */

export async function setToolDoc(uid, toolCollection, docId, data) {
  lsSet(toolDocKey(uid, toolCollection, docId), data);

  backgroundWrite({
    kind: "set",
    path: ["teachers", uid, toolCollection, docId],
    data,
    merge: false,
    timestamp: true,
  });
}

export async function getToolDoc(uid, toolCollection, docId) {
  const path = ["teachers", uid, toolCollection, docId];
  try {
    const snap = await getDoc(doc(db, ...path));
    const result = snap.exists() ? snap.data() : null;

    if (isPending(path)) {
      return lsGet(toolDocKey(uid, toolCollection, docId), result);
    }
    lsSet(toolDocKey(uid, toolCollection, docId), result);
    return result;
  } catch {
    return lsGet(toolDocKey(uid, toolCollection, docId), null);
  }
}

export async function listToolDocs(uid, toolCollection, orderField = null) {
  try {
    const col = collection(db, "teachers", uid, toolCollection);
    const q = orderField ? query(col, orderBy(orderField)) : col;
    const snapshot = await getDocs(q);
    const out = [];
    snapshot.forEach(docSnap => out.push({ id: docSnap.id, ...docSnap.data() }));
    return out;
  } catch {
    return [];
  }
}

// Arrayga bitta qiymat qo'shadi. setDoc(..., {merge:true}) + arrayUnion
// ishlatilgani uchun hujjat mavjud bo'lmasa ham avtomatik yaratiladi —
// avval getToolDoc bilan "bor-yo'qligini" tekshirish shart emas.
export async function addToToolArray(uid, toolCollection, docId, field, value) {
  const key = toolDocKey(uid, toolCollection, docId);
  const current = lsGet(key, {}) || {};
  const arr = Array.isArray(current[field]) ? current[field] : [];
  const updated = { ...current, [field]: [...arr, value] };
  lsSet(key, updated);

  backgroundWrite({
    kind: "arrayUnionSet",
    path: ["teachers", uid, toolCollection, docId],
    field,
    value,
    timestamp: true,
  });

  return updated;
}

/* ============================================================
   Tool-xos hujjatlar (ko'p qavatli, nested)
   ============================================================ */

export async function setNestedDoc(uid, segments, data) {
  lsSet(nestedKey(uid, segments), data);

  backgroundWrite({
    kind: "set",
    path: ["teachers", uid, ...segments],
    data,
    merge: false,
    timestamp: true,
  });
}

export async function getNestedDoc(uid, segments) {
  const path = ["teachers", uid, ...segments];
  try {
    const snap = await getDoc(doc(db, ...path));
    const result = snap.exists() ? snap.data() : null;

    if (isPending(path)) {
      return lsGet(nestedKey(uid, segments), result);
    }
    lsSet(nestedKey(uid, segments), result);
    return result;
  } catch {
    return lsGet(nestedKey(uid, segments), null);
  }
}

export async function listNestedCollection(uid, segments, orderField = null) {
  try {
    const col = collection(db, "teachers", uid, ...segments);
    const q = orderField ? query(col, orderBy(orderField)) : col;
    const snapshot = await getDocs(q);
    const out = [];
    snapshot.forEach(docSnap => out.push({ id: docSnap.id, ...docSnap.data() }));
    return out;
  } catch {
    return [];
  }
}

export async function deleteNestedDoc(uid, segments) {
  lsRemove(nestedKey(uid, segments));
  backgroundWrite({ kind: "delete", path: ["teachers", uid, ...segments] });
}

/* ============================================================
   O'qituvchi profili (settings sahifasi)
   ============================================================ */

export async function getTeacherProfile(uid) {
  const path = ["teachers", uid];
  try {
    const snap = await getDoc(doc(db, ...path));
    const result = snap.exists() ? snap.data() : null;
    if (isPending(path)) {
      return lsGet(profileKey(uid), result);
    }
    lsSet(profileKey(uid), result);
    return result;
  } catch {
    return lsGet(profileKey(uid), null);
  }
}

export async function updateTeacherProfile(uid, data) {
  const current = lsGet(profileKey(uid), {}) || {};
  const updated = { ...current, ...data };
  lsSet(profileKey(uid), updated);

  backgroundWrite({
    kind: "set",
    path: ["teachers", uid],
    data,
    merge: true,
    timestamp: false,
  });

  return updated;
}

export { auth };
