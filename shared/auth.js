
import { auth, onAuthStateChanged, signOut } from "./firebase-config.js";

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
