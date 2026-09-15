# Ism tanlash

O'quvchilar ro'yxatidan random tarzda ism tanlaydigan tool. Darsda navbat bilan so'rash, o'yin uchun ishtirokchi tanlash yoki har qanday "kim navbatda" holatlari uchun.

Endi ismlar **Firestore'da**, o'qituvchining o'z hisobi ostida saqlanadi — login qilib qayta kirsang, ro'yxating saqlanib qoladi.

## Xususiyatlari

- Kirganda ro'yxat avtomatik Firestore'dan yuklanadi
- Ismlarni textarea'ga qator-qator kiritasan
- **Saqlash** — joriy ro'yxatni Firestore'ga yozadi
- **Tanla** — spin-animatsiya bilan random ismni tanlaydi
- "Tanlangach ro'yxatdan olib tashlash" — bir ism ikki marta chiqmasligi uchun
- **Qayta yuklash** — pool'ni to'liq ro'yxatga qaytaradi (Firestore'dagi ma'lumot o'chmaydi)

## Talab

Login qilingan bo'lishi kerak (`../login.html`). Login qilinmagan bo'lsa, avtomatik login sahifasiga yo'naltiriladi.

## Texnik

Vanilla HTML/CSS/JS + Firebase Auth + Firestore. Umumiy `../auth.js` va `../firebase-config.js`ni import qiladi.

Ma'lumot: `teachers/{uid}/students/{studentId}` → `{ name, createdAt }`

Core random tanlash logikasi:

```js
Math.floor(Math.random() * array.length)
```
