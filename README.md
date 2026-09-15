# 35MaktabTools

35-maktab o'qituvchilari uchun qulay tool'lar to'plami. Har bir tool o'z
papkasida — mustaqil mini-app, lekin barchasi umumiy auth, dizayn va
Firestore qatlami orqali ishlaydi: har bir o'qituvchi o'z hisobiga kiradi,
o'z ma'lumotlarini ko'radi.

**Yangi tool qo'shmoqchimisiz? → [`HOW_TO_ADD_A_TOOL.md`](./HOW_TO_ADD_A_TOOL.md)ni o'qing.**
3 qadam, har doim bir xil — 1-chi tool ham, 1000-chi tool ham.

## Tool'lar

| Tool | Papka | Holat |
|---|---|---|
| Ism tanlash | [`ism-tanlash/`](./ism-tanlash) | ✅ Tayyor |
| Baho kalkulyatori | [`baho-kalkulyatori/`](./baho-kalkulyatori) | ✅ Tayyor |
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
└── <har-bir-tool>/
    ├── index.html               ← har doim bir xil qolip (title bundan mustasno)
    └── app.js                    ← FAQAT shu tool'ning logikasi
```

## O'rnatish

1. Firebase Console → loyihang (`tools-ab491`) → **Authentication** → Sign-in method → **Email/Password**'ni yoq.
2. Firebase Console → **Firestore Database** → yarat (agar hali yo'q bo'lsa) → **Rules** tab → `firestore.rules` faylidagi qatorlarni joylashtir → **Publish**.
3. Bu loyiha **hosting server talab qiladi** — `file://` orqali ochib bo'lmaydi. Variantlar:
   - Lokal test: `npx serve` yoki VS Code'dagi "Live Server" kengaytmasi
   - Chiqarish: [Firebase Hosting](https://firebase.google.com/docs/hosting), Vercel, yoki Netlify

## Ma'lumot modeli (Firestore)

```
teachers/{uid}                          → profil (name, username, email)
teachers/{uid}/students/{studentId}     → YAGONA umumiy o'quvchilar ro'yxati
teachers/{uid}/<tool-collection>/{docId}→ har bir tool'ning o'z ma'lumoti,
                                            studentId bilan bog'langan, ism bilan emas
```

**Qoida (hech qachon buzilmaydi):** ism faqat `students/{studentId}`da. Boshqa
har qanday tool o'z ma'lumotini `studentId` orqali bog'laydi — shunda ism
tuzatilsa, hamma tool'da avtomatik to'g'ri bo'lib qoladi.

`firestore.rules`dagi qoida `teachers/{teacherId}/{document=**}` — recursive
wildcard, ya'ni `teachers/{uid}` ostidagi HAR QANDAY collection va HAR QANDAY
chuqurlikni bir zumda qamraydi. Yangi tool qo'shilganda, u bitta collection
ishlatsin yoki 5 qavatli nested subcollection ishlatsin — **rules faylga
umuman qaytilmaydi**. Yagona shart: `shared/data.js` orqali yozish/o'qish.

## Muallif

Muhammadrasul, 35-maktab uchun.
