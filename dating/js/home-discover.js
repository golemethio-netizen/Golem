/* Wana Dating — Home discovery: "Online now", "New members", "Recent photos".
   The community feed and composer move into a collapsed "Community posts" section at the bottom.
   Uses app.js helpers: createProfileCard, visiblePresence, joinedAgoText, fetchBlockedIds, switchTab, loadProfiles. */
(function () {
  "use strict";
  var box, built = false, loading = false, lastLoad = 0;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
  function homeVisible() { var p = document.getElementById("homePanel"); return !!p && p.style.display !== "none" && !document.hidden; }

  function section(id, title, sub, onAll) {
    var s = el("section", "hd-section"); s.id = id; s.style.display = "none";
    var head = el("div", "hd-head");
    var t = el("div"); t.appendChild(el("h3", "", title)); t.appendChild(el("p", "", sub));
    var all = el("button", "hd-all", "See all"); all.type = "button"; all.addEventListener("click", onAll);
    head.appendChild(t); head.appendChild(all);
    var row = el("div", "hd-row"); row.setAttribute("role", "list");
    s.appendChild(head); s.appendChild(row);
    s._row = row; s._head = head;
    return s;
  }

  function build() {
    var col = document.querySelector("#homePanel .wana-feed-column");
    if (!col || built) return;
    built = true;
    box = el("div", "hd-wrap"); box.id = "homeDiscover";
    box.appendChild(section("hdOnline", "Active today", "Online now or active in the last 8 hours", function () {
      var o = document.getElementById("filterOnline"); if (o) o.checked = true;
      switchTab("browse"); if (typeof loadProfiles === "function") loadProfiles();
    }));
    box.appendChild(section("hdNew", "New members", "Just joined Wana Dating", function () { switchTab("newmembers"); }));
    box.appendChild(section("hdPhotos", "Recent photos", "Profiles with fresh photos", function () { switchTab("browse"); }));
    col.insertBefore(box, col.firstChild);

    // Move composer + feed into a collapsed "Community posts" block.
    var composer = col.querySelector(".wana-composer"), feed = document.getElementById("feed"), empty = document.getElementById("feedEmpty");
    if (composer && feed) {
      var d = document.createElement("details"); d.id = "communityPosts"; d.className = "hd-community";
      var sum = document.createElement("summary"); sum.textContent = "Community posts";
      var hint = el("span", "hd-hint", "Share an update or read what members are posting");
      sum.appendChild(hint); d.appendChild(sum);
      composer.parentNode.insertBefore(d, composer);
      d.appendChild(composer); d.appendChild(feed); if (empty) d.appendChild(empty);
    }
  }

  function fill(sec, rows, meta) {
    var row = sec._row; row.textContent = "";
    rows.forEach(function (r) {
      var c = createProfileCard(r, { extraMeta: meta(r) });
      c.setAttribute("role", "listitem");
      row.appendChild(c);
    });
    sec.style.display = rows.length ? "" : "none";
    return rows.length;
  }

  async function load() {
    if (loading || typeof currentUser === "undefined" || !currentUser || typeof _supabase === "undefined") return;
    if (typeof myProfile === "undefined" || !myProfile) return; // need my own gender / interests first
    loading = true;
    try {
      var blocked = new Set();
      try { blocked = await fetchBlockedIds(); } catch (e) {}
      var seeking = "";
      try { seeking = String((myProfile && myProfile.seeking) || "").toLowerCase(); } catch (e) {}
      function base() {
        var q = _supabase.from("dating_profiles").select("*").neq("user_id", currentUser.id);
        if (seeking === "male") q = q.eq("gender", "Male"); else if (seeking === "female") q = q.eq("gender", "Female");
        return q;
      }
      /* Same rules as Browse: both people's interests, age ranges and blocks must fit. */
      function ok(r) {
        if (!r || !r.user_id || blocked.has(r.user_id) || !r.age) return false;
        try { if (typeof myProfile !== "undefined" && myProfile && typeof isEligibleForDating === "function") return !!isEligibleForDating(myProfile, r); } catch (e) {}
        // Fallback: they must also be open to my gender.
        var t = String(r.seeking || "").toLowerCase(), g = String((myProfile && myProfile.gender) || "").toLowerCase();
        return !t || t === "any" || !g || t === g;
      }
      var res = await Promise.all([
        base().gte("last_seen_at", new Date(Date.now() - 8 * 3600 * 1000).toISOString()).order("last_seen_at", { ascending: false }).limit(60),
        base().order("created_at", { ascending: false }).limit(30),
        base().order("updated_at", { ascending: false }).limit(40)
      ]);
      /* Active in the last 8 hours, only for members who share their last-seen time; online members first. */
      var onlineRows = ((res[0] && res[0].data) || []).filter(function (r) { return ok(r) && canSeeLastSeen(r); })
        .sort(function (a, b) {
          var ao = visiblePresence(a).online, bo = visiblePresence(b).online;
          if (ao !== bo) return ao ? -1 : 1;
          return new Date(b.last_seen_at) - new Date(a.last_seen_at);
        }).slice(0, 14);
      var newRows = ((res[1] && res[1].data) || []).filter(ok).slice(0, 14);
      var photoRows = ((res[2] && res[2].data) || []).filter(function (r) { return ok(r) && ((r.photos && r.photos[0]) || r.photo_url); }).slice(0, 14);

      var so = document.getElementById("hdOnline");
      fill(so, onlineRows, function (r) { var p = visiblePresence(r); return p.text ? '<div class="presence' + (p.online ? ' is-online' : '') + '">' + p.text + "</div>" : ""; });
      if (!onlineRows.length) { so.style.display = ""; so._row.textContent = ""; var m = el("div", "hd-empty", "No matching members have been active in the last 8 hours. Check back soon, or browse everyone."); so._row.appendChild(m); }
      fill(document.getElementById("hdNew"), newRows, function (r) { return '<div class="presence" style="color:var(--gold);font-weight:600;">' + joinedAgoText(r.created_at) + "</div>"; });
      fill(document.getElementById("hdPhotos"), photoRows, function () { return ""; });
      if (typeof hydrateProfileMedia === "function") { try { hydrateProfileMedia(); } catch (e) {} }
      lastLoad = Date.now();
    } catch (e) { console.error("home discover", e); }
    loading = false;
  }

  var wasVisible = false;
  function tick() {
    if (typeof currentUser === "undefined" || !currentUser) return;
    build();
    var vis = homeVisible();
    if (vis && !wasVisible) lastLoad = 0; // refresh right away when Home opens or the tab returns
    wasVisible = vis;
    if (built && vis && Date.now() - lastLoad > 30000) load();
  }
  function init() { tick(); setInterval(tick, 3000); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
