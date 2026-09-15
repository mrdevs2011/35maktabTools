// auth.js
// Har bir sahifa shu faylni import qilib, login holatini tekshiradi.
//
// Ishlatish (har bir himoyalangan sahifada):
//
//   import { requireAuth, logout } from "../auth.js"; // yoki "./auth.js" root uchun
//
//   requireAuth((user) => {
//     // shu yerda user.uid bilan Firestore so'rovlarini yoz
//   });

import { auth, onAuthStateChanged, signOut } from "./firebase-config.js";

// loginPath: joriy sahifadan login.html'gacha bo'lgan nisbiy yo'l.
// Root'da chaqirsang: "login.html"
// ism-tanlash/ ichida chaqirsang: "../login.html"

export function requireAuth(onReady, loginPath = "login.html") {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = loginPath;
      return;
    }
    onReady(user);
  });
}

export function logout(loginPath = "login.html") {
  signOut(auth).then(() => {
    window.location.href = loginPath;
  });
}
