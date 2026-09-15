import { auth, onAuthStateChanged, signOut } from "./firebase-config.js";

export function requireAuth(onReady, loginPath = "login/") {
  // Agar Firebase allaqachon user'ni xotirada bilsa — onAuthStateChanged
  // navbatini kutmasdan darhol davom etamiz (sekin "spinner" yo'qoladi).
  if (auth.currentUser) {
    onReady(auth.currentUser);
    return;
  }

  const unsub = onAuthStateChanged(auth, (user) => {
    unsub();
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
