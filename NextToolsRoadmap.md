# Next Tools Roadmap — 35MaktabTools

Bu fayl keyingi tool'lar uchun reja. Har birini boshlashdan oldin shu yerga qarab, Firestore schema va auth pattern'ni oldindan o'ylab qo'yish kerak — keyin kodni yozish tezlashadi.

Umumiy qoida: har bir tool o'z papkasida, `../auth.js` va `../firebase-config.js`dan foydalanadi, ma'lumot `teachers/{uid}/<tool-collection>` ostida saqlanadi.

---

## 1. Davomat tracker

**Nima qiladi:** o'qituvchi har kuni sinf bo'yicha kimlar kelgan/kelmaganini belgilaydi, tarixni ko'radi.

**Firestore schema (taklif):**
```
teachers/{uid}/attendance/{dateId}
  → date: "2026-09-15"
  → records: { studentName: "present" | "absent" | "late" }
```

**Muammoli joylar (oldindan o'ylash kerak):**
- O'quvchilar ro'yxati qayerdan keladi? `ism-tanlash` tool'idagi ro'yxatni qayta ishlatish mumkinmi, yoki har bir tool o'z ro'yxatini saqlaydimi — bu **arxitektura qarori**, boshlashdan oldin hal qilish kerak.
- Bitta kunda ikki marta belgilab qo'ysa — `dateId` ustidan `setDoc` (overwrite) ishlatish kerak, `addDoc` emas (aks holda dublikat hujjat yaratiladi).

**Murakkablik:** o'rta — yangi narsa: sana bo'yicha document ID, `setDoc` vs `addDoc` farqi.

---

## 2. Baho kalkulyatori

**Nima qiladi:** o'quvchi baholarini kiritib, o'rtacha/reyting hisoblaydi.

**Firestore schema (taklif):**
```
teachers/{uid}/grades/{studentId}
  → name: string
  → scores: [85, 90, 78, ...]
```

**Muammoli joylar:**
- Array ichiga array qo'shish (`arrayUnion`) — Firestore'da maxsus funksiya bor, `updateDoc` + `arrayUnion(newScore)` bilan qilinadi, butun array'ni qayta yozmasdan.
- O'rtacha hisoblash — bu frontend logikasi (sof JS, array `.reduce()`), Firestore bilan bog'liq emas, lekin yangi array metodini talab qiladi.

**Murakkablik:** past-o'rta — asosan JS array logikasi, Firestore tarafi oddiy.

---

## 3. Jadval generator

**Nima qiladi:** dars jadvalini tuzish/ko'rish.

**Firestore schema (taklif):**
```
teachers/{uid}/schedule/{dayId}
  → day: "Dushanba"
  → lessons: [{ time: "08:30", subject: "Matematika", room: "12" }, ...]
```

**Muammoli joylar:**
- Bu eng murakkab tool — nested array ichida object'lar, UI ham drag-and-drop yoki forma bilan tahrirlash talab qiladi.
- Avtomatik generatsiya (ziddiyatsiz jadval tuzish) alohida katta mavzu — birinchi versiyada shunchaki **qo'lda kiritish** bilan chegaralash tavsiya etiladi, "avtomatik" qismini keyinroq qo'shish.

**Murakkablik:** yuqori — oxiriga qoldirish tavsiya etiladi.

---

## Tavsiya etilgan tartib

1. **Baho kalkulyatori** — eng oson, `arrayUnion` va array logikasini mustahkamlash uchun yaxshi keyingi qadam
2. **Davomat tracker** — sana bilan ishlash va `setDoc` farqini o'rganish uchun
3. **Jadval generator** — oxirida, chunki eng murakkab UI va data model talab qiladi

## Umumiy arxitektura savoli (hal qilinmagan)

O'quvchilar ro'yxati barcha tool'larda kerak bo'ladi (Davomat, Baho — ikkalasi ham). Hozir faqat `ism-tanlash` o'z ro'yxatini saqlaydi. Variantlar:

- **A) Umumiy `students` collection** — `teachers/{uid}/students` bitta joyda, barcha tool shu yerdan o'qiydi. Kamchilik: bitta ro'yxatni o'zgartirish hamma tool'ga ta'sir qiladi.
- **B) Har bir tool o'z ro'yxatini saqlaydi** — mustaqillik saqlanadi (loyihaning asosiy printsipi), lekin ismlarni har safar qayta kiritish kerak bo'ladi.

Bu qarorni keyingi tool boshlanishidan oldin hal qilish kerak — ikkalasi ham to'g'ri, lekin ikkalasini aralashtirib boshlash keyin qayta yozishga olib keladi.
