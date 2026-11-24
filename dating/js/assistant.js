/* Wana Dating — AI help assistant (floating "Help" chat for signed-in members).
   Answers come from the FAQ in assistant-faq.js (no AI service, no cost). All text is added with textContent (no innerHTML). */
(function () {
  "use strict";
  var btn, panel, list, input, sendBtn, busy = false, history = [], built = false;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }

  function styles() {
    var s = document.createElement("style");
    s.textContent =
      ".wa-btn{position:fixed;right:18px;bottom:84px;z-index:900;display:flex;align-items:center;gap:8px;padding:11px 16px;border:0;border-radius:999px;background:var(--green,#e0426f);color:#fff;font:600 .9rem var(--font,sans-serif);box-shadow:0 8px 24px rgba(224,66,111,.35);cursor:pointer}" +
      ".wa-btn:hover{background:var(--green-dark,#b8294f)}" +
      ".wa-panel{position:fixed;right:18px;bottom:84px;z-index:901;width:min(380px,calc(100vw - 24px));height:min(540px,calc(100vh - 110px));display:none;flex-direction:column;background:var(--surface,#fff);border:1px solid var(--line,#e8eaef);border-radius:18px;box-shadow:0 12px 40px rgba(18,20,26,.18);overflow:hidden}" +
      ".wa-panel.open{display:flex}" +
      ".wa-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--green,#e0426f);color:#fff}" +
      ".wa-head b{font:600 1rem var(--font,sans-serif)}.wa-head small{display:block;opacity:.85;font-size:.72rem}" +
      ".wa-x{background:none;border:0;color:#fff;font-size:1.4rem;line-height:1;cursor:pointer}" +
      ".wa-list{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:var(--paper,#f6f7f9)}" +
      ".wa-m{max-width:86%;padding:9px 12px;border-radius:14px;font-size:.9rem;line-height:1.4;white-space:pre-wrap;word-wrap:break-word}" +
      ".wa-m.bot{align-self:flex-start;background:#fff;border:1px solid var(--line,#e8eaef);color:var(--ink,#12141a)}" +
      ".wa-m.me{align-self:flex-end;background:var(--green,#e0426f);color:#fff}" +
      ".wa-m.err{align-self:flex-start;background:var(--danger-soft,#fdecec);color:var(--danger,#e5484d)}" +
      ".wa-chips{display:flex;flex-wrap:wrap;gap:6px}.wa-chip{border:1px solid var(--line-strong,#d5d9e2);background:#fff;border-radius:999px;padding:6px 10px;font-size:.78rem;cursor:pointer;color:var(--ink-soft,#3d4450)}" +
      ".wa-foot{display:flex;gap:8px;padding:10px;border-top:1px solid var(--line,#e8eaef);background:#fff}" +
      ".wa-foot input{flex:1;min-width:0;border:1px solid var(--line-strong,#d5d9e2);border-radius:999px;padding:9px 14px;font:.9rem var(--font,sans-serif)}" +
      ".wa-foot button{border:0;border-radius:999px;padding:0 16px;background:var(--green,#e0426f);color:#fff;font-weight:600;cursor:pointer}.wa-foot button:disabled{opacity:.5;cursor:default}" +
      ".wa-note{padding:6px 12px 8px;font-size:.7rem;color:var(--muted,#6b7280);background:#fff;text-align:center}" +
      "@media(max-width:820px){.wa-btn{bottom:78px}.wa-panel{bottom:78px;right:12px}}";
    document.head.appendChild(s);
  }

  function add(text, cls) {
    var m = el("div", "wa-m " + cls, text);
    list.appendChild(m); list.scrollTop = list.scrollHeight; return m;
  }

  function build() {
    if (built) return; built = true; styles();
    btn = el("button", "wa-btn"); btn.type = "button"; btn.setAttribute("aria-label", "Open help assistant");
    btn.appendChild(el("span", "", "💬")); btn.appendChild(el("span", "", "Help"));
    panel = el("div", "wa-panel"); panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Wana Dating help");
    var head = el("div", "wa-head"); var t = el("div"); t.appendChild(el("b", "", "Wana Dating Help")); t.appendChild(el("small", "", "Quick answers about the site"));
    var x = el("button", "wa-x", "×"); x.type = "button"; x.setAttribute("aria-label", "Close"); x.addEventListener("click", toggle);
    head.appendChild(t); head.appendChild(x);
    list = el("div", "wa-list");
    var foot = el("div", "wa-foot"); input = el("input"); input.type = "text"; input.maxLength = 500; input.placeholder = "Ask a question…";
    sendBtn = el("button", "", "Send"); sendBtn.type = "button";
    foot.appendChild(input); foot.appendChild(sendBtn);
    var note = el("div", "wa-note", "For account or payment problems use the Support tab. Never share your password.");
    panel.appendChild(head); panel.appendChild(list); panel.appendChild(foot); panel.appendChild(note);
    document.body.appendChild(btn); document.body.appendChild(panel);
    btn.addEventListener("click", toggle);
    sendBtn.addEventListener("click", send);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); send(); } });
    add("Hi! I can help with messages, verification, Platinum, safety and how Wana Dating works. What would you like to know?", "bot");
    var chips = el("div", "wa-chips");
    ["How do I get verified?", "What can Basic members do?", "Why can't I call someone?", "How do I stay safe?"].forEach(function (q) {
      var c = el("button", "wa-chip", q); c.type = "button"; c.addEventListener("click", function () { input.value = q; send(); chips.remove(); }); chips.appendChild(c);
    });
    list.appendChild(chips);
  }

  function toggle() {
    var open = panel.classList.toggle("open");
    btn.style.display = open ? "none" : "flex";
    if (open) setTimeout(function () { input.focus(); }, 50);
  }

  function addChips(items) {
    var chips = el("div", "wa-chips");
    items.forEach(function (q) {
      var c = el("button", "wa-chip", q); c.type = "button";
      c.addEventListener("click", function () { input.value = q; chips.remove(); send(); });
      chips.appendChild(c);
    });
    list.appendChild(chips); list.scrollTop = list.scrollHeight;
  }

  function send() {
    var q = (input.value || "").trim();
    if (!q || busy) return;
    if (!window.WanaFAQ) { add("The help assistant is not available right now.", "err"); return; }
    input.value = "";
    add(q, "me");
    var wait = add("…", "bot");
    setTimeout(function () {
      var r = window.WanaFAQ.answer(q);
      wait.textContent = r.text;
      if (r.more && r.more.length) addChips(r.more);
      list.scrollTop = list.scrollHeight;
    }, 350);
  }

  function tick() {
    var signedIn = typeof currentUser !== "undefined" && currentUser;
    if (signedIn) build();
    if (built) { btn.style.display = signedIn && !panel.classList.contains("open") ? "flex" : "none"; if (!signedIn) panel.classList.remove("open"); }
  }
  function init() { tick(); setInterval(tick, 2000); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
