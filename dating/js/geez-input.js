/* Wana Dating — Amharic (Ge'ez) phonetic typing, for every text box (messages, posts, support, profile…).
 * Type English letters, get Amharic:  selam -> ሰላም,  amesegnalehu -> አመሰግናለሁ,  TEna -> ጤና,  eNE -> እኔ
 * Only plain English letters are converted. Text from Power Geez / Visual Geez (Unicode mode), Gboard Amharic
 * or any other Ethiopic keyboard is left alone.
 * Computer: converts live as you type. Phone: converts live where the keyboard allows it, and otherwise
 * converts each word when the keyboard commits it (space / next word).
 * Turn on/off with the small "አ" button that appears above the box you're typing in. The choice is remembered. */
(function () {
  "use strict";
  var KEY = "wg_geez_on";
  var C = { // consonant -> 7 orders: 1st(e) 2nd(u) 3rd(i) 4th(a) 5th(ie/E) 6th(none) 7th(o)
    h: "ሀሁሂሃሄህሆ", l: "ለሉሊላሌልሎ", m: "መሙሚማሜምሞ", r: "ረሩሪራሬርሮ", s: "ሰሱሲሳሴስሶ",
    sh: "ሸሹሺሻሼሽሾ", q: "ቀቁቂቃቄቅቆ", b: "በቡቢባቤብቦ", v: "ቨቩቪቫቬቭቮ", t: "ተቱቲታቴትቶ",
    ch: "ቸቹቺቻቼችቾ", n: "ነኑኒናኔንኖ", ny: "ኘኙኚኛኜኝኞ", k: "ከኩኪካኬክኮ", w: "ወዉዊዋዌውዎ",
    z: "ዘዙዚዛዜዝዞ", zh: "ዠዡዢዣዤዥዦ", y: "የዩዪያዬይዮ", d: "ደዱዲዳዴድዶ", j: "ጀጁጂጃጄጅጆ",
    g: "ገጉጊጋጌግጎ", T: "ጠጡጢጣጤጥጦ", C: "ጨጩጪጫጬጭጮ", P: "ጰጱጲጳጴጵጶ", S: "ጸጹጺጻጼጽጾ",
    f: "ፈፉፊፋፌፍፎ", p: "ፐፑፒፓፔፕፖ"
  };
  var LAB = { q: "ቋ", k: "ኳ", g: "ጓ", h: "ኋ" };
  var VOW = { e: 0, u: 1, i: 2, a: 3, o: 6 };
  var ALONE = { a: "አ", u: "ኡ", i: "ኢ", e: "እ", o: "ኦ", A: "ኣ", E: "ኤ", I: "ኢ", U: "ኡ", O: "ኦ" };
  var MAP = { H: "h", N: "ny", x: "S", Z: "zh", c: "ch" };

  function isEth(ch) { return !!ch && /[ሀ-፿]/.test(ch); }
  function on() { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } }
  function setOn(v) { try { localStorage.setItem(KEY, v ? "1" : "0"); } catch (e) {} }

  /* One typing step. v = text before the caret, st = what we wrote last (or null), k = typed key.
   * Returns null (not ours) or { back: how many chars before the caret to replace, text, st }. */
  function step(v, st, k) {
    var n = v.length;
    if (k === "." || k === ",") {
      if (isEth(v.charAt(n - 1))) return { back: 0, text: k === "." ? "።" : "፣", st: null };
      return null;
    }
    if (!/[A-Za-z]/.test(k)) return null;
    var cur = st && st.pos === n ? st : null;
    if (/[aeiouAEIOU]/.test(k)) {
      var lk = k.toLowerCase();
      if (cur && cur.prevLab && lk === "a") return { back: 2, text: LAB[cur.prevLab], st: null };
      if (cur && cur.base) {
        var order = null;
        if (cur.order == null) order = (k === "E") ? 4 : VOW[lk];
        else if (k === "e" && (cur.order === 2 || cur.order === 0)) order = 4;
        if (order != null) return { back: 1, text: C[cur.base].charAt(order), st: { pos: n, base: cur.base, order: order } };
      }
      return { back: 0, text: ALONE[k], st: null };
    }
    if (k === "w" && cur && cur.base && cur.order == null && LAB[cur.base])
      return { back: 0, text: C.w.charAt(5), st: { pos: n + 1, base: "w", order: null, prevLab: cur.base } };
    if (k === "h" && cur && cur.fromC) return { back: 0, text: "", st: { pos: n, base: "ch", order: null } };
    if (cur && cur.base && cur.order == null && ((k === "h" && (cur.base === "s" || cur.base === "z")) || (k === "y" && cur.base === "n"))) {
      var dg = cur.base + k;
      return { back: 1, text: C[dg].charAt(5), st: { pos: n, base: dg, order: null } };
    }
    var key = MAP[k] || (C[k] ? k : (C[k.toLowerCase()] && !/[TCPS]/.test(k) ? k.toLowerCase() : null));
    if (!key || !C[key]) return null;
    return { back: 0, text: C[key].charAt(5), st: { pos: n + 1, base: key, order: null, fromC: k === "c" } };
  }

  /* Convert a whole run of English letters (used when a phone keyboard hands us a finished word). */
  function convert(str) {
    var v = "", st = null;
    for (var i = 0; i < str.length; i++) {
      var r = step(v, st, str.charAt(i));
      if (r) { v = v.slice(0, v.length - r.back) + r.text; st = r.st; if (st) st.pos = v.length; }
      else { v += str.charAt(i); st = null; }
    }
    return v;
  }

  function eligible(el) {
    if (!el || el._geezOff) return false;
    if (el.tagName === "TEXTAREA") return !el.readOnly && !el.disabled;
    if (el.tagName !== "INPUT" || el.readOnly || el.disabled) return false;
    var t = (el.getAttribute("type") || "text").toLowerCase();
    if (t !== "text" && t !== "search") return false;
    var hint = ((el.getAttribute("autocomplete") || "") + " " + (el.name || "") + " " + (el.id || "")).toLowerCase();
    return !/email|phone|tel(?!l)|pass|username|otp|captcha|url|date|price|amount|number|year|zip/.test(hint);
  }

  var pill = null, pillFor = null;
  function ensurePill() {
    if (pill) return pill;
    pill = document.createElement("button");
    pill.type = "button"; pill.className = "geez-pill"; pill.textContent = "አ"; pill.hidden = true;
    pill.setAttribute("aria-label", "Amharic typing");
    ["mousedown", "touchstart", "pointerdown"].forEach(function (ev) { pill.addEventListener(ev, function (e) { e.preventDefault(); }, { passive: false }); });
    pill.addEventListener("click", function (e) { e.preventDefault(); toggle(); });
    document.body.appendChild(pill); return pill;
  }
  function paintAll() {
    var o = on();
    if (pill) { pill.classList.toggle("on", o); pill.title = o ? "Amharic typing ON (selam → ሰላም). Tap to turn off." : "Turn on Amharic typing (selam → ሰላም)"; pill.textContent = o ? "አ ✓" : "አ"; }
    var b = document.querySelectorAll(".chat-geez");
    for (var i = 0; i < b.length; i++) { b[i].classList.toggle("on", o); b[i].setAttribute("aria-pressed", o ? "true" : "false"); b[i].title = pill ? pill.title : ""; }
  }
  function toggle() { setOn(!on()); paintAll(); if (pillFor) pillFor.focus(); }
  function place() {
    if (!pill || !pillFor || !document.body.contains(pillFor)) { if (pill) pill.hidden = true; return; }
    var r = pillFor.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) { pill.hidden = true; return; }
    pill.hidden = false;
    var top = r.top - 34; if (top < 4) top = Math.min(r.bottom + 4, innerHeight - 40);
    pill.style.top = Math.max(4, top) + "px";
    pill.style.left = Math.max(4, Math.min(r.right - pill.offsetWidth, innerWidth - pill.offsetWidth - 4)) + "px";
  }

  function wire(ta) {
    if (ta._geez) return; ta._geez = true;
    var st = null;
    function before() { return ta.value.slice(0, ta.selectionStart); }
    function apply(r) {
      var pos = ta.selectionStart;
      ta.setRangeText(r.text, pos - r.back, ta.selectionEnd, "end");
      var ev = new Event("input", { bubbles: true }); ev.__geez = true; ta.dispatchEvent(ev);
      st = r.st; if (st) st.pos = ta.selectionStart;
    }
    ta.addEventListener("beforeinput", function (e) {            // computer keyboards (and most phones)
      if (!on() || e.isComposing || e.inputType !== "insertText" || !e.data || e.data.length !== 1) return;
      if (ta.selectionStart !== ta.selectionEnd) { st = null; return; }
      var r = step(before(), st, e.data);
      if (r) { e.preventDefault(); apply(r); } else st = null;
    });
    ta.addEventListener("input", function (e) {                  // phones that don't allow beforeinput to be cancelled
      if (e.__geez) return;
      if (on() && !e.isComposing && e.inputType === "insertText" && e.data && e.data.length === 1 && /[A-Za-z.,]/.test(e.data) && ta.selectionStart === ta.selectionEnd) {
        var pos = ta.selectionStart;
        var prev = ta.value.slice(0, pos - 1);
        if (ta.value.charAt(pos - 1) === e.data) {
          var r = step(prev, st, e.data);
          if (r) { ta.setRangeText("", pos - 1, pos, "end"); apply(r); return; }
        }
      }
      st = null;
    });
    ta.addEventListener("compositionend", function (e) {         // phone keyboard committed a word: convert it
      if (!on() || !e.data || !/^[A-Za-z]+$/.test(e.data)) return;
      setTimeout(function () {
        var pos = ta.selectionStart, from = pos - e.data.length;
        if (from < 0 || ta.value.slice(from, pos) !== e.data) return;
        var out = convert(e.data);
        ta.setRangeText(out, from, pos, "end");
        var ev = new Event("input", { bubbles: true }); ev.__geez = true; ta.dispatchEvent(ev);
        st = null;
      }, 0);
    });
    ta.addEventListener("blur", function () { st = null; });
    ta.addEventListener("click", function () { st = null; });
    ta.addEventListener("keydown", function (e) { if (e.key.indexOf("Arrow") === 0 || e.key === "Home" || e.key === "End" || e.key === "Backspace") st = null; });
    if (!ta.getAttribute("lang")) ta.setAttribute("lang", "am");
  }

  function attach(ta, btn) {   // chat composer passes its own "አ" button
    if (!ta) return;
    ta._geezBtn = !!btn;
    wire(ta);
    if (btn && !btn._geez) { btn._geez = true; btn.addEventListener("click", function (e) { e.preventDefault(); setOn(!on()); paintAll(); ta.focus(); }); }
    paintAll();
  }

  document.addEventListener("focusin", function (e) {
    var el = e.target;
    if (!eligible(el)) return;
    wire(el);
    ensurePill(); paintAll();
    if (el._geezBtn) { pillFor = null; pill.hidden = true; return; }
    pillFor = el; place();
  });
  document.addEventListener("focusout", function () { setTimeout(function () { if (!document.activeElement || !eligible(document.activeElement)) { pillFor = null; if (pill) pill.hidden = true; } }, 150); });
  ["scroll", "resize"].forEach(function (ev) { window.addEventListener(ev, place, true); });
  if (window.visualViewport) { window.visualViewport.addEventListener("resize", place); window.visualViewport.addEventListener("scroll", place); }
  document.addEventListener("input", function () { place(); });

  window.GeezInput = { attach: attach, isOn: on, convert: convert };
})();
