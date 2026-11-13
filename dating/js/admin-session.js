/* Admin session limits: signs an admin out after inactivity and after a maximum session length.
   Runs in the browser, so it is a safety net for unattended screens; the Supabase project's own
   session settings are the hard limit. */
(function(){
  var IDLE_MS = 15 * 60 * 1000;     // sign out after 15 minutes without activity
  var WARN_MS = 60 * 1000;          // warn during the last minute
  var MAX_MS  = 8 * 60 * 60 * 1000; // never stay signed in longer than 8 hours on an admin page
  var K_LAST = 'wana_admin_last', K_START = 'wana_admin_start';
  function get(k){ try { return parseInt(localStorage.getItem(k) || '0', 10) || 0; } catch(e){ return 0; } }
  function set(k, v){ try { localStorage.setItem(k, String(v)); } catch(e){} }
  function clear(){ try { localStorage.removeItem(K_LAST); localStorage.removeItem(K_START); } catch(e){} }
  var banner, started = false, lastWrite = 0;

  function signOut(reason){
    clear();
    try { sessionStorage.setItem('wana_admin_signout_reason', reason); } catch(e){}
    var done = function(){ location.reload(); };
    try { _supabase.auth.signOut().then(done, done); } catch(e){ done(); }
  }
  function ensureBanner(){
    if (banner) return banner;
    banner = document.createElement('div');
    banner.setAttribute('role', 'alert');
    banner.style.cssText = 'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:99999;background:#1f2937;color:#fff;padding:12px 16px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.3);font:600 14px system-ui,sans-serif;display:none;align-items:center;gap:12px;max-width:92vw';
    banner.innerHTML = '<span id="wanaAdminWarnText"></span><button type="button" style="background:#10b981;color:#fff;border:0;border-radius:8px;padding:7px 12px;font-weight:700;cursor:pointer">Stay signed in</button>';
    banner.querySelector('button').onclick = function(){ touch(true); };
    document.body.appendChild(banner);
    return banner;
  }
  function touch(force){
    var now = Date.now();
    if (!force && now - lastWrite < 5000) return; // don't hammer storage
    lastWrite = now; set(K_LAST, now);
    if (banner) banner.style.display = 'none';
  }
  function tick(){
    var now = Date.now(), last = get(K_LAST) || now, start = get(K_START) || now;
    if (now - start > MAX_MS) return signOut('Your admin session reached its 8-hour limit. Please sign in again.');
    var left = IDLE_MS - (now - last);
    if (left <= 0) return signOut('You were signed out after 15 minutes of inactivity.');
    if (left <= WARN_MS){
      var b = ensureBanner(); b.style.display = 'flex';
      b.querySelector('#wanaAdminWarnText').textContent = 'Signing out in ' + Math.ceil(left/1000) + 's for security';
    } else if (banner) banner.style.display = 'none';
  }
  function begin(){
    if (started) return; started = true;
    var now = Date.now(), last = get(K_LAST), start = get(K_START);
    // Returning after being away longer than the limit: end the old session right away.
    if (last && now - last > IDLE_MS) return signOut('You were signed out after 15 minutes of inactivity.');
    if (!start || now - start > MAX_MS) set(K_START, now);
    touch(true);
    ['mousemove','keydown','click','scroll','touchstart'].forEach(function(ev){ window.addEventListener(ev, function(){ touch(false); }, {passive:true}); });
    setInterval(tick, 1000);
    document.addEventListener('visibilitychange', function(){ if (!document.hidden) tick(); });
  }
  function showReason(){
    try {
      var r = sessionStorage.getItem('wana_admin_signout_reason');
      if (!r) return; sessionStorage.removeItem('wana_admin_signout_reason');
      var d = document.createElement('div');
      d.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:99999;background:#fff7ed;color:#9a3412;border:1px solid #fdba74;padding:10px 14px;border-radius:10px;font:600 14px system-ui,sans-serif;max-width:92vw';
      d.textContent = r; document.body.appendChild(d); setTimeout(function(){ d.remove(); }, 8000);
    } catch(e){}
  }
  function init(){
    showReason();
    if (typeof _supabase === 'undefined') return;
    _supabase.auth.getSession().then(function(r){ if (r && r.data && r.data.session) begin(); });
    _supabase.auth.onAuthStateChange(function(ev, session){
      if (ev === 'SIGNED_IN' && session && !started) begin();
      if (ev === 'SIGNED_OUT') clear();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
