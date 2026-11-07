/* Wana Dating — "professional touches" that sit on top of the app (no changes to the core logic):
 *  1. Offline banner            2. Install-as-app prompt (Android/desktop + iPhone hint)
 *  3. Conversation starters     4. Profile strength card on Home
 * Everything here fails quietly: if something is missing the page simply behaves as before. */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function amharic() { try { return typeof currentLang !== "undefined" && currentLang === "am"; } catch (e) { return false; } }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }

  /* ---------- 1. Offline banner ---------- */
  var bar = document.createElement("div");
  bar.className = "wg-offline"; bar.setAttribute("role", "status"); bar.hidden = true;
  function paintNet() {
    var off = !navigator.onLine;
    bar.textContent = off ? (amharic() ? "ከበይነመረብ ተቋርጠዋል። ዳግም ሲገናኙ መልዕክቶች ይላካሉ።" : "You're offline. Reconnect to send messages and see new matches.") : "";
    bar.hidden = !off;
  }
  document.addEventListener("DOMContentLoaded", function () { document.body.appendChild(bar); paintNet(); });
  window.addEventListener("offline", paintNet);
  window.addEventListener("online", function () {
    paintNet();
    bar.hidden = false; bar.classList.add("back"); bar.textContent = amharic() ? "ተመልሰዋል ✓" : "Back online ✓";
    setTimeout(function () { bar.classList.remove("back"); paintNet(); }, 2200);
  });

  /* ---------- 2. Install as an app ---------- */
  var deferred = null, card = null;
  var standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  function dismissed() { var t = parseInt(lsGet("wg_install_dismissed") || "0", 10); return t && Date.now() - t < 2 * 864e5; }
  function showInstall(kind) {
    if (card || standalone || dismissed()) return;
    card = document.createElement("div"); card.className = "wg-install"; card.setAttribute("role", "dialog"); card.setAttribute("aria-label", "Install Wana Dating");
    card.innerHTML = '<img src="images/icon-192.png" alt="" width="44" height="44">' +
      '<div class="wg-install-text"><strong>' + (amharic() ? "ዋና ዳቲንግን ይጫኑ" : "Add Wana Dating to your home screen") + '</strong>' +
      '<span>' + (kind === "ios" ? (amharic() ? "«አጋራ» ን ነክተው «ወደ መነሻ ማያ ገጽ አክል» ይምረጡ።" : "Tap Share, then “Add to Home Screen”. You’ll get alerts for new messages and matches.") : (amharic() ? "በፍጥነት ይክፈቱ፤ ማሳወቂያዎችንም ያገኛሉ።" : "Open it in one tap and get alerts for new messages and matches.")) + '</span></div>' +
      (kind === "ios" ? "" : '<button type="button" class="wg-install-go">' + (amharic() ? "ጫን" : "Install") + '</button>') +
      '<button type="button" class="wg-install-x" aria-label="Close">✕</button>';
    document.body.appendChild(card);
    card.querySelector(".wg-install-x").onclick = function () { lsSet("wg_install_dismissed", String(Date.now())); card.remove(); card = null; };
    var go = card.querySelector(".wg-install-go");
    if (go) go.onclick = async function () {
      var choice = null;
      try { deferred.prompt(); choice = await deferred.userChoice; } catch (e) {}
      deferred = null; if (card) { card.remove(); card = null; }
      if (choice && choice.outcome === "accepted") installProgress();
    };
  }
  /* Progress panel: browsers give no real percentage, so the bar is an honest "working" animation until the browser says it's installed. */
  var prog = null, progTimer = null, done = false;
  function installProgress() {
    done = false; if (prog) prog.remove();
    prog = document.createElement("div"); prog.className = "wg-instprog"; prog.setAttribute("role", "status"); prog.setAttribute("aria-live", "polite");
    prog.innerHTML = '<img src="images/icon-192.png" alt="" width="52" height="52"><div class="wg-ip-text"><strong class="wg-ip-title"></strong><span class="wg-ip-sub"></span><div class="wg-ip-bar"><i></i></div></div>';
    prog.querySelector(".wg-ip-title").textContent = amharic() ? "ዋና ዳቲንግ በመጫን ላይ…" : "Installing Wana Dating…";
    prog.querySelector(".wg-ip-sub").textContent = amharic() ? "እባክዎ ይጠብቁ" : "Hang on, this takes a few seconds.";
    document.body.appendChild(prog);
    clearTimeout(progTimer); progTimer = setTimeout(function () { if (!done) installDone(); }, 25000);
  }
  function installDone() {
    if (done) return; done = true; clearTimeout(progTimer);
    var msg = amharic() ? "ዋና ዳቲንግ ተጭኗል!" : "Wana Dating is installed!";
    var sub = amharic() ? "ከመነሻ ማያ ገጽዎ ወይም ከዴስክቶፕዎ ይክፈቱት።" : "Open it from your home screen, app list or desktop.";
    if (!prog) { prog = document.createElement("div"); prog.className = "wg-instprog"; prog.innerHTML = '<img src="images/icon-192.png" alt="" width="52" height="52"><div class="wg-ip-text"><strong class="wg-ip-title"></strong><span class="wg-ip-sub"></span><div class="wg-ip-bar"><i></i></div></div>'; document.body.appendChild(prog); }
    prog.classList.add("done");
    prog.querySelector(".wg-ip-title").textContent = "✓ " + msg;
    prog.querySelector(".wg-ip-sub").textContent = sub;
    try { if (navigator.vibrate) navigator.vibrate([60, 40, 60]); } catch (e) {}
    try {
      if ("Notification" in window && Notification.permission === "granted" && navigator.serviceWorker) {
        navigator.serviceWorker.ready.then(function (reg) { reg.showNotification(msg, { body: sub, icon: "/dating/images/icon-192.png", badge: "/dating/images/favicon-48.png", tag: "wg-installed" }); });
      }
    } catch (e) {}
    var el = prog; setTimeout(function () { el.classList.add("out"); setTimeout(function () { el.remove(); if (prog === el) prog = null; }, 400); }, 5000);
  }
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; setTimeout(function () { showInstall("native"); }, 4000); });
  window.addEventListener("appinstalled", function () { if (card) { card.remove(); card = null; } if (pill) pill.remove(); installDone(); });

  /* A small always-available "Install app" button, so it can be found even after the card was dismissed or if the browser gave no prompt. */
  var pill = null;
  function help() {
    var ua = navigator.userAgent, m;
    if (isIOS) m = amharic() ? "በSafari «አጋራ» ን ነክተው «ወደ መነሻ ማያ ገጽ አክል» ይምረጡ።" : "In Safari tap Share, then “Add to Home Screen”.";
    else if (/android/i.test(ua)) m = amharic() ? "በChrome ሜኑ (⋮) «መተግበሪያ ጫን» ወይም «ወደ መነሻ ማያ ገጽ አክል» ይምረጡ።" : "Open the Chrome menu (⋮) and choose “Install app” or “Add to Home screen”. Use Chrome, not an in-app browser.";
    else if (/firefox/i.test(ua)) m = amharic() ? "Firefox ኮምፒውተር ላይ መጫንን አይደግፍም። Chrome ወይም Edge ይጠቀሙ።" : "Firefox on computers can’t install web apps. Open this page in Chrome or Edge.";
    else m = amharic() ? "በChrome ወይም Edge አድራሻ መስመር ውስጥ ያለውን የመጫን አዶ ይንኩ፣ ወይም ሜኑ ▸ «ጫን»።" : "In Chrome or Edge, click the install icon at the right of the address bar, or open the menu and choose “Install Wana Dating”.";
    alert(m);
  }
  function showPill() {
    if (pill || standalone) return;
    pill = document.createElement("button"); pill.type = "button"; pill.className = "wg-install-pill";
    pill.textContent = "📲 " + (amharic() ? "መተግበሪያ ጫን" : "Install app");
    pill.onclick = async function () {
      if (deferred) { var d = deferred, choice = null; try { d.prompt(); choice = await d.userChoice; } catch (e) {} deferred = null; if (choice && choice.outcome === "accepted") { if (card) { card.remove(); card = null; } installProgress(); } }
      else help();
    };
    document.body.appendChild(pill);
  }
  setTimeout(showPill, 8000);
  if (isIOS && !standalone) setTimeout(function () { showInstall("ios"); }, 6000);

  /* ---------- 3. Conversation starters (shown only in an empty chat) ---------- */
  var STARTERS = {
    en: ["Hi! How's your day going? 😊", "What do you enjoy doing on weekends?", "What's your favourite place in Ethiopia?", "Coffee or tea? Tell me everything ☕"],
    am: ["ሰላም! ቀንዎ እንዴት ነው? 😊", "ቅዳሜና እሁድ ምን ማድረግ ይወዳሉ?", "በኢትዮጵያ ውስጥ የሚወዱት ቦታ የት ነው?", "ቡና ወይስ ሻይ? ☕"]
  };
  function addStarters() {
    var scroll = document.querySelector(".chat-scroll");
    if (!scroll || scroll.querySelector(".wg-starters")) return;
    if (scroll.querySelector(".cmsg, .chat-day")) return;           // already has messages
    var box = $("replyBody"); if (!box) return;
    if (box.value.trim()) return;                                   // they already started typing
    var list = STARTERS[amharic() ? "am" : "en"];
    var wrap = document.createElement("div"); wrap.className = "wg-starters";
    wrap.innerHTML = '<p>' + (amharic() ? "ውይይቱን ለመጀመር አንዱን ይምረጡ" : "Break the ice — tap one to start") + '</p>' +
      list.map(function (t) { return '<button type="button">' + esc(t) + '</button>'; }).join("");
    wrap.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      box.value = b.textContent; box.dispatchEvent(new Event("input", { bubbles: true })); box.focus();
      wrap.remove();
    });
    scroll.appendChild(wrap);
  }
  new MutationObserver(function () { addStarters(); }).observe(document.documentElement, { childList: true, subtree: true });

  /* ---------- 4. Profile strength card (Home) ---------- */
  function strength(p) {
    var photos = (p.photos && p.photos.length) || (p.photo_url ? 1 : 0);
    var items = [
      { ok: photos >= 1, pts: 25, en: "Add a clear photo of your face", am: "የፊትዎን ግልጽ ፎቶ ያክሉ", tab: "myprofile" },
      { ok: photos >= 3, pts: 10, en: "Add at least 3 photos", am: "ቢያንስ 3 ፎቶዎችን ያክሉ", tab: "myprofile" },
      { ok: (p.bio || "").trim().length >= 60, pts: 20, en: "Write a bio of 2–3 sentences", am: "ከ2–3 ዓረፍተ ነገር የሚሆን ማስተዋወቂያ ይጻፉ", tab: "myprofile" },
      { ok: !!(p.occupation || "").trim(), pts: 10, en: "Say what you do for work", am: "ሥራዎን ይጥቀሱ", tab: "myprofile" },
      { ok: !!(p.religion && p.lifestyle && p.looking_for), pts: 10, en: "Fill in religion, lifestyle and what you're looking for", am: "ሃይማኖት፣ አኗኗር እና የሚፈልጉትን ይሙሉ", tab: "myprofile" },
      { ok: !!p.is_verified, pts: 25, en: "Get verified — verified profiles get more replies", am: "ማረጋገጫ ያግኙ — የተረጋገጡ መገለጫዎች ብዙ ምላሽ ያገኛሉ", tab: "myprofile" }
    ];
    var score = 0, next = null;
    items.forEach(function (i) { if (i.ok) score += i.pts; else if (!next) next = i; });
    return { score: score, next: next };
  }
  function paintStrength() {
    var home = $("homePanel");
    if (!home || home.style.display === "none") return;
    var p; try { p = myProfile; } catch (e) { return; }
    var c = $("wgStrength");
    if (!p) { if (c) c.remove(); return; }
    var s = strength(p);
    if (s.score >= 100) { if (c) c.remove(); return; }
    var html = '<div class="wg-ring" style="--p:' + s.score + '"><span>' + s.score + '%</span></div>' +
      '<div class="wg-strength-text"><strong>' + (amharic() ? "የመገለጫዎ ጥንካሬ" : "Your profile strength") + '</strong>' +
      '<span>' + esc(amharic() ? s.next.am : s.next.en) + '</span></div>' +
      '<button type="button" class="wg-strength-go">' + (amharic() ? "አሻሽል" : "Improve") + '</button>';
    if (!c) {
      c = document.createElement("div"); c.id = "wgStrength"; c.className = "wg-strength";
      var hero = home.querySelector(".wana-hero"); if (!hero) return;
      hero.insertAdjacentElement("afterend", c);
      c.addEventListener("click", function (e) { if (e.target.closest(".wg-strength-go") && typeof switchTab === "function") switchTab("myprofile"); });
    }
    if (c._html !== html) { c.innerHTML = html; c._html = html; }
  }
  setInterval(paintStrength, 2000);
})();
