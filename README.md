# 35MaktabTools

35-maktab o'qituvchilari uchun qulay tool'lar to'plami. Har bir tool o'z
papkasida — mustaqil mini-app, lekin barchasi umumiy auth, dizayn va
Firestore qatlami orqali ishlaydi: har bir o'qituvchi o'z hisobiga kiradi,
o'z ma'lumotlarini ko'radi.

**Yangi tool qo'shmoqchimisiz? → [`HOW_TO_ADD_A_TOOL.md`](./HOW_TO_ADD_A_TOOL.md)ni o'qing.**
3 qadam, har doim bir xil — 1-chi tool ham, 1000-chi tool ham.

**AI yordamchi (Cursor/ChatGPT/Grok) uchun qoidalar → [`AI.md`](./AI.md).**
Arxitektura, stillar, PWA/SW, nima qilish/qilmaslik — hammasi shu yerda.

## Tool'lar

| Tool | Papka | Holat |
|---|---|---|
| Ism tanlash | [`tools/ism-tanlash/`](./tools/ism-tanlash) | ✅ Tayyor |
| Baho kalkulyatori | [`tools/baho-kalkulyatori/`](./tools/baho-kalkulyatori) | ✅ Tayyor |
| Davomat tracker | `davomat-tracker/` | 🔜 Rejada |
| Jadval generator | `jadval-generator/` | 🔜 Rejada |

(Bu jadval qo'lda yangilanadi hujjatlash uchun — haqiqiy manba
`shared/tools-registry.js`, root sahifa shu yerdan quriladi.)

## Struktura

```
35MaktabTools/
├── shared/                    ← YAGONA umumiy qatlam, hech qachon nusxalanmaydi
│   ├── theme.css              ← butun loyihaning dizayni (rang, shrift, tugma...)
│   ├── shell.js                ← gate + topbar + auth-guard, har bir sahifa shu orqali kiradi
│   ├── data.js                  ← umumiy students ro'yxati + tool-xos hujjat funksiyalari
│   ├── firebase-config.js
│   ├── auth.js
│   └── tools-registry.js       ← YAGONA joy yangi tool qo'shilganda tahrirlanadi
├── firestore.rules             ← generic qoida, yangi tool uchun qayta yozilmaydi
├── index.html + app.js         ← root, registry'dan grid quradi
├── login/                      ← auth talab qilmaydigan yagona sahifa
├── settings/
├── sinflar/                    ← sinf yaratish/o'chirish/faol qilish + o'quvchi (ism-familya) boshqarish
└── tools/                      ← BARCHA tool'lar shu yerda, root darajasida EMAS
    └── <har-bir-tool>/
        ├── index.html           ← har doim bir xil qolip (title bundan mustasno)
        └── app.js                ← FAQAT shu tool'ning logikasi
```

**Nega `tools/` alohida:** `login/`, `settings/`, `sinflar/` kabi nomlar
root darajasida core feature'lar uchun band. Agar tool'lar ham root'ga
tashlansa, ertaga shunga o'xshash nom bilan (masalan "students") core
feature yaratmoqchi bo'lsang, papka nomi to'qnashib qoladi. `tools/` bitta
o'z ichki papkasiga izolyatsiya qilingani bu muammoni butunlay yo'q qiladi —
tool nomlari qancha ko'p bo'lmasin, ular hech qachon core sahifalar bilan
kesishmaydi.

## O'rnatish

1. Firebase Console → loyihang (`tools-ab491`) → **Authentication** → Sign-in method → **Email/Password**'ni yoq.
2. Firebase Console → **Firestore Database** → yarat (agar hali yo'q bo'lsa) → **Rules** tab → `firestore.rules` faylidagi qatorlarni joylashtir → **Publish**.
3. Bu loyiha **hosting server talab qiladi** — `file://` orqali ochib bo'lmaydi. Variantlar:
   - Lokal test: `npx serve` yoki VS Code'dagi "Live Server" kengaytmasi
   - Chiqarish: [Firebase Hosting](https://firebase.google.com/docs/hosting), Vercel, yoki Netlify

## Ma'lumot modeli (Firestore)

```
teachers/{uid}                                  → profil (name, username, email,
                                                    activeClassId, activeClassName)
teachers/{uid}/classes/{classId}                → sinf (name)
teachers/{uid}/classes/{classId}/students/{id}  → o'sha SINFNING o'quvchilar ro'yxati
teachers/{uid}/<tool-collection>/{docId}        → har bir tool'ning o'z ma'lumoti,
                                                    studentId bilan bog'langan, ism bilan emas
```

**Qoida (hech qachon buzilmaydi):** ism faqat `classes/{classId}/students/{studentId}`da.
Boshqa har qanday tool o'z ma'lumotini `studentId` orqali bog'laydi — shunda
ism tuzatilsa, hamma tool'da avtomatik to'g'ri bo'lib qoladi.

**Sinflar:** har o'qituvchi bir nechta sinfga ega bo'lishi mumkin, har birining
o'z mustaqil o'quvchilar ro'yxati bor (`sinflar/` sahifasida boshqariladi).
Root sahifada tanlangan sinf `teachers/{uid}.activeClassId` sifatida saqlanadi
— shu "faol sinf"ni BARCHA tool'lar (`getActiveClass(uid)` orqali) avtomatik
o'qiydi, alohida so'ramaydi.

`firestore.rules`dagi qoida `teachers/{teacherId}/{document=**}` — recursive
wildcard, ya'ni `teachers/{uid}` ostidagi HAR QANDAY collection va HAR QANDAY
chuqurlikni bir zumda qamraydi. Yangi tool qo'shilganda, u bitta collection
ishlatsin yoki 5 qavatli nested subcollection ishlatsin — **rules faylga
umuman qaytilmaydi**. Yagona shart: `shared/data.js` orqali yozish/o'qish.

## Muallif

Muhammadrasul, 35-maktab uchun.
