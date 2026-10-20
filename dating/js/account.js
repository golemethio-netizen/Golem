/* Wana Dating — account control: pause profile, download my data, delete my dating account.
 *
 * Adds a "Your Account" card to the Privacy Settings tab.
 * Requires dating-migration-v45-account-control.sql.
 * Uses globals from app.js: _supabase, currentUser, myProfile, fetchMyProfile, esc, signOut.
 * User-visible text is set with textContent (no innerHTML with data).
 */
(function () {
  "use strict";

  var BUCKETS = ["dating-profile-photos", "dating-post-media", "dating-voice-messages", "dating-verification"];
  var card, pauseBtn, pauseNote, msg;

  function el(tag, props, children) {
    var e = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === "style") e.style.cssText = props[k];
      else if (k === "text") e.textContent = props[k];
      else if (k.indexOf("on") === 0) e.addEventListener(k.slice(2), props[k]);
      else e.setAttribute(k, props[k]);
    });
    (children || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }

  var BOX = "background:#fff;border:1px solid var(--line);border-radius:12px;padding:20px;margin-bottom:20px;box-shadow:0 4px 10px rgba(0,0,0,0.03);";
  var BTN = "width:auto;padding:10px 22px;margin:6px 8px 0 0;border-radius:8px;cursor:pointer;font-weight:600;font-family:inherit;";

  function say(text, ok) {
    if (!msg) return;
    msg.textContent = text || "";
    msg.style.color = ok ? "#1b7f3b" : "#b3261e";
  }

  function paintPause() {
    if (!pauseBtn) return;
    var paused = !!(typeof myProfile !== "undefined" && myProfile && myProfile.is_paused);
    pauseBtn.textContent = paused ? "Resume my profile" : "Pause my profile";
    pauseNote.textContent = paused
      ? "Your profile is paused: new people can't see you in Browse. Your existing matches and chats still work."
      : "Hide your profile from Browse without deleting anything. You can resume at any time.";
  }

  async function togglePause() {
    if (!currentUser) return;
    if (!myProfile) { say("Set up your profile first.", false); return; }
    var next = !myProfile.is_paused;
    pauseBtn.disabled = true; say("");
    var res = await _supabase.from("dating_profiles").update({ is_paused: next }).eq("user_id", currentUser.id).select("is_paused").maybeSingle();
    pauseBtn.disabled = false;
    if (res.error) {
      say(/is_paused|schema cache/i.test(res.error.message || "")
        ? "Pausing isn't available yet. Please contact Support."
        : "Couldn't update: " + res.error.message, false);
      return;
    }
    myProfile.is_paused = next;
    paintPause();
    say(next ? "Profile paused." : "Profile is visible again.", true);
  }

  async function exportData() {
    say("Preparing your data…", true);
    var res = await _supabase.rpc("dating_export_my_data");
    if (res.error) {
      say(/does not exist|schema cache/i.test(res.error.message || "")
        ? "Data export isn't available yet. Please contact Support."
        : "Couldn't export: " + res.error.message, false);
      return;
    }
    var blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "wana-dating-my-data-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    say("Your data was downloaded.", true);
  }

  // Remove the member's uploaded files (Supabase only allows this through the Storage API).
  async function removeMyFiles() {
    var prefix = currentUser.id + "-";
    for (var i = 0; i < BUCKETS.length; i++) {
      try {
        var store = _supabase.storage.from(BUCKETS[i]);
        var names = [];
        for (var offset = 0; offset < 2000; offset += 100) {
          var l = await store.list("", { limit: 100, offset: offset, search: currentUser.id });
          if (l.error || !l.data || !l.data.length) break;
          l.data.forEach(function (f) { if (f.name && f.name.indexOf(prefix) === 0) names.push(f.name); });
          if (l.data.length < 100) break;
        }
        for (var j = 0; j < names.length; j += 50) await store.remove(names.slice(j, j + 50));
      } catch (e) { console.warn("File cleanup skipped for", BUCKETS[i], e); }
    }
  }

  async function deleteAccount() {
    if (!currentUser) return;
    var typed = prompt(
      "This permanently deletes your dating profile, photos, messages, likes, matches and posts. " +
      "Your WanaGebya login stays active.\n\nThis cannot be undone. Type DELETE to confirm.");
    if (typed === null) return;
    if (String(typed).trim() !== "DELETE") { say("Not deleted: you must type DELETE exactly.", false); return; }
    say("Deleting… please wait.", true);
    await removeMyFiles();
    var res = await _supabase.rpc("dating_delete_my_account");
    if (res.error) {
      say(/does not exist|schema cache/i.test(res.error.message || "")
        ? "Deleting isn't available yet. Please contact Support."
        : "Couldn't delete: " + res.error.message, false);
      return;
    }
    alert("Your dating account was deleted.");
    try { if (typeof signOut === "function") await signOut(); } catch (e) {}
    location.reload();
  }

  function mount() {
    var panel = document.getElementById("settingsPanel");
    if (!panel || document.getElementById("accountControlCard")) return;
    pauseBtn = el("button", { type: "button", class: "submit-btn", style: BTN, onclick: togglePause, text: "Pause my profile" });
    pauseNote = el("p", { style: "font-size:.85rem;color:#666;margin:0 0 6px;" });
    msg = el("div", { style: "margin-top:10px;font-size:.9rem;min-height:1.2em;", role: "status" });
    card = el("div", { id: "accountControlCard", style: BOX }, [
      el("h3", { style: "margin-top:0;", text: "Your Account" }),
      pauseNote, pauseBtn,
      el("p", { style: "font-size:.85rem;color:#666;margin:18px 0 6px;", text: "Download a copy of the data we hold about you (profile, messages, likes, matches, posts)." }),
      el("button", { type: "button", class: "submit-btn", style: BTN + "background:var(--paper);color:var(--ink,#222);border:1px solid var(--line);", onclick: exportData, text: "Download my data" }),
      el("p", { style: "font-size:.85rem;color:#666;margin:18px 0 6px;", text: "Delete your dating profile, photos and messages permanently." }),
      el("button", { type: "button", style: BTN + "background:#b3261e;color:#fff;border:0;", onclick: deleteAccount, text: "Delete my dating account" }),
      msg
    ]);
    var blocked = document.getElementById("blockedUsersList");
    var anchor = blocked && blocked.parentElement;
    if (anchor && anchor.parentElement === panel) panel.insertBefore(card, anchor); else panel.appendChild(card);
    paintPause();
  }

  function init() {
    mount();
    if (typeof window.loadSettings === "function" && !window.loadSettings.__acct) {
      var orig = window.loadSettings;
      window.loadSettings = async function () {
        var r = await orig.apply(this, arguments);
        mount(); paintPause();
        return r;
      };
      window.loadSettings.__acct = true;
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
