/* Wana Dating — Google One Tap: the "Continue as <your name>" popup for visitors who are not
 * signed in, same as on the main WanaGebya site. Uses the same Google client as the main site.
 *
 * Needs (already in the page): _supabase from app.js. Loads Google's own script on demand.
 * Signing in goes through Supabase signInWithIdToken; the existing onAuthStateChange handler in
 * app.js then loads the member's profile, so nothing else has to change.
 * Fails quietly (no popup) if Google blocks it, e.g. in private mode, in-app browsers or when
 * third-party sign-in is turned off. The normal "Continue with Google" button still works.
 */
(function () {
  "use strict";

  var CLIENT_ID = "272992224183-q8enj9nbbrcno23e775fiavmc5mclvl4.apps.googleusercontent.com";
  var nonceRaw = null;

  async function makeNonce() {
    var raw = btoa(String.fromCharCode.apply(null, Array.from(crypto.getRandomValues(new Uint8Array(32)))));
    var hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    var hashed = Array.from(new Uint8Array(hash)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    return [raw, hashed];
  }

  function loadGsi() {
    return new Promise(function (resolve) {
      if (window.google && window.google.accounts && window.google.accounts.id) return resolve(true);
      var s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true; s.defer = true;
      s.onload = function () { resolve(true); };
      s.onerror = function () { resolve(false); };
      document.head.appendChild(s);
    });
  }

  async function onCredential(response) {
    try {
      var res = await _supabase.auth.signInWithIdToken({ provider: "google", token: response.credential, nonce: nonceRaw });
      if (res.error) { console.warn("Google One Tap sign-in failed:", res.error.message); return; }
      if (typeof closeModal === "function") closeModal();   // close the sign-in dialog if it was open
    } catch (e) {
      console.warn("Google One Tap error:", e);
    }
  }

  async function start() {
    try {
      if (typeof _supabase === "undefined") return;
      var s = await _supabase.auth.getSession();
      if (s && s.data && s.data.session) return;            // already signed in: no popup
      if (!(window.crypto && crypto.subtle)) return;
      if (!(await loadGsi())) return;
      var n = await makeNonce();
      nonceRaw = n[0];
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: onCredential,
        nonce: n[1],
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true
      });
      window.google.accounts.id.prompt();
    } catch (e) {
      console.warn("One Tap not started:", e);
    }
  }

  // Wait a moment so the page's own sign-in check finishes first (avoids a popup for signed-in members).
  function init() { setTimeout(start, 1500); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  // After sign-out, offer the popup again.
  if (typeof _supabase !== "undefined" && _supabase.auth && _supabase.auth.onAuthStateChange) {
    _supabase.auth.onAuthStateChange(function (ev) {
      if (ev === "SIGNED_OUT") setTimeout(start, 1500);
    });
  }
})();
