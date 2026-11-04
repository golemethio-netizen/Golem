/* Wana Dating — anonymous visit counter for the admin "Site Reach" numbers.
 * Same idea as the marketplace (script.js): one random id per browser (shared with the marketplace, since both
 * live on www.wanagebya.com), one row per page load in site_visits. No cookies, no personal data. */
(function () {
  try {
    if (typeof _supabase === "undefined") return;
    var KEY = "wg_visitor_id", id = localStorage.getItem(KEY);
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : "v-" + Date.now() + "-" + Math.random().toString(36).slice(2));
      localStorage.setItem(KEY, id);
    }
    _supabase.from("site_visits").insert([{
      visitor_id: id, page: location.pathname,
      referrer: document.referrer || null, user_agent: navigator.userAgent
    }]).then(function () {}, function () {});
  } catch (e) { /* analytics must never break the page */ }
})();

/* Brand-new accounts (created in the last 10 minutes, e.g. Google sign-ups) with no "signup_source" yet are tagged "dating".
 * Old accounts are never re-tagged. Runs shortly after load and again after sign-in. */
(function () {
  async function tag() {
    try {
      if (typeof _supabase === "undefined") return;
      var r = await _supabase.auth.getUser(), u = r && r.data && r.data.user;
      if (!u || (u.user_metadata && u.user_metadata.signup_source)) return;
      if (Date.now() - new Date(u.created_at).getTime() > 10 * 60 * 1000) return;
      await _supabase.auth.updateUser({ data: { signup_source: "dating" } });
    } catch (e) {}
  }
  setTimeout(tag, 2500);
  try { _supabase.auth.onAuthStateChange(function (ev) { if (ev === "SIGNED_IN") setTimeout(tag, 1500); }); } catch (e) {}
})();
