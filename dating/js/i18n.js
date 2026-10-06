// ============================================================
// i18n.js — language toggle (EN / አማርኛ)
// NOTE: currently only toggles the button label; UI strings are still
// hard-coded in English throughout the other files. Extend this file
// with a string dictionary when ready to localize.
// ============================================================

let currentLang = "en";

function toggleLang(){
  currentLang = currentLang === "en" ? "am" : "en";
  document.getElementById("langBtn").textContent = currentLang === "en" ? "አማ" : "EN";
}
