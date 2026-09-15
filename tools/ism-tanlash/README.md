# Ism tanlash

O'quvchilar ro'yxatidan random tarzda ism tanlaydigan tool. Darsda navbat bilan so'rash, o'yin uchun ishtirokchi tanlash yoki har qanday "kim navbatda" holatlari uchun.

Ismlar **Firestore'da**, root sahifada tanlangan FAOL sinf ostida saqlanadi — login qilib qayta kirsang yoki sinfni almashtirsang, har bir sinfning o'z ro'yxati alohida saqlanib qoladi.

## Xususiyatlari

- Kirganda faol sinfning ro'yxati avtomatik Firestore'dan yuklanadi
- Faol sinf tanlanmagan bo'lsa — bosh sahifaga yo'naltiruvchi xabar chiqadi
- Ismlarni textarea'ga qator-qator kiritasan
- **Saqlash** — joriy ro'yxatni Firestore'ga yozadi
- **Tanla** — spin-animatsiya bilan random ismni tanlaydi
- "Tanlangach ro'yxatdan olib tashlash" — bir ism ikki marta chiqmasligi uchun
- **Qayta yuklash** — pool'ni to'liq ro'yxatga qaytaradi (Firestore'dagi ma'lumot o'chmaydi)

## Talab

Login qilingan bo'lishi kerak (`../../login/index.html`) VA bosh sahifada
kamida bitta sinf faol qilingan bo'lishi kerak. Ikkalasi ham bo'lmasa, tegishli
yo'naltiruvchi xabar/redirect ko'rsatiladi.

## Texnik

Vanilla HTML/CSS/JS + Firebase Auth + Firestore. Umumiy
`../../shared/shell.js` va `../../shared/data.js`ni import qiladi.

Ma'lumot: `teachers/{uid}/classes/{classId}/students/{studentId}` → `{ name, createdAt }`
(`classId` — root sahifada tanlangan faol sinf, `getActiveClass(uid)` orqali olinadi).

Core random tanlash logikasi:

```js
Math.floor(Math.random() * array.length)
```
