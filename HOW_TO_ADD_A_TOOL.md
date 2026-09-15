# Yangi tool qo'shish — 3 qadam, har doim shu

Bu loyiha shunday qurilganki, 1-chi tool ham, 100000-chi tool ham
**bir xil 3 qadam** bilan qo'shiladi. Arxitektura o'zgarmaydi.

**MUHIM QOIDA:** har qanday yangi tool **FAQAT `tools/` papkasi ichida**
yaratiladi (`tools/tool-nomi/`), root darajasida EMAS. Sabab: root darajasi
`login/`, `settings/`, `sinflar/` kabi core (tool bo'lmagan) sahifalar uchun
band. Agar tool'lar ham root'ga tashlansa, ertaga core feature nomi bilan
(masalan "students", "sinflar", "settings") to'qnashib qolish xavfi bor —
`tools/` bitta joyga izolyatsiya qilingani shu muammoni butunlay yo'q qiladi.

## Qadam 1 — Papka va 2 fayl

```
tools/tool-nomi/
├── index.html   ← har doim shu qolipda, faqat <title> o'zgaradi:

<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tool Nomi — 35MaktabTools</title>
</head>
<body>
<script type="module" src="./app.js"></script>
</body>
</html>

└── app.js      ← FAQAT shu tool'ning logikasi
```

**Qoida:** `index.html` ichida `<style>` yoki inline `<script>` YOZILMAYDI.
Faqat yuqoridagi qolip. Har qanday CSS/JS bu qoidani buzsa — arxitektura
buzilgan deb hisoblanadi.

## Qadam 2 — app.js shablon

`tools/tool-nomi/` — root'dan **2 qavat** pastda (`tool-nomi/` emas,
`tools/tool-nomi/`), shuning uchun `mountToolShell`ga yo'llarni albatta
qo'lda ko'rsat — default qiymatlar (`../shared` va h.k.) 1 qavat uchun
mo'ljallangan, 2 qavatda ishlamaydi:

```js
import { mountToolShell } from "../../shared/shell.js";
import { getActiveClass, listStudents, /* kerakli data.js funksiyalari */ } from "../../shared/data.js";

const { user, container } = await mountToolShell({
  eyebrow: "Kategoriya nomi",
  title: `Tool <span>Nomi</span>`,
  sharedPath: "../../shared",
  rootPath: "../../index.html",
  loginPath: "../../login/index.html",
});

container.innerHTML = `...faqat shu tool'ning HTML'i...`;

// ...faqat shu tool'ning logikasi, DOM handlerlar, Firestore chaqiruvlari...
```

`mountToolShell` gate/topbar/auth/CSS/font — hammasini o'zi qiladi.
Sen faqat `container` ichiga o'z UI'ingni qo'yasan.

## Qadam 3 — Registry'ga 1 qator

`shared/tools-registry.js` ichiga:

```js
{
  path: "tools/tool-nomi/index.html",
  name: "Tool Nomi",
  desc: "Bir jumlada nima qilishi.",
  status: "ready",
},
```

Root sahifa (`index.html`) shu ro'yxatdan avtomatik grid quradi.
`index.html`/`app.js`ga (root) **hech qachon qo'lda tegilmaydi**.

---

## Ma'lumot saqlash qoidasi (buzilmaydigan yagona qoida)

- O'quvchi **ismi** kerakmi? → avval `getActiveClass(uid)` bilan hozirgi faol
  sinfni ol (root sahifada tanlangan), keyin `listStudents(uid, activeClass.id)`.
  Faol sinf `null` bo'lishi mumkin (hali tanlanmagan) — bu holatni albatta
  UI'da ko'rsat ("Avval sinf tanlang" + bosh sahifaga link), aks holda tool
  jim-jit ishlamay qoladi. Hech qachon ismni o'z collection'ingda qayta saqlama.
- Tool'ga xos **bitta qavatli** narsa (baho, davomat, ...) kerakmi? → o'z
  collection'ing, lekin **studentId bilan bog'la**, ism bilan emas:
  `setToolDoc(uid, "mening-collectionim", studentId, {...})`.
- Tool'ga xos **ko'p qavatli** narsa kerakmi (masalan jadval:
  kun → dars → topshiriq)? → `setNestedDoc(uid, ["jadval", "dushanba", "lessons", "l1"], {...})`
  va shu oilaning `getNestedDoc` / `listNestedCollection` / `deleteNestedDoc`
  funksiyalari. Chuqurlik nechta qavat bo'lishidan qat'iy nazar ishlaydi.
- Array'ga qo'shish kerakmi (ballar, loglar)? → `addToToolArray(...)`,
  hech qachon butun arrayni qayta o'qib-yozma.

**Firestore rules HECH QACHON tahrirlanmaydi.** `firestore.rules`dagi
`teachers/{teacherId}/{document=**}` qoidasi `teachers/{uid}` ostidagi
har qanday collection'ni, har qanday chuqurlikda, avtomatik himoyalaydi.
Yagona shart — `data.js` orqali yozish (u hech qachon `teachers/{uid}`dan
tashqariga chiqmaydi). To'g'ridan-to'g'ri `doc()`/`collection()` chaqirib,
`shared/data.js`ni chetlab o'tish — TAQIQLANADI, chunki shunda kimdir
yo'lni xato yozib, boshqa o'qituvchining ma'lumotiga tegishi mumkin.

Shu savollarga javob bergach — kod yozishga tayyorsan. Boshqa arxitektura
qarori qabul qilinmaydi, chunki hammasi allaqachon hal qilingan.
