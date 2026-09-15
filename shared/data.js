
import {
  db, auth,
  collection, addDoc, getDocs, deleteDoc, doc, getDoc, setDoc, updateDoc,
  query, orderBy, serverTimestamp, arrayUnion
} from "./firebase-config.js";

function classesCollection(uid) {
  return collection(db, "teachers", uid, "classes");
}

function studentsCollection(uid, classId) {
  return collection(db, "teachers", uid, "classes", classId, "students");
}

export async function listClasses(uid) {
  const q = query(classesCollection(uid), orderBy("createdAt"));
  const snapshot = await getDocs(q);
  const classes = [];
  snapshot.forEach(docSnap => classes.push({ id: docSnap.id, name: docSnap.data().name }));
  return classes;
}

export async function createClass(uid, name) {
  const ref = await addDoc(classesCollection(uid), { name, createdAt: serverTimestamp() });
  return ref.id;
}

export async function deleteClass(uid, classId) {
  const studentsSnap = await getDocs(studentsCollection(uid, classId));
  await Promise.all(
    studentsSnap.docs.map(docSnap =>
      deleteDoc(doc(db, "teachers", uid, "classes", classId, "students", docSnap.id)))
  );
  await deleteDoc(doc(db, "teachers", uid, "classes", classId));
}

export async function getActiveClass(uid) {
  const snap = await getDoc(doc(db, "teachers", uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (!data.activeClassId) return null;
  return { id: data.activeClassId, name: data.activeClassName || "" };
}

export async function setActiveClass(uid, classId, name) {
  await setDoc(doc(db, "teachers", uid), { activeClassId: classId, activeClassName: name }, { merge: true });
}

export async function listStudents(uid, classId) {
  const q = query(studentsCollection(uid, classId), orderBy("createdAt"));
  const snapshot = await getDocs(q);
  const students = [];
  snapshot.forEach(docSnap => students.push({ id: docSnap.id, name: docSnap.data().name }));
  return students;
}

export async function addStudent(uid, classId, name) {
  await addDoc(studentsCollection(uid, classId), { name, createdAt: serverTimestamp() });
}

export async function deleteStudent(uid, classId, studentId) {
  await deleteDoc(doc(db, "teachers", uid, "classes", classId, "students", studentId));
}

export async function replaceStudents(uid, classId, names) {
  const snapshot = await getDocs(studentsCollection(uid, classId));
  await Promise.all(
    snapshot.docs.map(docSnap => deleteDoc(doc(db, "teachers", uid, "classes", classId, "students", docSnap.id)))
  );
  await Promise.all(
    names.map(name => addDoc(studentsCollection(uid, classId), { name, createdAt: serverTimestamp() }))
  );
}

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

export async function addToToolArray(uid, toolCollection, docId, field, value) {
  await updateDoc(doc(db, "teachers", uid, toolCollection, docId), {
    [field]: arrayUnion(value),
    updatedAt: serverTimestamp(),
  });
}

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

export { auth };
