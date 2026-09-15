// tools-registry.js — YAGONA joy, yangi tool qo'shilganda shu ro'yxatga
// bitta qator qo'shiladi, xolos. Root sahifa (index.html/app.js) shu
// ro'yxatdan avtomatik grid quradi. 1000 tool bo'lsa ham index.html'ga
// hech kim qo'l tegizmaydi.

export const TOOLS = [
  {
    path: "ism-tanlash/index.html",
    name: "Ism tanlash",
    desc: "O'quvchilar ro'yxatidan random ism tanlaydi — darsda navbat yoki o'yin uchun.",
    status: "ready", // "ready" | "planned"
  },
  {
    path: "davomat-tracker/index.html",
    name: "Davomat tracker",
    desc: "Kunlik davomatni qayd qilish va kuzatish.",
    status: "planned",
  },
  {
    path: "baho-kalkulyatori/index.html",
    name: "Baho kalkulyatori",
    desc: "Baholarni kiritib, o'rtacha va reytingni hisoblash.",
    status: "ready",
  },
  {
    path: "jadval-generator/index.html",
    name: "Jadval generator",
    desc: "Dars jadvalini avtomatik tuzish.",
    status: "planned",
  },
];
