# 35MaktabTools

35-maktab o'qituvchilari uchun qulay tool'lar to'plami. Har bir tool o'z papkasida — mustaqil mini-app, lekin barchasi umumiy auth va Firestore orqali ishlaydi: har bir o'qituvchi o'z hisobiga kiradi, o'z ma'lumotlarini ko'radi.

## Tool'lar

| Tool | Papka | Holat |
|---|---|---|
| Ism tanlash | [`ism-tanlash/`](./ism-tanlash) | ✅ Tayyor |
| Davomat tracker | `davomat-tracker/` | 🔜 Rejada |
| Baho kalkulyatori | `baho-kalkulyatori/` | 🔜 Rejada |
| Jadval generator | `jadval-generator/` | 🔜 Rejada |

## Struktura

```
35MaktabTools/
├── firebase-config.js   ← Firebase ulanish (bitta joyda)
├── auth.js              ← umumiy login-tekshirish + logout
├── login.html            ← kirish / ro'yxatdan o'tish
├── firestore.rules        ← Firebase Console → Firestore → Rules'ga qo'yiladi
├── index.html             ← root, tool'lar ro'yxati (auth talab qiladi)
└── ism-tanlash/
    ├── index.html
    └── README.md
```

## O'rnatish

1. Firebase Console → loyihang (`tools-ab491`) → **Authentication** → Sign-in method → **Email/Password**'ni yoq.
2. Firebase Console → **Firestore Database** → yarat (agar hali yo'q bo'lsa) → **Rules** tab → `firestore.rules` faylidagi qatorlarni joylashtir → **Publish**.
3. Bu loyiha **hosting server talab qiladi** — `file://` orqali (fayl'ni to'g'ridan-to'g'ri ikki marta bosib) ochib bo'lmaydi, chunki ES module import va Firebase Auth localhost/domain talab qiladi. Variantlar:
   - Lokal test: `npx serve` yoki VS Code'dagi "Live Server" kengaytmasi
   - Chiqarish: [Firebase Hosting](https://firebase.google.com/docs/hosting), Vercel, yoki Netlify — hammasi bepul tier'da ishlaydi

## Ma'lumot modeli (Firestore)

```
teachers/{uid}/students/{studentId}
  → name: string
  → createdAt: timestamp
```

Har bir o'qituvchining o'quvchilar ro'yxati **o'z UID'i** ostida saqlanadi. `firestore.rules`dagi qoida buni himoya qiladi — boshqa o'qituvchi hech qachon sening ro'yxatingni o'qiy olmaydi.

## Struktura qoidasi (tool'lar)

Har bir tool:
- O'z papkasida yashaydi
- `index.html` — asosiy fayl
- `README.md` — nima qilishi haqida qisqa izoh
- Umumiy `../auth.js` va `../firebase-config.js`dan import qiladi — login logikasini takrorlamaydi

## Muallif

Muhammadrasul, 35-maktab uchun.
