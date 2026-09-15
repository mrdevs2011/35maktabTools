# Ism tanlash (Ism Roulette)

O'qituvchining **faol sinfidagi** o'quvchilar ro'yxatidan random tarzda ism tanlaydigan tool. Darsda navbat bilan so'rash yoki o'yin uchun.

## Xususiyatlari

- Faol sinf avtomatik olinadi (bosh sahifada tanlangan)
- Ismlar sinfdagi o'quvchilar ro'yxatidan yuklanadi (input yo'q)
- **Tanla** — spin-animatsiya bilan random ismni tanlaydi
- Tanlangan ism vaqtincha ro'yxatdan olib tashlanadi (takrorlanmasligi uchun)
- Barcha ismlar tugagach keyingi bosishda ro'yxat avtomatik qayta to'ldiriladi
- Space / Enter — tez tanlash

## Talab

1. Login qilingan bo'lishi kerak
2. Bosh sahifada faol sinf tanlangan bo'lishi kerak
3. Shu sinfda o'quvchilar qo'shilgan bo'lishi kerak

## Texnik

Vanilla HTML/CSS/JS + Firebase Auth + Firestore.
Ma'lumot: `teachers/{uid}/classes/{classId}/students`
