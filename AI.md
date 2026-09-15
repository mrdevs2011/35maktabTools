# AI.md — AI yordamchi uchun qoidalar

Bu fayl **AI agent** (ChatGPT, Claude, Grok, Cursor va h.k.) uchun.
Loyihada o‘zgarish qilishdan oldin shu qoidalarni o‘qing va rioya qiling.

Til: foydalanuvchi bilan **o‘zbek** tilida gaplash; kod izohlari ham o‘zbekcha
yozilishi mumkin (mavjud uslubni saqlang).

---

## 1. Loyiha nima?

**35MaktabTools** — 35-maktab o‘qituvchilari uchun PWA tool to‘plami.

- Har bir tool mustaqil mini-app (`tools/<nom>/`)
- Umumiy qatlam: `shared/` (auth, Firestore, dizayn, shell)
- Backend: **Firebase Auth + Firestore** (offline persistence yoqilgan)
- Hosting: static fayllar (module ES, bundler yo‘q)

Yangi tool qo‘shish: faqat [`HOW_TO_ADD_A_TOOL.md`](./HOW_TO_ADD_A_TOOL.md).

---

## 2. Temir qoidalar (buzilmasin)

### Arxitektura
1. **CSS faqat** `shared/theme.css` da. Boshqa joyda CSS nusxalanmasin.
   - Inline `style="..."` faqat dinamik `display:none` / `display:block` uchun.
   - Vizual stillar (rang, radius, shrift) — class + theme.css.
2. **Yangi tool faqat** `tools/<tool-nomi>/` ichida. Root da tool papkasi yaratilmasin.
3. **data.js orqali** o‘qish/yozish. To‘g‘ridan-to‘g‘ri Firestore chaqiriqlarni
   tool ichida ko‘paytirmang — umumiy funksiyalarni kengaytiring.
4. **Ism faqat** `classes/{classId}/students/{id}` da. Tool o‘z ma’lumotini
   `studentId` bilan bog‘laydi, ism nusxasini saqlamaydi.
5. **firestore.rules** odatda o‘zgarmaydi (wildcard `teachers/{id}/{document=**}`).
6. **index.html** tool ichida: faqat qolip (title + `app.js` module). Style/script yo‘q.
7. `shared/` dagi fayllar **yagona manba** — tool papkasiga nusxa ko‘chirmang.

### JavaScript
- ES modules (`type="module"`). Bundler yo‘q — import yo‘llari to‘g‘ri bo‘lsin.
- Tool `tools/x/` da → `../../shared/...` va `rootPath: "../../"`.
- Block comment (`/* */`) ichida **`*/` ketma-ketligi** bo‘lmasin
  (masalan `tools/*/app.js` yozmang — comment erta yopiladi, SyntaxError).
- Optimistik UI: saqlashda darhol “Saqlandi ✓”, xato bo‘lsa `.catch()` da almashtiring.
  `await` bilan UI ni bloklamang (parol almashtirish kabi xavfsizlik holatlari mustasno).

### Dizayn
- Ranglar: faqat CSS o‘zgaruvchilari (`--gold`, `--coral`, `--bg`, …).
- Fontlar: Space Grotesk (sarlavha/tugma), Inter (matn) — shell o‘zi yuklaydi.
- Mobil: touch-action, 16px input (iOS zoom), safe-area, `100dvh`.
- Yangi UI elementi → avval `theme.css` ga class, keyin HTML.

---

## 3. AI nima qilishi kerak

### Tool qo‘shish / o‘zgartirish
1. `HOW_TO_ADD_A_TOOL.md` dagi 3 qadamni bajaring.
2. `mountToolShell` + `getActiveClass` — faol sinf yo‘q bo‘lsa `no-class-notice`.
3. Registry: `shared/tools-registry.js` (`status: "ready" | "planned"`).
4. Yangi shell asset (html/js) qo‘shsangiz → `sw.js` dagi `PRECACHE` ro‘yxatiga qo‘shing
   va `CACHE_VERSION` ni oshiring (`mt-v3` → `mt-v4`).

### Tezlik va qulaylik
- Ketma-ket `await` o‘rniga mumkin bo‘lsa `Promise.all`.
- Faol sinf: `getActiveClass` / `setActiveClass` sessionStorage keshini ishlatadi — buzmang.
- Sahifa navigatsiyasi: `prefetch()` (`shared/shell.js`) tayyor linklar uchun.
- Auth: `requireAuth` `auth.currentUser` bor bo‘lsa darhol ochadi.
- Klaviatura: tool’da mantiqiy bo‘lsa Space/Enter/R kabi shortcut qo‘shing.
- Baho kabi takroriy kiritish: tezkor chip, Enter, oxirgi tanlovni eslab qolish.

### Stillar
- “Style berilmagan” joy → inline emas, `theme.css` class.
- `select`, `input`, `button` umumiy stillari theme da bor — qayta yozmang.
- `.class-bar select` desktopda `width: auto` — to‘liq kengayib ketmasin.

### PWA / Service Worker
- `sw.js` — app shell offline; Firestore/Auth API **keshlanmaydi**.
- `offline.html` — tarmoq yo‘q fallback.
- `manifest.json` + root/login meta teglar — “Uy ekraniga qo‘shish”.
- SW ro‘yxatdan o‘tish: `index.html`, `login/index.html`, `shell.js` (`ensureServiceWorker`).
- O‘zgarishdan keyin **CACHE_VERSION** ni yangilang, aks holda foydalanuvchi eski keshni ko‘radi.

### Xavfsizlik
- Firebase config ochiq (client) — normal. Rules serverda himoya qiladi.
- Parol/auth amallarini optimistik qilmang; server javobini kuting.
- Foydalanuvchi ma’lumotini boshqa uid ostiga yozish mantiqini qo‘shmang.

---

## 4. AI nima qilmasligi kerak

- `theme.css` dan tashqari katta CSS bloki yoki tool ichida `<style>`.
- localStorage + qo‘lda queue orqali “offline sync” qayta yozish
  (Firestore `persistentLocalCache` ishlatiladi).
- Root ga yangi tool papkasi (`/baho-...` o‘rniga `tools/baho-...`).
- Copyright yoki maxfiy kalitlarni boshqa loyihadan ko‘chirish.
- Comment ichida `*/` qoldirish (`tools/*/...` kabi).
- Butun loyihani React/Vue ga “qayta yozish” taklif qilish (so‘ralmasa).
- `firestore.rules` ni asossiz murakkablashtirish.

---

## 5. Muhim fayllar xaritasi

| Fayl | Vazifa |
|------|--------|
| `shared/theme.css` | Yagona dizayn |
| `shared/shell.js` | Gate, topbar, font, theme, manifest, SW, prefetch |
| `shared/data.js` | Firestore CRUD + faol sinf keshi |
| `shared/auth.js` | requireAuth, logout |
| `shared/firebase-config.js` | Firebase init + offline cache |
| `shared/tools-registry.js` | Tool ro‘yxati (root grid) |
| `shared/icons.js` | SVG ikonkalar |
| `sw.js` | Service Worker (CACHE_VERSION!) |
| `offline.html` | Offline sahifa |
| `manifest.json` | PWA manifest |
| `sinflar/` | Sinf + o‘quvchi boshqaruvi |
| `tools/*/` | Har bir tool |

---

## 6. Tekshiruv ro‘yxati (o‘zgarishdan keyin)

- [ ] `node --check` o‘zgargan `.js` fayllarda xatosiz
- [ ] Yangi UI class lari `theme.css` da
- [ ] Tool yo‘llari (`../../shared`) to‘g‘ri
- [ ] Yangi precache yozuvlari + `CACHE_VERSION` (agar shell o‘zgarsa)
- [ ] Comment ichida `*/` yo‘q
- [ ] Mobil: asosiy tugmalar barmoq bilan bosiladigan o‘lchamda
- [ ] Faol sinf yo‘q holatda tool `no-class-notice` ko‘rsatadi

---

## 7. Qisqa falsafa

> Bir marta `shared/` da yoz — 1000 tool da ishlasin.
> UI sezilarli, tarmoq orqa fonda.
> O‘qituvchi telefonida 3 sekundda ishni boshlasin.

Savol bo‘lsa: avval `README.md`, `HOW_TO_ADD_A_TOOL.md`, keyin shu `AI.md`.
