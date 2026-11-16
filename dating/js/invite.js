/* Wana Dating: invite & share links.
   - Remembers ?ref=CODE from an invite link, so the new member's profile records who invited them.
   - Adds an "Invite friends" card at the top of Home with Share / Copy / WhatsApp / Telegram.
   Needs: dating-migration-v70-referrals.sql (the count line stays hidden until it is installed).
   Uses globals from app.js: _supabase, currentUser, myProfile. All text via textContent. */
(function () {
  "use strict";
  var REF_RE = /^WGD-\d{4}-[A-Z0-9]{6}$/;
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  // 1. Remember who invited this visitor.
  try {
    var ref = new URLSearchParams(location.search).get("ref");
    if (ref && REF_RE.test(ref.toUpperCase())) store("wg_ref", ref.toUpperCase());
  } catch (e) {}

  function el(tag, props, kids) {
    var e = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === "style") e.style.cssText = props[k];
      else if (k === "text") e.textContent = props[k];
      else if (k.indexOf("on") === 0) e.addEventListener(k.slice(2), props[k]);
      else e.setAttribute(k, props[k]);
    });
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }

  var card, linkInput, countEl, msgEl, lastCode = "\u0000", sharedText = "Meet genuine singles for friendship, dating or marriage on Wana Dating. Verified profiles and safe chat.";

  function inviteUrl() {
    var code = (typeof myProfile !== "undefined" && myProfile && myProfile.profile_code) || "";
    var base = "https://www.wanagebya.com/dating/";
    return code && REF_RE.test(code) ? base + "?ref=" + encodeURIComponent(code) : base;
  }
  function say(t) { if (msgEl) { msgEl.textContent = t || ""; clearTimeout(say.t); if (t) say.t = setTimeout(function () { msgEl.textContent = ""; }, 3000); } }

  function copy() {
    var url = inviteUrl();
    var done = function () { say("Link copied ✅"); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { fallbackCopy(url, done); });
    else fallbackCopy(url, done);
  }
  function fallbackCopy(url, done) {
    try { linkInput.focus(); linkInput.select(); document.execCommand("copy"); done(); } catch (e) { say("Press and hold the link to copy it."); }
  }
  function share() {
    var url = inviteUrl();
    if (navigator.share) { navigator.share({ title: "Wana Dating", text: sharedText, url: url }).catch(function () {}); }
    else copy();
  }
  function openUrl(u) { window.open(u, "_blank", "noopener"); }
  function btn(label, bg, fg, fn) {
    return el("button", { type: "button", onclick: fn, style: "flex:1 1 auto;min-width:96px;border:0;border-radius:999px;padding:10px 14px;font-weight:700;font-size:.85rem;cursor:pointer;background:" + bg + ";color:" + fg + ";font-family:inherit", text: label });
  }

  function paint() {
    var url = inviteUrl();
    if (linkInput && linkInput.value !== url) linkInput.value = url;
    var code = (typeof myProfile !== "undefined" && myProfile && myProfile.profile_code) || "";
    if (code !== lastCode) { lastCode = code; loadCount(); }
  }
  async function loadCount() {
    if (!countEl || typeof currentUser === "undefined" || !currentUser) return;
    try {
      var r = await _supabase.rpc("dating_my_referral_count");
      if (!r.error && typeof r.data === "number") {
        countEl.textContent = r.data > 0 ? "🎉 " + r.data + (r.data === 1 ? " friend has" : " friends have") + " joined with your link." : "";
      }
    } catch (e) {}
  }

  function mount() {
    var panel = document.getElementById("homePanel");
    if (!panel || card) return;
    linkInput = el("input", { type: "text", readonly: "readonly", "aria-label": "Your invite link", style: "flex:1;min-width:0;border:1px solid var(--line,#e8eaef);border-radius:10px;padding:9px 12px;font-size:.85rem;background:var(--paper,#f6f7f9);color:var(--ink-soft,#3d4450)" });
    linkInput.addEventListener("focus", function () { linkInput.select(); });
    countEl = el("div", { style: "font-size:.85rem;font-weight:600;color:var(--green-dark,#b8294f);margin-top:8px" });
    msgEl = el("div", { role: "status", style: "font-size:.82rem;font-weight:600;color:#1b7f3b;min-height:1.1em;margin-top:6px" });
    card = el("div", { id: "inviteCard", style: "background:var(--surface,#fff);border:1px solid var(--line,#e8eaef);border-radius:14px;padding:16px;margin:0 0 16px;box-shadow:0 4px 16px rgba(18,20,26,.05)" }, [
      el("div", { style: "display:flex;align-items:center;gap:10px;margin-bottom:6px" }, [
        el("span", { "aria-hidden": "true", style: "width:34px;height:34px;border-radius:50%;background:var(--green-soft,#fdecf1);display:flex;align-items:center;justify-content:center", text: "💌" }),
        el("strong", { style: "font-family:var(--font-display,Georgia,serif);font-size:1.1rem", text: "Invite friends to Wana Dating" })
      ]),
      el("p", { style: "margin:0 0 10px;font-size:.9rem;color:var(--ink-soft,#3d4450);line-height:1.45", text: "More genuine people means better matches for everyone. Share your link." }),
      el("div", { style: "display:flex;gap:8px;margin-bottom:10px" }, [linkInput, btn("Copy", "var(--green-soft,#fdecf1)", "var(--green-dark,#b8294f)", copy)]),
      el("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, [
        btn("Share", "var(--green,#e0426f)", "#fff", share),
        btn("WhatsApp", "#25d366", "#fff", function () { openUrl("https://wa.me/?text=" + encodeURIComponent(sharedText + " " + inviteUrl())); }),
        btn("Telegram", "#229ed9", "#fff", function () { openUrl("https://t.me/share/url?url=" + encodeURIComponent(inviteUrl()) + "&text=" + encodeURIComponent(sharedText)); })
      ]),
      countEl, msgEl
    ]);
    panel.insertBefore(card, panel.firstChild);
    paint();
  }

  function tick() {
    if (typeof currentUser === "undefined" || !currentUser) { if (card) { card.style.display = "none"; } return; }
    mount();
    if (card) { card.style.display = ""; paint(); }
  }
  function init() { tick(); setInterval(tick, 2000); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
