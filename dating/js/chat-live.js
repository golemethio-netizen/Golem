/* Wana Dating — live chat touches: "typing…" indicator and "Seen" updating without a refresh.
 * Sits on top of app.js (uses its globals: _supabase, currentUser, currentOpenThread, openThread). Fails quietly. */
(function () {
  "use strict";
  var typChan = null, typPeer = null, lastSent = 0, hideTimer = null, readChan = null, boundEl = null;

  function pairName(a, b) { return "typing:" + [a, b].sort().join("-"); }
  function amharic() { try { return typeof currentLang !== "undefined" && currentLang === "am"; } catch (e) { return false; } }

  function showTyping() {
    var box = document.getElementById("threadMessages");
    if (!box) return;
    var el = document.getElementById("wgTyping");
    if (!el) {
      el = document.createElement("div"); el.id = "wgTyping"; el.className = "wg-typing"; el.setAttribute("aria-label", amharic() ? "እየጻፈ ነው" : "typing");
      el.innerHTML = "<span></span><span></span><span></span>";
      box.appendChild(el);
    }
    var near = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
    if (near) box.scrollTop = box.scrollHeight;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(clearTyping, 4000);
  }
  function clearTyping() { clearTimeout(hideTimer); var el = document.getElementById("wgTyping"); if (el) el.remove(); }

  function joinTyping(other) {
    if (typPeer === other && typChan) return;
    leaveTyping();
    try {
      typPeer = other;
      typChan = _supabase.channel(pairName(currentUser.id, other), { config: { broadcast: { self: false } } });
      typChan.on("broadcast", { event: "typing" }, function (m) {
        if (m && m.payload && m.payload.from === other && currentOpenThread && currentOpenThread.other === other) showTyping();
      }).on("broadcast", { event: "stop" }, function (m) {
        if (m && m.payload && m.payload.from === other) clearTyping();
      }).subscribe();
    } catch (e) { typChan = null; typPeer = null; }
  }
  function leaveTyping() {
    try { if (typChan) _supabase.removeChannel(typChan); } catch (e) {}
    typChan = null; typPeer = null; clearTyping();
  }
  function sendTyping(ev) {
    if (!typChan || !currentUser) return;
    var now = Date.now();
    if (ev === "typing") { if (now - lastSent < 2500) return; lastSent = now; } else lastSent = 0;
    try { typChan.send({ type: "broadcast", event: ev, payload: { from: currentUser.id } }); } catch (e) {}
  }

  /* The thread window is re-drawn on every new message, so (re)bind whenever a fresh reply box appears. */
  function bind() {
    var other = (typeof currentOpenThread !== "undefined" && currentOpenThread) ? currentOpenThread.other : null;
    var reply = document.getElementById("replyBody");
    if (!other || !reply || !currentUser) { if (!other) leaveTyping(); return; }
    joinTyping(other);
    if (boundEl === reply) return;
    boundEl = reply;
    reply.addEventListener("input", function () { if (reply.value.trim()) sendTyping("typing"); else sendTyping("stop"); });
    reply.addEventListener("blur", function () { sendTyping("stop"); });
  }
  var pending = false;
  new MutationObserver(function () {
    if (pending) return; pending = true;
    setTimeout(function () { pending = false; try { bind(); } catch (e) {} }, 120);
  }).observe(document.documentElement, { childList: true, subtree: true });

  /* "Seen" live: when the other person reads my message, update the open conversation at once. */
  function watchReads() {
    if (readChan || !currentUser) return;
    try {
      readChan = _supabase.channel("dating-reads:" + currentUser.id)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "dating_messages", filter: "sender_id=eq." + currentUser.id }, function (p) {
          var n = p && p.new; if (!n || !n.read) return;
          var t = currentOpenThread; if (!t || t.other !== n.recipient_id) return;
          var m = (t.messages || []).find(function (x) { return x.id === n.id; });
          if (!m || m.read) return;
          m.read = true;
          if (typeof openThread === "function") openThread(t);
        }).subscribe();
    } catch (e) { readChan = null; }
  }
  setInterval(function () {
    if (typeof currentUser !== "undefined" && currentUser) watchReads();
    else if (readChan) { try { _supabase.removeChannel(readChan); } catch (e) {} readChan = null; leaveTyping(); }
  }, 3000);
})();
