
import { auth, onAuthStateChanged, signOut } from "./firebase-config.js";

export function requireAuth(onReady, loginPath = "login/") {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = loginPath;
      return;
    }
    onReady(user);
  });
}

export function logout(loginPath = "login/") {
  signOut(auth).then(() => {
    window.location.href = loginPath;
  });
}
