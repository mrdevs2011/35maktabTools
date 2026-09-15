// firebase-config.js
// Barcha tool'lar shu fayldan import qiladi — Firebase ulanish bitta joyda.

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
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp
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
export const db = getFirestore(app);

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
  query,
  orderBy,
  serverTimestamp
};
