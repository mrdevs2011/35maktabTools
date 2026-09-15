
import { requireAuth } from "./auth.js";
import { getTeacherProfile } from "./data.js";
import { icon } from "./icons.js";

const FONT_LINK_ID = "__mt_fonts";

/** Service Worker — offline shell + keyingi ochilishni tezlashtirish. */
function ensureServiceWorker(rootPath = "./") {
  if (!("serviceWorker" in navigator)) return;
  const base = rootPath.endsWith("/") ? rootPath : rootPath + "/";
  let swUrl;
  try {
    swUrl = new URL("sw.js", new URL(base, location.href)).href;
  } catch {
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(swUrl, { scope: new URL(base, location.href).href }).catch(() => {});
  });
}

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

// PWA/native-app signallari: manifest + apple/android meta'lar. Bularsiz
// brauzer "Uy ekraniga qo'shish"ni taklif qilmaydi va status-bar rangi
// standart oq/kulrang bo'lib qoladi — native emas, veb-sahifa ko'rinishida.
function ensureNativeMeta(rootPath, sharedPath){
  if (document.getElementById('__mt_manifest')) return;

  const manifest = document.createElement('link');
  manifest.id = '__mt_manifest';
  manifest.rel = "manifest";
  manifest.href = `${rootPath}manifest.json`;
  document.head.appendChild(manifest);

  const appleIcon = document.createElement('link');
  appleIcon.rel = "apple-touch-icon";
  appleIcon.href = `${sharedPath}/../assets/icon-192.png`;
  document.head.appendChild(appleIcon);

  const metas = [
    ["theme-color", "#14172B"],
    ["apple-mobile-web-app-capable", "yes"],
    ["mobile-web-app-capable", "yes"],
    ["apple-mobile-web-app-status-bar-style", "black-translucent"],
    ["apple-mobile-web-app-title", "35Maktab"],
  ];
  metas.forEach(([name, content]) => {
    const m = document.createElement('meta');
    m.name = name;
    m.content = content;
    document.head.appendChild(m);
  });

  // viewport'ga viewport-fit=cover — safe-area-inset-* (notch/home-indicator)
  // ishlashi uchun shart. index.html'dagi statik tegni to'ldiramiz, almashtiramiz.
  let viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    viewport = document.createElement('meta');
    viewport.name = "viewport";
    document.head.appendChild(viewport);
  }
  viewport.content = "width=device-width, initial-scale=1.0, viewport-fit=cover";
}

/** Keyingi sahifani brauzer keshiga oldindan yuklaydi — hover/focus'da chaqiriladi. */
export function prefetch(url) {
  if (!url || document.querySelector(`link[rel="prefetch"][href="${url}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  document.head.appendChild(link);
}

export function mountToolShell(opts = {}) {
  const {
    eyebrow = "",
    title = "",
    layout = "center",
    width = "",
    showBack = true,
    showSettings = false,
    sharedPath = "../shared",
    rootPath = "../",
    loginPath = "../login/",
    settingsPath = "../settings/",
  } = opts;

  ensureFonts();
  ensureTheme(sharedPath);
  ensureNativeMeta(rootPath, sharedPath);
  ensureServiceWorker(rootPath);
  document.body.classList.add(layout === "page" ? "layout-page" : "layout-center");

  document.body.insertAdjacentHTML('afterbegin', `
    <div class="gate" id="__mt_gate"><span class="spinner"></span></div>
    <div class="wrap ${width}" id="__mt_wrap">
      <div class="topbar">
        ${showBack ? `<a class="back-link" href="${rootPath}">${icon('back', 16)} Barcha tool'lar</a>` : `<span id="__mt_userlabel"></span>`}
        <div class="topbar-right">
          ${showSettings ? `<a class="settings-btn" href="${settingsPath}">${icon('settings', 15)} Sozlamalar</a>` : ``}
        </div>
      </div>
      ${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ``}
      ${title ? `<h1>${title}</h1>` : ``}
      <div id="__mt_app"></div>
    </div>
  `);

  if (showBack) prefetch(rootPath);
  if (showSettings) prefetch(settingsPath);

  return new Promise((resolve) => {
    requireAuth((user) => {
      document.getElementById('__mt_gate').style.display = 'none';
      document.getElementById('__mt_wrap').style.display = 'block';

      if (!showBack) {
        // Profil nomi UI'ni bloklamaydi — avval email, keyin ism keladi
        const labelEl = document.getElementById('__mt_userlabel');
        labelEl.textContent = user.email || '';
        getTeacherProfile(user.uid).then(profile => {
          if (profile?.name) labelEl.textContent = profile.name;
        }).catch(() => {});
      }

      resolve({ user, container: document.getElementById('__mt_app') });
    }, loginPath);
  });
}
