// shell.js — har bir tool sahifasi shu faylni chaqiradi, boshqa hech narsa emas.
// Gate, topbar, auth-guard, fontlar — hammasi shu yerda, BITTA joyda.
// Yangi tool yozayotganda: shu funksiyani chaqir, keyin faqat o'zingning
// ichki UI'ingni <div id="app"></div> ichiga qo'y.

import { auth, db, doc, getDoc } from "./firebase-config.js";
import { requireAuth, logout } from "./auth.js";

const FONT_LINK_ID = "__mt_fonts";

function ensureFonts(){
  if (document.getElementById(FONT_LINK_ID)) return;
  const preconnect = document.createElement('link');
  preconnect.rel = "preconnect";
  preconnect.href = "https://fonts.googleapis.com";
  document.head.appendChild(preconnect);

  const font = document.createElement('link');
  font.id = FONT_LINK_ID;
  font.rel = "stylesheet";
  font.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap";
  document.head.appendChild(font);
}

function ensureTheme(sharedPath){
  if (document.getElementById('__mt_theme')) return;
  const link = document.createElement('link');
  link.id = '__mt_theme';
  link.rel = "stylesheet";
  link.href = `${sharedPath}/theme.css`;
  document.head.appendChild(link);

  const favicon = document.createElement('link');
  favicon.rel = "icon";
  favicon.type = "image/png";
  favicon.href = `${sharedPath}/../assets/favicon.png`;
  document.head.appendChild(favicon);
}

/**
 * mountToolShell — har bir himoyalangan sahifaning kirish nuqtasi.
 *
 * @param {Object} opts
 * @param {string} opts.eyebrow      - kichik sarlavha ustidagi label
 * @param {string} opts.title        - h1 matni (oddiy matn yoki HTML, masalan "Ism <span>Roulette</span>")
 * @param {"center"|"page"} [opts.layout="center"] - body layout turi
 * @param {"wide"|""} [opts.width=""] - .wrap kengligi
 * @param {boolean} [opts.showBack=true]   - "← Barcha tool'lar" havolasi
 * @param {boolean} [opts.showSettings=false] - "Sozlamalar" tugmasi (faqat root sahifada true)
 * @param {string} [opts.sharedPath="../shared"] - shared/ papkasiga nisbiy yo'l
 * @param {string} [opts.rootPath="../index.html"] - orqaga qaytish yo'li
 * @param {string} [opts.loginPath="../login/index.html"]
 * @param {string} [opts.settingsPath="../settings/index.html"]
 *
 * @returns {Promise<{user, container: HTMLElement}>}
 *   `container` — o'zingning tool UI'ingni shu elementga qo'y (innerHTML yoki append orqali).
 */
export function mountToolShell(opts = {}) {
  const {
    eyebrow = "",
    title = "",
    layout = "center",
    width = "",
    showBack = true,
    showSettings = false,
    sharedPath = "../shared",
    rootPath = "../index.html",
    loginPath = "../login/index.html",
    settingsPath = "../settings/index.html",
  } = opts;

  ensureFonts();
  ensureTheme(sharedPath);
  document.body.classList.add(layout === "page" ? "layout-page" : "layout-center");

  document.body.insertAdjacentHTML('afterbegin', `
    <div class="gate" id="__mt_gate">Tekshirilmoqda...</div>
    <div class="wrap ${width}" id="__mt_wrap">
      <div class="topbar">
        ${showBack ? `<a class="back-link" href="${rootPath}">&larr; Barcha tool'lar</a>` : `<span id="__mt_userlabel"></span>`}
        <div class="topbar-right">
          ${showSettings ? `<a class="settings-btn" href="${settingsPath}">Sozlamalar</a>` : ``}
          <button class="logout-btn" id="__mt_logout">Chiqish</button>
        </div>
      </div>
      ${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ``}
      ${title ? `<h1>${title}</h1>` : ``}
      <div id="__mt_app"></div>
    </div>
  `);

  document.getElementById('__mt_logout')
    .addEventListener('click', () => logout(loginPath));

  return new Promise((resolve) => {
    requireAuth(async (user) => {
      document.getElementById('__mt_gate').style.display = 'none';
      document.getElementById('__mt_wrap').style.display = 'block';

      // showBack=false bo'lgan sahifalarda (root) foydalanuvchi ismini ko'rsatamiz
      if (!showBack) {
        try {
          const profileSnap = await getDoc(doc(db, "teachers", user.uid));
          document.getElementById('__mt_userlabel').textContent =
            profileSnap.exists() ? profileSnap.data().name : user.email;
        } catch {
          document.getElementById('__mt_userlabel').textContent = user.email;
        }
      }

      resolve({ user, container: document.getElementById('__mt_app') });
    }, loginPath);
  });
}
