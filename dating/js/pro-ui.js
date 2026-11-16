/* Wana Dating — professional layout pass: grouped icon menu, personal greeting with live counts,
   compact Browse filters. Pure DOM/CSS; no data access beyond reading what the page already shows. */
(function () {
  "use strict";
  var ICONS = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    sparkles: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z"/>',
    pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',
    message: '<path d="M21 12a8 8 0 01-11.5 7.2L3 21l1.8-5.5A8 8 0 1121 12z"/>',
    phone: '<path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 000-7.8z"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
    match: '<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    buoy: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="M4.9 4.9l4.3 4.3M14.8 14.8l4.3 4.3M14.8 9.2l4.3-4.3M4.9 19.1l4.3-4.3"/>',
    user: '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>'
  };
  var BY_TAB = { home: "home", browse: "search", newmembers: "sparkles", post: "pencil", messages: "message", calls: "phone", likes: "heart", visitors: "eye", compatibility: "match", dateplans: "calendar", safety: "shield", support: "buoy", myprofile: "user", settings: "lock" };
  var BY_EMOJI = { "🏠": "home", "🔍": "search", "🆕": "sparkles", "✍️": "pencil", "✍": "pencil", "💬": "message", "📞": "phone", "💛": "heart", "👣": "eye", "❤️": "match", "❤": "match", "📅": "calendar", "🛡️": "shield", "🛡": "shield", "🛟": "buoy", "👤": "user", "⚙️": "lock", "⚙": "lock" };
  function svg(key) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[key] || ICONS.home) + "</svg>"; }

  /* ---- Sidebar ---- */
  function sidebar() {
    var nav = document.querySelector(".side-nav");
    if (!nav || nav.getAttribute("data-pro") === "1") return;
    nav.setAttribute("data-pro", "1");
    nav.querySelectorAll(".tab").forEach(function (t) {
      var icon = t.querySelector(".side-icon"); if (!icon) return;
      var key = BY_TAB[t.getAttribute("data-tab")] || BY_EMOJI[(icon.textContent || "").trim()];
      if (key) icon.innerHTML = svg(key);
    });
    function label(beforeTab, text) {
      var t = nav.querySelector('.tab[data-tab="' + beforeTab + '"]'); if (!t) return;
      var g = document.createElement("div"); g.className = "side-group"; g.textContent = text; nav.insertBefore(g, t);
    }
    label("home", "Discover"); label("messages", "Connect"); label("compatibility", "Plan"); label("safety", "Safety & account");
  }

  /* ---- Home greeting + live counts ---- */
  function hello() {
    var h = new Date().getHours();
    return h < 12 ? "Good morning" : (h < 18 ? "Good afternoon" : "Good evening");
  }
  function badgeNum(id) { var e = document.getElementById(id); var n = e ? parseInt((e.textContent || "").replace(/\D/g, ""), 10) : 0; return isNaN(n) ? 0 : n; }
  var greet, chips = {};
  function chip(key, icon, label, tab) {
    var b = document.createElement("button"); b.type = "button"; b.className = "pro-chip is-quiet";
    b.innerHTML = svg(icon); var s = document.createElement("span"); s.textContent = label; b.appendChild(s);
    var n = document.createElement("b"); n.textContent = "0"; b.appendChild(n);
    b.addEventListener("click", function () { if (typeof switchTab === "function") switchTab(tab); });
    chips[key] = { el: b, num: n, label: s };
    return b;
  }
  function mountGreeting() {
    var panel = document.getElementById("homePanel"); if (!panel || greet) return;
    greet = document.createElement("div"); greet.className = "pro-greet";
    var h2 = document.createElement("h2"); h2.id = "proGreetTitle";
    var p = document.createElement("p"); p.textContent = "Here is what is happening on your profile today.";
    var row = document.createElement("div"); row.className = "pro-chips";
    row.appendChild(chip("msg", "message", "Unread messages", "messages"));
    row.appendChild(chip("likes", "heart", "New likes", "likes"));
    row.appendChild(chip("visits", "eye", "Profile visitors", "visitors"));
    greet.appendChild(h2); greet.appendChild(p); greet.appendChild(row);
    panel.insertBefore(greet, panel.firstChild);
  }
  function updateGreeting() {
    if (!greet) return;
    var name = "";
    try { if (typeof myProfile !== "undefined" && myProfile && myProfile.display_name) name = String(myProfile.display_name).split(" ")[0]; } catch (e) {}
    document.getElementById("proGreetTitle").textContent = hello() + (name ? ", " + name : "") + " 👋";
    var map = { msg: badgeNum("unreadBadge") || badgeNum("mnavUnreadBadge"), likes: badgeNum("likesBadge") || badgeNum("mnavLikesBadge"), visits: badgeNum("visitorsBadge") };
    Object.keys(map).forEach(function (k) {
      var c = chips[k]; if (!c) return;
      c.num.textContent = map[k] > 99 ? "99+" : String(map[k]);
      c.el.classList.toggle("is-quiet", map[k] === 0);
    });
  }

  /* ---- Browse: compact filters ---- */
  function filters() {
    var box = document.querySelector("#browsePanel .filters");
    if (!box || box.getAttribute("data-pro") === "1") return;
    box.setAttribute("data-pro", "1");
    var adv = document.createElement("div"); adv.id = "advFilters";
    var ids = ["filterReligion", "filterLifestyle", "filterHasKids", "filterWantsKids"];
    var fields = ids.map(function (i) { return document.getElementById(i); }).filter(Boolean);
    if (!fields.length) return;
    var anchor = box.querySelector('button[onclick^="loadProfiles"]');
    fields.forEach(function (f) { adv.appendChild(f); });
    var tgl = document.createElement("button"); tgl.type = "button"; tgl.className = "adv-toggle"; tgl.setAttribute("aria-expanded", "false");
    tgl.innerHTML = '<span>More filters</span><span class="adv-count">0</span>' + svg("chevron");
    tgl.addEventListener("click", function () { var o = box.classList.toggle("adv-open"); tgl.setAttribute("aria-expanded", o ? "true" : "false"); });
    function count() {
      var n = fields.filter(function (f) { return f.value; }).length;
      var c = tgl.querySelector(".adv-count"); c.textContent = String(n); tgl.classList.toggle("has-count", n > 0);
    }
    fields.forEach(function (f) { f.addEventListener("change", count); });
    box.addEventListener("click", function (e) { if (e.target && /clearBrowseFilters|Clear filters/i.test((e.target.getAttribute("onclick") || "") + e.target.textContent)) setTimeout(count, 50); });
    if (anchor) { box.insertBefore(tgl, anchor); } else { box.appendChild(tgl); }
    box.appendChild(adv);
    count();
  }

  function tick() { sidebar(); filters(); if (typeof currentUser !== "undefined" && currentUser) { mountGreeting(); updateGreeting(); } }
  function init() { tick(); setInterval(tick, 2000); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
