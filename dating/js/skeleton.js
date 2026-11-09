/* Wana Dating — gray placeholder cards while Browse loads (instead of a blank screen). Wraps loadProfiles(); fails quietly. */
(function () {
  "use strict";
  var loading = false, count = 8;
  function grid() { return document.getElementById("grid"); }
  function skelHtml() {
    var h = "";
    for (var i = 0; i < count; i++) h += '<div class="wg-skel" aria-hidden="true"><div class="wg-skel-photo"></div><div class="wg-skel-line"></div><div class="wg-skel-line short"></div></div>';
    return h;
  }
  function sync() {
    var g = grid(); if (!g) return;
    var real = [].some.call(g.children, function (c) { return !c.classList.contains("wg-skel"); });
    var hasSkel = !!g.querySelector(".wg-skel");
    if (real && hasSkel) { [].forEach.call(g.querySelectorAll(".wg-skel"), function (n) { n.remove(); }); }
    else if (!real && loading && !hasSkel) { g.insertAdjacentHTML("beforeend", skelHtml()); g.setAttribute("aria-busy", "true"); }
    if (!loading || real) g.removeAttribute("aria-busy");
  }
  var obs = null;
  function start() {
    var g = grid(); if (!g) return;
    loading = true;
    if (!obs) { obs = new MutationObserver(sync); obs.observe(g, { childList: true }); }
    sync();
  }
  function stop() {
    loading = false; var g = grid();
    if (g) { [].forEach.call(g.querySelectorAll(".wg-skel"), function (n) { n.remove(); }); g.removeAttribute("aria-busy"); }
  }
  function wrap() {
    if (typeof window.loadProfiles !== "function" || window.loadProfiles.__skel) return;
    var orig = window.loadProfiles;
    window.loadProfiles = function () {
      var r; try { start(); r = orig.apply(this, arguments); } catch (e) { stop(); throw e; }
      return Promise.resolve(r).then(function (v) { stop(); return v; }, function (e) { stop(); throw e; });
    };
    window.loadProfiles.__skel = true;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wrap); else wrap();
})();
