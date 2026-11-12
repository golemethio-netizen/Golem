/* Wana Dating — profile prompts. Members answer up to 3 short questions; shown on their profile card.
 * Needs SQL v64. Sits on top of app.js (uses _supabase, currentUser, currentLang, esc, openModal). Fails quietly. */
(function () {
  "use strict";
  var QUESTIONS = [
    ["My perfect Sunday is…", "እሁድ ለእኔ ምርጥ የሚሆነው…"],
    ["I'm happiest when…", "ደስተኛ የምሆነው…"],
    ["The way to my heart is…", "ወደ ልቤ የሚደርሰው መንገድ…"],
    ["My favourite dish is…", "የምወደው ምግብ…"],
    ["A dream I'm working on…", "እየሠራሁበት ያለ ሕልም…"],
    ["Best trip I ever took…", "የሄድኩበት ምርጥ ጉዞ…"],
    ["On a first date I'd love to…", "በመጀመሪያ ቀጠሮ ማድረግ የምወደው…"],
    ["Two truths and a lie…", "ሁለት እውነት እና አንድ ውሸት…"]
  ];
  function am() { try { return currentLang === "am"; } catch (e) { return false; } }
  function label(q) { for (var i = 0; i < QUESTIONS.length; i++) if (QUESTIONS[i][0] === q) return am() ? QUESTIONS[i][1] : q; return q; }
  function escH(s) { try { return esc(s); } catch (e) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); } }

  /* ---- 1. Edit form: add the prompt slots ---- */
  async function injectEditor(form) {
    if (form.querySelector(".wg-prompts-edit")) return;
    var current = [];
    try {
      var r = await _supabase.from("dating_profiles").select("prompts").eq("user_id", currentUser.id).maybeSingle();
      if (r && r.data && Array.isArray(r.data.prompts)) current = r.data.prompts;
      if (r && r.error) return;                      /* column missing (SQL v64 not run yet): don't show a broken section */
    } catch (e) { return; }
    if (form.querySelector(".wg-prompts-edit")) return;
    var box = document.createElement("div"); box.className = "wg-prompts-edit";
    var html = '<label class="wg-pe-title">' + (am() ? "ስለ እርስዎ ጥያቄዎች (አማራጭ)" : "Profile prompts (optional)") + '</label><p class="wg-pe-help">' + (am() ? "እስከ 3 ጥያቄዎችን ይመልሱ። ሌሎች ውይይት ለመጀመር ይጠቀሙባቸዋል።" : "Answer up to 3. They give people something to talk to you about.") + '</p>';
    for (var i = 0; i < 3; i++) {
      var cur = current[i] || {};
      var opts = '<option value="">' + (am() ? "— ጥያቄ ምረጡ —" : "— choose a question —") + '</option>';
      QUESTIONS.forEach(function (q) { opts += '<option value="' + escH(q[0]) + '"' + (cur.q === q[0] ? " selected" : "") + ">" + escH(am() ? q[1] : q[0]) + "</option>"; });
      html += '<div class="wg-pe-slot"><select class="wg-pe-q">' + opts + '</select><textarea class="wg-pe-a" maxlength="150" rows="2" placeholder="' + (am() ? "መልስዎ…" : "Your answer…") + '">' + escH(cur.a || "") + '</textarea><small class="wg-pe-count"></small></div>';
    }
    box.innerHTML = html;
    var btns = form.querySelector(".submit-btn"); var anchor = btns ? btns.parentNode : null;
    if (anchor && anchor.parentNode === form) form.insertBefore(box, anchor); else form.appendChild(box);
    [].forEach.call(box.querySelectorAll(".wg-pe-slot"), function (slot) {
      var ta = slot.querySelector("textarea"), cnt = slot.querySelector(".wg-pe-count");
      function upd() { cnt.textContent = ta.value.length + "/150"; } ta.addEventListener("input", upd); upd();
    });
    form.addEventListener("submit", function () { savePrompts(box); });
  }
  async function savePrompts(box) {
    var items = [];
    [].forEach.call(box.querySelectorAll(".wg-pe-slot"), function (slot) {
      var q = slot.querySelector("select").value, a = slot.querySelector("textarea").value.trim();
      if (q && a) items.push({ q: q, a: a.slice(0, 150) });
    });
    try {
      var r = await _supabase.from("dating_profiles").update({ prompts: items }).eq("user_id", currentUser.id);
      if (r && r.error) { var m = document.getElementById("editMsg"); if (m) m.innerHTML = '<div class="msg error">' + escH(r.error.message) + "</div>"; }
    } catch (e) {}
  }

  /* ---- 2. Profile card: show the prompts under the bio ---- */
  function promptsHtml(list) {
    if (!Array.isArray(list) || !list.length) return "";
    var h = '<div class="wg-prompts">';
    list.slice(0, 3).forEach(function (p) { if (p && p.q && p.a) h += '<div class="wg-prompt"><small>' + escH(label(p.q)) + "</small><p>" + escH(p.a) + "</p></div>"; });
    return h + "</div>";
  }
  function wrapModal() {
    if (typeof window.openModal !== "function" || window.openModal.__prompts) return;
    var orig = window.openModal;
    window.openModal = async function (row) {
      var out = await orig.apply(this, arguments);
      try {
        var root = document.getElementById("modalRoot"), bio = root && root.querySelector(".bio");
        if (bio && row && !root.querySelector(".wg-prompts")) bio.insertAdjacentHTML("afterend", promptsHtml(row.prompts));
      } catch (e) {}
      return out;
    };
    window.openModal.__prompts = true;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wrapModal); else wrapModal();

  new MutationObserver(function () {
    var f = document.getElementById("editForm");
    if (f && !f.__wgp && typeof currentUser !== "undefined" && currentUser) { f.__wgp = true; injectEditor(f).catch(function () {}); }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
