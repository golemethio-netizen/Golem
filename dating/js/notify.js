/* Wana Dating — phone/browser notifications (push) + email choices.
 *
 * Adds a "Notifications" card to Settings, and a small "Turn on notifications" bar.
 * Does nothing until GolemConfig.vapidPublicKey is set in config.js, so it is safe to
 * ship before the server side is ready.
 * Needs: dating-migration-v48 + v49, dating/sw.js, the dating-notify Netlify function.
 * Uses globals from app.js: _supabase, currentUser, signOut.  All text via textContent.
 */
(function () {
  "use strict";

  var KEY = (typeof GolemConfig !== "undefined" && GolemConfig && GolemConfig.vapidPublicKey) || "";
  if (!KEY) return;

  var card, statusEl, enableBtn, boxes = {}, msgEl, bar;

  function supported() {
    return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  }
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }
  function standalone() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  }
  function b64ToBytes(s) {
    var pad = "=".repeat((4 - (s.length % 4)) % 4);
    var raw = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function bytesToB64Url(buf) {
    var s = "", b = new Uint8Array(buf);
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
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
  function say(t, ok) { if (msgEl) { msgEl.textContent = t || ""; msgEl.style.color = ok ? "#1b7f3b" : "#b3261e"; } }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  async function registration() {
    return navigator.serviceWorker.register("/dating/sw.js", { scope: "/dating/" }).then(function () {
      return navigator.serviceWorker.ready;
    });
  }
  async function currentSub() {
    if (!supported()) return null;
    var reg = await navigator.serviceWorker.getRegistration("/dating/");
    return reg ? reg.pushManager.getSubscription() : null;
  }

  async function turnOn() {
    if (!currentUser) return;
    if (!supported()) { say("This browser can't receive notifications.", false); return; }
    enableBtn.disabled = true; say("");
    try {
      var perm = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
      if (perm !== "granted") { say("Notifications are blocked. Allow them in your browser's site settings, then try again.", false); return; }
      var reg = await registration();
      var sub = (await reg.pushManager.getSubscription()) ||
        await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(KEY) });
      var res = await _supabase.rpc("dating_save_push_subscription", {
        p_endpoint: sub.endpoint,
        p_p256dh: bytesToB64Url(sub.getKey("p256dh")),
        p_auth: bytesToB64Url(sub.getKey("auth")),
        p_ua: navigator.userAgent
      });
      if (res.error) { say("Couldn't turn on notifications: " + res.error.message, false); return; }
      await savePrefs(true);
      say("Notifications are on for this device.", true);
      hideBar();
    } catch (e) {
      say("Couldn't turn on notifications: " + (e && e.message ? e.message : e), false);
    } finally {
      enableBtn.disabled = false; paint();
    }
  }

  async function turnOff() {
    enableBtn.disabled = true;
    try {
      var sub = await currentSub();
      if (sub) {
        await _supabase.rpc("dating_delete_push_subscription", { p_endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      say("Notifications are off for this device.", true);
    } catch (e) { say("Couldn't turn off: " + (e && e.message ? e.message : e), false); }
    enableBtn.disabled = false; paint();
  }

  async function paint() {
    if (!statusEl) return;
    var sub = null;
    try { sub = await currentSub(); } catch (e) {}
    var on = !!sub && Notification.permission === "granted";
    if (!supported()) {
      statusEl.textContent = isIOS() && !standalone()
        ? "On iPhone, first add Wana Dating to your Home Screen (Share → Add to Home Screen), then open it from there to turn on notifications."
        : "This browser doesn't support notifications.";
      enableBtn.style.display = "none";
    } else if (Notification.permission === "denied") {
      statusEl.textContent = "Notifications are blocked for this site. Allow them in your browser's site settings.";
      enableBtn.style.display = "none";
    } else {
      statusEl.textContent = on ? "On for this device." : "Off for this device.";
      enableBtn.style.display = "";
      enableBtn.textContent = on ? "Turn off on this device" : "Turn on notifications";
      enableBtn.onclick = on ? turnOff : turnOn;
    }
  }

  async function loadPrefs() {
    if (!currentUser) return;
    var r = await _supabase.from("dating_notification_prefs").select("*").eq("user_id", currentUser.id).maybeSingle();
    var p = (r && r.data) || {};
    boxes.notify_messages.checked = p.notify_messages !== false;
    boxes.notify_matches.checked = p.notify_matches !== false;
    boxes.notify_likes.checked = p.notify_likes !== false;
    boxes.notify_dates.checked = p.notify_dates !== false;
    boxes.email_enabled.checked = p.email_enabled === true;
  }

  async function savePrefs(quiet) {
    if (!currentUser) return;
    var row = { user_id: currentUser.id, push_enabled: true, updated_at: new Date().toISOString() };
    Object.keys(boxes).forEach(function (k) { row[k] = boxes[k].checked; });
    var r = await _supabase.from("dating_notification_prefs").upsert(row, { onConflict: "user_id" });
    if (r.error) { if (!quiet) say("Couldn't save: " + r.error.message, false); return; }
    if (!quiet) say("Saved.", true);
  }

  function row(key, label, hint) {
    var cb = el("input", { type: "checkbox", style: "width:18px;height:18px;margin-right:10px;" });
    boxes[key] = cb;
    var lab = el("label", { style: "display:flex;align-items:center;padding:8px 0 2px;font-size:.95rem;cursor:pointer;" }, [cb, el("span", { text: label })]);
    if (!hint) return lab;
    return el("div", {}, [lab, el("small", { style: "display:block;color:#888;margin:0 0 6px 28px;line-height:1.3;", text: hint })]);
  }

  function mountCard() {
    var panel = document.getElementById("settingsPanel");
    if (!panel || document.getElementById("notifySettingsCard")) return;
    statusEl = el("p", { style: "font-size:.9rem;color:#555;margin:0 0 8px;" });
    enableBtn = el("button", { type: "button", class: "submit-btn", style: "width:auto;padding:10px 22px;margin:4px 0 10px;border-radius:8px;cursor:pointer;font-weight:600;font-family:inherit;", text: "Turn on notifications" });
    msgEl = el("div", { style: "margin-top:8px;font-size:.9rem;min-height:1.2em;", role: "status" });
    card = el("div", { id: "notifySettingsCard", style: "background:#fff;border:1px solid var(--line);border-radius:12px;padding:20px;margin-bottom:20px;box-shadow:0 4px 10px rgba(0,0,0,0.03);" }, [
      el("h3", { style: "margin-top:0;", text: "Notifications" }),
      statusEl, enableBtn,
      el("div", { style: "border-top:1px solid var(--line);margin-top:6px;padding-top:8px;" }, [
        el("div", { style: "font-weight:600;font-size:.9rem;margin-bottom:2px;", text: "Tell me about" }),
        row("notify_messages", "New messages"),
        row("notify_matches", "New matches"),
        row("notify_likes", "Likes"),
        row("notify_dates", "Date invitations"),
        el("div", { style: "font-weight:600;font-size:.9rem;margin:10px 0 2px;", text: "Email" }),
        row("email_enabled", "Also email me", "messages, matches and dates (at most one per hour; not available for phone-number accounts)")
      ]),
      el("button", { type: "button", class: "submit-btn", style: "width:auto;padding:10px 22px;margin-top:8px;border-radius:8px;cursor:pointer;font-weight:600;font-family:inherit;", onclick: function () { savePrefs(false); }, text: "Save notification choices" }),
      msgEl
    ]);
    var anchor = document.getElementById("accountControlCard") || (document.getElementById("blockedUsersList") || {}).parentElement;
    if (anchor && anchor.parentElement === panel) panel.insertBefore(card, anchor); else panel.appendChild(card);
    loadPrefs(); paint();
  }

  // ---- slim "turn on" bar ----
  function hideBar() { if (bar) { bar.remove(); bar = null; } }
  async function maybeBar() {
    if (!currentUser || bar || !supported()) return;
    if (Notification.permission !== "default" || store("wg_notify_bar_dismissed")) return;
    var main = document.querySelector("main");
    if (!main) return;
    bar = el("div", { style: "background:#fdecf1;border:1px solid #f4c3d1;color:#7a1c3a;border-radius:10px;padding:10px 14px;margin:0 0 14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:.9rem;" }, [
      el("span", { style: "flex:1;min-width:180px;", text: "🔔 Get a phone alert for new matches and messages." }),
      el("button", { type: "button", style: "background:#e0426f;color:#fff;border:0;border-radius:18px;padding:7px 16px;font-weight:600;cursor:pointer;", text: "Turn on", onclick: function () { mountCard(); turnOn(); } }),
      el("button", { type: "button", "aria-label": "Dismiss", style: "background:none;border:0;font-size:1.1rem;cursor:pointer;color:#7a1c3a;", text: "✕", onclick: function () { store("wg_notify_bar_dismissed", "1"); hideBar(); } })
    ]);
    main.insertBefore(bar, main.firstChild);
  }

  // a shared phone must not keep notifying the previous account after sign-out
  function wrapSignOut() {
    if (typeof window.signOut !== "function" || window.signOut.__notify) return;
    var orig = window.signOut;
    window.signOut = async function () {
      try {
        var sub = await currentSub();
        if (sub) { await _supabase.rpc("dating_delete_push_subscription", { p_endpoint: sub.endpoint }); await sub.unsubscribe(); }
      } catch (e) {}
      return orig.apply(this, arguments);
    };
    window.signOut.__notify = true;
  }

  function wrapSettings() {
    if (typeof window.loadSettings !== "function" || window.loadSettings.__notify) return;
    var orig = window.loadSettings;
    window.loadSettings = async function () {
      var r = await orig.apply(this, arguments);
      mountCard(); loadPrefs(); paint();
      return r;
    };
    window.loadSettings.__notify = true;
  }

  function init() {
    mountCard(); wrapSettings(); wrapSignOut();
    if (supported()) registration().catch(function () {});
    // show the bar a few seconds after sign-in is known
    setTimeout(maybeBar, 4000);
    setInterval(function () { if (!currentUser) hideBar(); }, 5000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
