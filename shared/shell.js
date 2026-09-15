
import { requireAuth, logout } from "./auth.js";
import { getTeacherProfile } from "./data.js";

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

      if (!showBack) {
        try {
          const profile = await getTeacherProfile(user.uid);
          document.getElementById('__mt_userlabel').textContent =
            profile ? profile.name : user.email;
        } catch {
          document.getElementById('__mt_userlabel').textContent = user.email;
        }
      }

      resolve({ user, container: document.getElementById('__mt_app') });
    }, loginPath);
  });
}
