// Sinf boshqaruvi endi dashboard "Sinf" tabida.
// Eski havolalar (#class / ?classId=) ishlashi uchun yo'naltiramiz.
const params = new URLSearchParams(window.location.search);
const classId = params.get("classId");
const target = classId
  ? `../?classId=${encodeURIComponent(classId)}#class`
  : "../#class";
window.location.replace(target);
