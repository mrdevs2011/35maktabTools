
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  query,
  orderBy,
  serverTimestamp,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDRpVDAJA9_7E9iqH7sZKJ0u9unvtqlkE4",
  authDomain: "tools-ab491.firebaseapp.com",
  projectId: "tools-ab491",
  storageBucket: "tools-ab491.firebasestorage.app",
  messagingSenderId: "378942462698",
  appId: "1:378942462698:web:4c7b5a99b04db3b085d593",
  measurementId: "G-GZQEJLLE12"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Firestore'ning O'ZINING ichki offline-persistence'i (IndexedDb): setDoc/
// deleteDoc/getDoc chaqirilganda — online bo'lsa serverga, offline bo'lsa
// mahalliy navbatga avtomatik yoziladi va internet qaytganda o'zi
// sinxronlanadi. Ilgari shared/data.js'da BU MANTIQ QO'LDA (localStorage +
// queue) yozilgan edi — u yerda tez ketma-ket yozuvlarda ba'zan navbat
// o'zini-o'zi ustidan bosib, yozuvni yo'qotib qo'yadigan bug bor edi.
// Endi buni Firestore SDK'ning o'ziga topshiramiz — u ancha ko'p sinovdan
// o'tgan, ishonchli.
// persistentMultipleTabManager: o'qituvchi bir nechta tab/oynada ochib
// qo'ysa ham (masalan "Sinflar" va "Baho kalkulyatori" alohida tabda)
// ikkalasi bir xil IndexedDb keshini baham ko'radi, konflikt bo'lmaydi.
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch {
  // Ba'zi muhitlar (masalan qattiq maxfiylik sozlamali brauzer/incognito)
  // IndexedDb'ga ruxsat bermasligi mumkin — bunday holda oddiy (faqat
  // xotiradagi) Firestore'ga tushamiz. Ilova baribir ishlayveradi, faqat
  // offline-kesh bo'lmaydi.
  db = getFirestore(app);
}
export { db };

export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  query,
  orderBy,
  serverTimestamp,
  arrayUnion
};
