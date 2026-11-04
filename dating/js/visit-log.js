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
