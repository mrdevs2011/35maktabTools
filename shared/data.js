// data.js — YAGONA umumiy ma'lumot qatlami. Roadmap'dagi "A vs B" savoliga javob: A.
//
// QOIDA (hech qachon buzilmaydi, 1 tool bo'lsa ham 100000 tool bo'lsa ham):
//   1. O'quvchi RO'YXATI (ism, familiya) — FAQAT shu yerda, teachers/{uid}/students.
//   2. Har bir tool o'zining qo'shimcha ma'lumotini (baho, davomat, ...) o'z
//      collection'ida saqlaydi, LEKIN ismni emas — studentId'ni bog'laydi.
//      Sabab: ism o'zgarsa (imlo xatosi tuzatilsa), faqat 1 joyda tuzatiladi,
//      va barcha tool'lardagi tarixiy yozuvlar avtomatik to'g'ri bo'lib qoladi.
//   3. Yangi tool yozayotganda o'zingdan so'ra: "bu ma'lumot studentId bilan
//      bog'liqmi?" — ha bo'lsa, shu fayldagi funksiyalardan foydalan, o'z
//      "students" nusxangni yaratma.

import {
  db, auth,
  collection, addDoc, getDocs, deleteDoc, doc, getDoc, setDoc, updateDoc,
  query, orderBy, serverTimestamp, arrayUnion
} from "./firebase-config.js";

// ---------------------------------------------------------------------------
// SINFLAR (classes) — har bir o'qituvchi bir nechta sinfga ega bo'lishi mumkin,
// har birining O'Z mustaqil o'quvchilar ro'yxati bor:
//   teachers/{uid}/classes/{classId}                     -> { name, createdAt }
//   teachers/{uid}/classes/{classId}/students/{id}        -> { name, createdAt }
// "Faol sinf" (root sahifada tanlangan) teachers/{uid} profilida saqlanadi —
// shuning uchun BARCHA tool'lar (ism-tanlash, baho-kalkulyatori, ...) hech
// narsa so'ramasdan bir xil "hozirgi sinf"ni ko'radi.
// ---------------------------------------------------------------------------

function classesCollection(uid) {
  return collection(db, "teachers", uid, "classes");
}

function studentsCollection(uid, classId) {
  return collection(db, "teachers", uid, "classes", classId, "students");
}

/** Barcha sinflar ro'yxati. @returns {Promise<Array<{id:string, name:string}>>} */
export async function listClasses(uid) {
  const q = query(classesCollection(uid), orderBy("createdAt"));
  const snapshot = await getDocs(q);
  const classes = [];
  snapshot.forEach(docSnap => classes.push({ id: docSnap.id, name: docSnap.data().name }));
  return classes;
}

/** Yangi sinf yaratadi. @returns {Promise<string>} yangi sinfning ID'si */
export async function createClass(uid, name) {
  const ref = await addDoc(classesCollection(uid), { name, createdAt: serverTimestamp() });
  return ref.id;
}

/** Sinfni VA undagi barcha o'quvchilarni o'chiradi. Qaytarib bo'lmaydi. */
export async function deleteClass(uid, classId) {
  const studentsSnap = await getDocs(studentsCollection(uid, classId));
  await Promise.all(
    studentsSnap.docs.map(docSnap =>
      deleteDoc(doc(db, "teachers", uid, "classes", classId, "students", docSnap.id)))
  );
  await deleteDoc(doc(db, "teachers", uid, "classes", classId));
}

/** Hozir "faol" (root sahifada tanlangan) sinfni o'qiydi.
 *  @returns {Promise<{id:string, name:string}|null>} hech narsa tanlanmagan bo'lsa null
 */
export async function getActiveClass(uid) {
  const snap = await getDoc(doc(db, "teachers", uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (!data.activeClassId) return null;
  return { id: data.activeClassId, name: data.activeClassName || "" };
}

/** Sinfni "faol" deb belgilaydi — shundan keyin BARCHA tool'lar shu sinfning
 *  o'quvchilar ro'yxatidan avtomatik foydalanadi. */
export async function setActiveClass(uid, classId, name) {
  await updateDoc(doc(db, "teachers", uid), { activeClassId: classId, activeClassName: name });
}

/** Bitta sinfning o'quvchilar ro'yxatini o'qiydi. Har doim createdAt bo'yicha tartiblangan.
 *  @returns {Promise<Array<{id: string, name: string}>>}
 */
export async function listStudents(uid, classId) {
  const q = query(studentsCollection(uid, classId), orderBy("createdAt"));
  const snapshot = await getDocs(q);
  const students = [];
  snapshot.forEach(docSnap => students.push({ id: docSnap.id, name: docSnap.data().name }));
  return students;
}

/** Sinfga bitta o'quvchi qo'shadi (ism+familya birlashtirilib "name" sifatida saqlanadi). */
export async function addStudent(uid, classId, name) {
  await addDoc(studentsCollection(uid, classId), { name, createdAt: serverTimestamp() });
}

/** Sinfdan bitta o'quvchini o'chiradi. */
export async function deleteStudent(uid, classId, studentId) {
  await deleteDoc(doc(db, "teachers", uid, "classes", classId, "students", studentId));
}

/** Sinfning butun ro'yxatini almashtiradi (eskilarini o'chirib, yangisini yozadi).
 *  Kichik ro'yxatlar (bitta sinf, ~30-40 ism) uchun bu yetarli sodda strategiya.
 *  @param {string[]} names
 */
export async function replaceStudents(uid, classId, names) {
  const snapshot = await getDocs(studentsCollection(uid, classId));
  await Promise.all(
    snapshot.docs.map(docSnap => deleteDoc(doc(db, "teachers", uid, "classes", classId, "students", docSnap.id)))
  );
  await Promise.all(
    names.map(name => addDoc(studentsCollection(uid, classId), { name, createdAt: serverTimestamp() }))
  );
}

/** Bitta tool-xos hujjatni sanaga yoki boshqa kalitga bog'lab saqlaydi.
 *  Masalan: davomat tracker -> setToolDoc(uid, "attendance", "2026-09-15", {records: {...}})
 *  Bu setDoc (overwrite) ishlatadi — bir xil kalit bilan qayta yozish xavfsiz,
 *  addDoc kabi dublikat yaratmaydi.
 */
export async function setToolDoc(uid, toolCollection, docId, data) {
  await setDoc(doc(db, "teachers", uid, toolCollection, docId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Bitta tool-xos hujjatni o'qiydi. Topilmasa null qaytaradi. */
export async function getToolDoc(uid, toolCollection, docId) {
  const snap = await getDoc(doc(db, "teachers", uid, toolCollection, docId));
  return snap.exists() ? snap.data() : null;
}

/** Tool-xos collection'ning barcha hujjatlarini o'qiydi (masalan barcha kunlar). */
export async function listToolDocs(uid, toolCollection, orderField = null) {
  const col = collection(db, "teachers", uid, toolCollection);
  const q = orderField ? query(col, orderBy(orderField)) : col;
  const snapshot = await getDocs(q);
  const out = [];
  snapshot.forEach(docSnap => out.push({ id: docSnap.id, ...docSnap.data() }));
  return out;
}

/** Tool-xos hujjatdagi array maydoniga bitta qiymat qo'shadi, butun
 *  arrayni qayta yozmasdan (Firestore arrayUnion). Masalan:
 *  addToToolArray(uid, "grades", studentId, "scores", 87)
 */
export async function addToToolArray(uid, toolCollection, docId, field, value) {
  await updateDoc(doc(db, "teachers", uid, toolCollection, docId), {
    [field]: arrayUnion(value),
    updatedAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// CHUQUR (NESTED) YO'LLAR — jadval kabi ko'p qavatli tool'lar uchun.
// Firestore rules "teachers/{teacherId}/{document=**}" bilan cheksiz
// chuqurlikni allaqachon qamragan — shuning uchun bu funksiyalar QANDAY
// chuqurlik bo'lishidan qat'iy nazar ishlaydi, rules'ga hech qachon
// qaytilmaydi. `segments` — toolCollection'dan keyingi yo'l bo'laklari.
//
// Masalan: teachers/{uid}/jadval/dushanba/lessons/l1
//   -> setNestedDoc(uid, ["jadval", "dushanba", "lessons", "l1"], {...})
// ---------------------------------------------------------------------------

/** Har qanday chuqurlikdagi hujjatni yozadi/almashtiradi (setDoc, merge emas). */
export async function setNestedDoc(uid, segments, data) {
  await setDoc(doc(db, "teachers", uid, ...segments), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Har qanday chuqurlikdagi hujjatni o'qiydi. Topilmasa null. */
export async function getNestedDoc(uid, segments) {
  const snap = await getDoc(doc(db, "teachers", uid, ...segments));
  return snap.exists() ? snap.data() : null;
}

/** Har qanday chuqurlikdagi collection'ning barcha hujjatlarini o'qiydi. */
export async function listNestedCollection(uid, segments, orderField = null) {
  const col = collection(db, "teachers", uid, ...segments);
  const q = orderField ? query(col, orderBy(orderField)) : col;
  const snapshot = await getDocs(q);
  const out = [];
  snapshot.forEach(docSnap => out.push({ id: docSnap.id, ...docSnap.data() }));
  return out;
}

/** Har qanday chuqurlikdagi hujjatni o'chiradi. */
export async function deleteNestedDoc(uid, segments) {
  await deleteDoc(doc(db, "teachers", uid, ...segments));
}

export { auth };
