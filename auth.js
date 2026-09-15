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

// loginPath: joriy sahifadan login/index.html'gacha bo'lgan nisbiy yo'l.
// Root'da chaqirsang: "login/index.html"
// ism-tanlash/ ichida chaqirsang: "../login/index.html"

export function requireAuth(onReady, loginPath = "login/index.html") {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = loginPath;
      return;
    }
    onReady(user);
  });
}

export function logout(loginPath = "login/index.html") {
  signOut(auth).then(() => {
    window.location.href = loginPath;
  });
}
