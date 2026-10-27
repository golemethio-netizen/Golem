/* Wana Dating — Call history: dialed, received, missed and declined calls, with duration.
 * Adds a "Calls" tab. Requires dating-migration-v53-call-history.sql.
 * Uses globals from app.js / calls.js: _supabase, currentUser, esc, fetchBlockedIds, switchTab, startCall.
 * Everything from the database is escaped before it is shown. */
(function () {
  "use strict";

  var filter = "all";          // all | missed
  var cache = [];              // [{call, peerId, peer, kind, dur}]
  var LIMIT = 100;

  function seenKey() { return "wg_calls_seen_" + (currentUser && currentUser.id); }
  function getSeen() { try { return localStorage.getItem(seenKey()) || ""; } catch (e) { return ""; } }
  function setSeen(iso) { try { localStorage.setItem(seenKey(), iso); } catch (e) {} }

  // kind: out | in | missed | noanswer | declined_out | declined_in
  function classify(c, me) {
    var outgoing = c.caller_id === me;
    var answered = !!c.answered_at || c.status === "accepted";
    var stale = c.status === "ringing" && (Date.now() - new Date(c.started_at).getTime() > 2 * 60 * 1000);
    if (answered) return outgoing ? "out" : "in";
    if (c.status === "declined") return outgoing ? "declined_out" : "declined_in";
    if (c.status === "ringing" && !stale) return "ringing";
    return outgoing ? "noanswer" : "missed";
  }
  function duration(c) {
    if (!c.answered_at || !c.ended_at) return "";
    var s = Math.max(0, Math.round((new Date(c.ended_at) - new Date(c.answered_at)) / 1000));
    var m = Math.floor(s / 60), r = s % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }
  function when(iso) {
    var d = new Date(iso), now = new Date();
    var t = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (d.toDateString() === now.toDateString()) return "Today, " + t;
    var y = new Date(); y.setDate(now.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return "Yesterday, " + t;
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" }) + ", " + t;
  }
  var LABEL = {
    out:          ['<span class="call-dir out">↗ Outgoing</span>'],
    in:           ['<span class="call-dir in">↙ Incoming</span>'],
    missed:       ['<span class="call-dir miss">↙ Missed call</span>'],
    noanswer:     ['<span class="call-dir miss">↗ No answer</span>'],
    declined_out: ['<span class="call-dir miss">↗ Declined</span>'],
    declined_in:  ['<span class="call-dir in">↙ You declined</span>'],
    ringing:      ['<span class="call-dir in">Ringing…</span>']
  };

  async function fetchCalls() {
    var me = currentUser.id;
    var r = await _supabase.from("dating_calls").select("*")
      .or("caller_id.eq." + me + ",recipient_id.eq." + me)
      .order("started_at", { ascending: false }).limit(LIMIT);
    if (r.error) return { error: r.error };
    var calls = r.data || [];
    var blocked = typeof fetchBlockedIds === "function" ? await fetchBlockedIds() : new Set();
    var ids = {};
    calls.forEach(function (c) { ids[c.caller_id === me ? c.recipient_id : c.caller_id] = 1; });
    var peers = {};
    var list = Object.keys(ids);
    if (list.length) {
      var p = await _supabase.from("dating_profiles")
        .select("user_id, display_name, gender, photo_url, photos, is_verified, call_privacy").in("user_id", list);
      (p.data || []).forEach(function (x) { peers[x.user_id] = x; });
    }
    var rows = calls.map(function (c) {
      var peerId = c.caller_id === me ? c.recipient_id : c.caller_id;
      return { call: c, peerId: peerId, peer: peers[peerId] || null, kind: classify(c, me), dur: duration(c) };
    }).filter(function (x) { return !blocked.has(x.peerId); });
    return { rows: rows };
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function render() {
    var box = document.getElementById("callsList");
    if (!box) return;
    box.innerHTML = "";
    var rows = cache.filter(function (x) { return filter === "all" || x.kind === "missed"; });
    if (!rows.length) {
      box.appendChild(el("div", "calls-empty", filter === "missed" ? "No missed calls. 🎉" : "No calls yet. Open a chat and tap 📞 to call a match."));
      return;
    }
    var canDial = !(typeof isPlatinumActive === "function") || isPlatinumActive(myProfile);
    rows.forEach(function (x) {
      var row = el("div", "call-row" + (x.kind === "missed" ? " missed" : ""));
      var name = x.peer ? (x.peer.display_name || x.peer.gender || "Someone") : "Someone";
      var photo = x.peer ? ((x.peer.photos && x.peer.photos[0]) || x.peer.photo_url) : null;
      var av = el("div", "call-avatar", photo ? "" : "👤");
      if (photo && /^https?:\/\//i.test(photo)) av.style.backgroundImage = "url('" + photo.replace(/'/g, "%27") + "')";
      else if (photo) av.setAttribute("data-profile-media-bg", photo);
      if (typeof viewProfileFromThread === "function") av.onclick = function () { viewProfileFromThread(x.peerId); };
      var main = el("div", "call-main");
      main.appendChild(el("div", "call-name", name));
      var det = el("div", "call-detail");
      det.innerHTML = LABEL[x.kind][0];
      det.appendChild(el("span", "", "· " + when(x.call.started_at)));
      if (x.dur) det.appendChild(el("span", "", "· " + x.dur));
      main.appendChild(det);
      var btn = el("button", "call-back", "📞");
      btn.type = "button";
      btn.setAttribute("aria-label", "Call " + name);
      var allowed = canDial && (typeof canCall !== "function" || !x.peer || canCall(x.peer));
      if (!allowed) { btn.disabled = true; btn.title = canDial ? "This person isn't accepting calls right now" : "Voice calls are a Platinum feature"; }
      else btn.onclick = function () { if (window.startCall) window.startCall(x.peerId, name); };
      row.appendChild(av); row.appendChild(main); row.appendChild(btn);
      box.appendChild(row);
    });
  }

  function paintBadge(n) {
    ["callsBadge", "callsMoreBadge"].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.textContent = n > 0 ? (n > 9 ? "9+" : String(n)) : "";
    });
  }

  async function refreshBadge() {
    if (!currentUser) return;
    var res = await fetchCalls();
    if (res.error) return;
    var seen = getSeen();
    var n = res.rows.filter(function (x) { return x.kind === "missed" && (!seen || x.call.started_at > seen); }).length;
    paintBadge(n);
  }

  window.loadCallHistory = async function () {
    var box = document.getElementById("callsList");
    if (!box || !currentUser) return;
    box.innerHTML = "";
    box.appendChild(el("div", "calls-empty", "Loading…"));
    var res = await fetchCalls();
    if (res.error) {
      box.innerHTML = "";
      box.appendChild(el("div", "calls-empty", /answered_at|does not exist|schema cache/i.test(res.error.message || "")
        ? "Call history isn't set up yet. Please contact Support."
        : "Couldn't load your calls: " + res.error.message));
      return;
    }
    cache = res.rows;
    render();
    setSeen(new Date().toISOString());   // opening the tab clears the missed-call badge
    paintBadge(0);
  };

  window.setCallsFilter = function (f) {
    filter = f;
    document.querySelectorAll("#callsPanel .calls-chip").forEach(function (b) { b.classList.toggle("active", b.dataset.f === f); });
    render();
  };

  // Keep the badge current: after sign-in, and each time a call ends.
  function init() {
    var tries = 0;
    var t = setInterval(function () {
      if (typeof currentUser !== "undefined" && currentUser) { clearInterval(t); refreshBadge(); }
      else if (++tries > 40) clearInterval(t);
    }, 500);
    if (typeof window.endCall === "function" && !window.endCall.__hist) {
      var orig = window.endCall;
      window.endCall = async function () {
        var r = await orig.apply(this, arguments);
        setTimeout(function () {
          var open = document.getElementById("callsPanel") && document.getElementById("callsPanel").style.display === "block";
          if (open) window.loadCallHistory(); else refreshBadge();
        }, 800);
        return r;
      };
      window.endCall.__hist = true;
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
