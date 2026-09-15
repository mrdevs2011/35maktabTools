// app.js — root sahifa. Grid TOOLS ro'yxatidan avtomatik quriladi.
// Yangi tool qo'shish uchun bu faylga TEGINMAYSAN — shared/tools-registry.js'ga qator qo'shasan.
import { mountToolShell } from "./shared/shell.js";
import { TOOLS } from "./shared/tools-registry.js";

const { container } = await mountToolShell({
  eyebrow: "35-maktab uchun",
  title: `35Maktab<span>Tools</span>`,
  layout: "page",
  width: "wide",
  showBack: false,
  showSettings: true,
  sharedPath: "./shared",
  rootPath: "./index.html",
  loginPath: "login/index.html",
  settingsPath: "settings/index.html",
});

const cardsHTML = TOOLS.map(tool => {
  const ready = tool.status === "ready";
  const statusLabel = ready ? "Tayyor" : "Rejada";
  const inner = `
    <div class="tool-status ${ready ? 'ready' : ''}"><span class="dot"></span> ${statusLabel}</div>
    <div class="tool-name">${tool.name}</div>
    <div class="tool-desc">${tool.desc}</div>
  `;
  return ready
    ? `<a class="tool-card" href="${tool.path}">${inner}</a>`
    : `<div class="tool-card disabled">${inner}</div>`;
}).join('');

container.insertAdjacentHTML('beforeend', `
  <p class="lead">Maktab hayotini qulaylashtiradigan mustaqil tool'lar to'plami. Har biri o'z ishini qiladi — bittasini boshqasisiz ham ishlatasan.</p>
  <div class="grid">${cardsHTML}</div>
  <footer>Muhammadrasul tomonidan, 35-maktab uchun.</footer>
`);
