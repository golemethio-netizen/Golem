/* Wana Dating — Support chat (member side)
 *
 * Install: save as dating/js/support.js and add this line to dating/index.html,
 * AFTER js/app.js:   <script src="js/support.js"></script>
 *
 * It adds a "Support" tab to the sidebar and its own panel automatically.
 * Requires support-setup.sql to have been run in Supabase.
 * All user text is rendered with textContent (no innerHTML) to stay XSS-safe.
 */
(function () {
  'use strict';

  var CATEGORIES = ['Account & sign-in', 'Report a member / safety', 'Gifts & payments',
                    'Bug or technical problem', 'Feedback', 'Other'];
  var STATUS = { open: 'Waiting for reply', answered: 'Answered', closed: 'Closed' };

  /* ---------- Supabase client: reuse the one app.js already created ---------- */
  var _client = null;
  function client() {
    if (_client) return _client;
    var guesses = [
      function () { return typeof _supabase !== 'undefined' ? _supabase : null; },
      function () { return typeof sb !== 'undefined' ? sb : null; },
      function () { return typeof supabaseClient !== 'undefined' ? supabaseClient : null; },
      function () { return typeof supabase !== 'undefined' ? supabase : null; },
      function () { return typeof db !== 'undefined' ? db : null; },
      function () { return window.supabaseClient || window.sb || null; }
    ];
    for (var i = 0; i < guesses.length; i++) {
      try {
        var c = guesses[i]();
        if (c && typeof c.from === 'function' && c.auth) return (_client = c);
      } catch (e) { /* try next */ }
    }
    // Fallback: build one from config.js globals (adjust names if yours differ)
    if (window.supabase && window.supabase.createClient &&
        typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
      return (_client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
    }
    return null;
  }

  /* ---------- tiny DOM helper (text only, never HTML) ---------- */
  function h(tag, attrs) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (k === 'class') e.className = v;
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) {
      [].concat(arguments[i]).forEach(function (c) { e.append(c == null ? '' : c); });
    }
    return e;
  }
  function fmt(iso) {
    return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  /* ---------- state ---------- */
  var uid = null, channel = null, panel = null, root = null, rail = null;
  var view = 'list', ticket = null, msgs = new Map(), threadEl = null, active = false;

  /* ---------- styles ---------- */
  function injectStyles() {
    if (document.getElementById('supStyles')) return;
    var css = [
      '#supportPanel{max-width:760px}',
      '.sup-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;flex-wrap:wrap}',
      '.sup-head h2{margin:0}',
      '.sup-head .sup-title{font-weight:700;font-size:1.05rem;overflow:hidden;text-overflow:ellipsis}',
      '.sup-primary{background:var(--green,#078930);color:#fff;border:0;border-radius:20px;padding:9px 20px;font-weight:700;cursor:pointer}',
      '.sup-primary[disabled]{opacity:.6;cursor:default}',
      '.sup-ghost{background:none;border:1px solid var(--line,#ddd);color:#555;border-radius:20px;padding:8px 16px;cursor:pointer}',
      '.sup-intro{font-size:.9rem;color:#666;margin:0 0 14px}',
      '.sup-list{display:flex;flex-direction:column;gap:10px}',
      '.sup-item{display:block;width:100%;text-align:left;background:#fff;border:1px solid var(--line,#ddd);border-radius:12px;padding:14px 16px;cursor:pointer;font:inherit}',
      '.sup-item:hover{border-color:var(--green,#078930)}',
      '.sup-item-top{display:flex;justify-content:space-between;align-items:center;gap:8px}',
      '.sup-item-sub{font-size:.8rem;color:#777;margin-top:4px}',
      '.sup-dot{width:10px;height:10px;border-radius:50%;background:#DA121A;flex-shrink:0}',
      '.sup-empty,.sup-loading{padding:28px 10px;text-align:center;color:#777}',
      '.sup-form{background:#fff;border:1px solid var(--line,#ddd);border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:12px}',
      '.sup-form label{font-size:.85rem;font-weight:600;color:#333;display:block;margin-bottom:4px}',
      '.sup-form input,.sup-form select,.sup-form textarea,.sup-composer textarea{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--line,#ddd);border-radius:8px;font:inherit;outline:none}',
      '.sup-msg{font-size:.85rem;min-height:1.2em}',
      '.sup-msg.err{color:#DA121A}',
      '.sup-thread{background:var(--paper,#f6f3ee);border:1px solid var(--line,#ddd);border-radius:12px;padding:14px;height:min(55vh,460px);overflow-y:auto;display:flex;flex-direction:column;gap:8px}',
      '.sup-bub{max-width:80%;padding:9px 13px;border-radius:14px;font-size:.92rem;line-height:1.4;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:anywhere}',
      '.sup-bub small{display:block;font-size:.7rem;opacity:.7;margin-top:4px}',
      '.sup-bub.me{align-self:flex-end;background:var(--green,#078930);color:#fff;border-bottom-right-radius:4px}',
      '.sup-bub.admin{align-self:flex-start;background:#fff;color:#222;border:1px solid var(--line,#ddd);border-bottom-left-radius:4px}',
      '.sup-composer{display:flex;gap:8px;margin-top:10px;align-items:flex-end}',
      '.sup-composer textarea{resize:none;min-height:44px}',
      '.sup-closed{margin-top:10px;font-size:.88rem;color:#777;text-align:center}',
      '.sup-badge{display:inline-block;min-width:18px;padding:0 6px;border-radius:9px;background:#DA121A;color:#fff;font-size:.7rem;font-weight:700;text-align:center;margin-left:6px}',
      '.sup-badge:empty{display:none}'
    ].join('\n');
    document.head.appendChild(h('style', { id: 'supStyles' }, css));
  }

  /* ---------- panel + sidebar tab ---------- */
  function mount() {
    injectStyles();
    var main = document.querySelector('main') || document.body;
    panel = document.getElementById('supportPanel');
    if (!panel) {
      panel = h('div', { class: 'panel', id: 'supportPanel', style: 'display:none;' },
        h('div', { class: 'browse-header' },
          h('h2', {}, 'Contact ', h('span', {}, 'Support')),
          h('p', {}, 'Questions, problems or feedback? Message the Wana team and we will reply here.')),
        (root = h('div', { id: 'supportRoot' })));
      main.appendChild(panel);
    } else {
      root = document.getElementById('supportRoot');
    }
    rail = document.getElementById('rightMatchRail');

    var nav = document.querySelector('.side-nav');
    if (nav && !nav.querySelector('[data-tab="support"]')) {
      var tab = h('div', { class: 'tab', 'data-tab': 'support', onclick: open },
        h('span', { class: 'side-icon' }, '🛟'), ' Support ', h('span', { id: 'supportBadge', class: 'sup-badge' }));
      var safety = nav.querySelector('[data-tab="safety"]');
      if (safety) safety.after(tab); else nav.appendChild(tab);
    }
  }

  function activate() {
    document.querySelectorAll('.panel').forEach(function (p) { p.style.display = 'none'; });
    var gate = document.getElementById('gate'); if (gate) gate.style.display = 'none';
    document.querySelectorAll('.side-nav .tab').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-tab') === 'support');
    });
    if (rail && !active) { rail.dataset.sup = rail.style.display; rail.style.display = 'none'; }
    document.querySelectorAll('.mnav-item').forEach(function (t) { t.classList.toggle('active', t.id === 'mnavMore'); });
    panel.style.display = 'block';
    window.scrollTo(0, 0);
    active = true;
  }
  function leave() {
    if (!active) return;
    active = false;
    panel.style.display = 'none';
    if (rail && rail.dataset.sup !== undefined) { rail.style.display = rail.dataset.sup; delete rail.dataset.sup; }
  }
  function hookTabs() {
    if (typeof window.switchTab === 'function' && !window.switchTab.__sup) {
      var orig = window.switchTab;
      window.switchTab = function (name) {
        if (name === 'support') return open();
        leave();
        return orig.apply(this, arguments);
      };
      window.switchTab.__sup = true;
    } else if (!window.switchTab) {
      document.addEventListener('click', function (e) {
        var t = e.target.closest && e.target.closest('.tab');
        if (t && t.getAttribute('data-tab') !== 'support') leave();
      });
    }
  }

  /* ---------- views ---------- */
  function fail(err) {
    root.replaceChildren(h('div', { class: 'sup-empty' }, 'Something went wrong: ' + ((err && err.message) || 'please try again.')),
      h('button', { class: 'sup-ghost', type: 'button', onclick: showList }, 'Retry'));
  }

  function showList() {
    view = 'list'; ticket = null; threadEl = null;
    root.replaceChildren(h('div', { class: 'sup-loading' }, 'Loading…'));
    client().from('dating_support_tickets')
      .select('id,subject,category,status,user_unread,last_message_at')
      .eq('user_id', uid).order('last_message_at', { ascending: false }).limit(50)
      .then(function (res) {
        if (view !== 'list') return;
        if (res.error) return fail(res.error);
        var list = h('div', { class: 'sup-list' });
        if (!res.data.length) list.append(h('div', { class: 'sup-empty' }, 'No requests yet. Tap “New request” to contact the Wana team.'));
        res.data.forEach(function (t) {
          list.append(h('button', { class: 'sup-item', type: 'button', onclick: function () { showChat(t.id); } },
            h('div', { class: 'sup-item-top' }, h('strong', {}, t.subject), t.user_unread ? h('span', { class: 'sup-dot' }) : ''),
            h('div', { class: 'sup-item-sub' }, t.category + ' · ' + STATUS[t.status] + ' · ' + fmt(t.last_message_at))));
        });
        root.replaceChildren(
          h('div', { class: 'sup-head' }, h('strong', {}, 'Your requests'),
            h('button', { class: 'sup-primary', type: 'button', onclick: showNew }, '+ New request')),
          list);
      });
  }

  function showNew() {
    view = 'new'; ticket = null; threadEl = null;
    var cat = h('select', {}, CATEGORIES.map(function (c) { return h('option', { value: c }, c); }));
    var subj = h('input', { type: 'text', maxlength: '120', placeholder: 'Short summary of your issue' });
    var body = h('textarea', { maxlength: '2000', rows: '6', placeholder: 'Tell us what happened…' });
    var msg = h('div', { class: 'sup-msg' });
    var send = h('button', { class: 'sup-primary', type: 'button' }, 'Send to support');

    send.addEventListener('click', function () {
      var s = subj.value.trim(), b = body.value.trim();
      msg.className = 'sup-msg err';
      if (s.length < 3) { msg.textContent = 'Please add a short subject.'; return; }
      if (!b) { msg.textContent = 'Please describe your problem or question.'; return; }
      send.disabled = true; msg.className = 'sup-msg'; msg.textContent = 'Sending…';
      var nameEl = document.getElementById('menuName');
      client().rpc('dating_support_create_ticket', {
        p_subject: s, p_category: cat.value, p_body: b,
        p_name: nameEl ? nameEl.textContent.trim().slice(0, 60) : null
      }).then(function (res) {
        if (res.error) {
          send.disabled = false; msg.className = 'sup-msg err'; msg.textContent = res.error.message; return;
        }
        showChat(res.data);
      });
    });

    root.replaceChildren(
      h('div', { class: 'sup-head' }, h('button', { class: 'sup-ghost', type: 'button', onclick: showList }, '← Back'), h('strong', {}, 'New request')),
      h('div', { class: 'sup-form' },
        h('div', {}, h('label', {}, 'Topic'), cat),
        h('div', {}, h('label', {}, 'Subject'), subj),
        h('div', {}, h('label', {}, 'Message'), body),
        h('div', {}, send), msg));
  }

  function paint() {
    if (!threadEl) return;
    var items = Array.from(msgs.values()).sort(function (a, b) { return a.created_at < b.created_at ? -1 : 1; });
    threadEl.replaceChildren.apply(threadEl, items.map(function (m) {
      return h('div', { class: 'sup-bub ' + (m.sender_role === 'user' ? 'me' : 'admin') },
        m.body, h('small', {}, (m.sender_role === 'admin' ? 'Wana Support · ' : '') + fmt(m.created_at)));
    }));
    threadEl.scrollTop = threadEl.scrollHeight;
  }

  function showChat(id) {
    view = 'chat'; ticket = null; msgs = new Map(); threadEl = null;
    root.replaceChildren(h('div', { class: 'sup-loading' }, 'Loading…'));
    var c = client();
    Promise.all([
      c.from('dating_support_tickets').select('id,subject,category,status').eq('id', id).eq('user_id', uid).single(),
      c.from('dating_support_messages').select('id,ticket_id,sender_role,body,created_at').eq('ticket_id', id).order('created_at').limit(500)
    ]).then(function (r) {
      var t = r[0], m = r[1];
      if (t.error || m.error) return fail(t.error || m.error);
      ticket = t.data;
      m.data.forEach(function (x) { msgs.set(x.id, x); });

      threadEl = h('div', { class: 'sup-thread' });
      var bottom;
      if (ticket.status === 'closed') {
        bottom = h('div', { class: 'sup-closed' }, 'This request is closed. ',
          h('a', { href: '#', onclick: function (e) { e.preventDefault(); showNew(); } }, 'Start a new request'));
      } else {
        var ta = h('textarea', { maxlength: '2000', rows: '1', placeholder: 'Write a message…' });
        var btn = h('button', { class: 'sup-primary', type: 'button' }, 'Send');
        var err = h('div', { class: 'sup-msg err' });
        var doSend = function () {
          var text = ta.value.trim();
          if (!text) return;
          btn.disabled = true; err.textContent = '';
          c.from('dating_support_messages')
            .insert({ ticket_id: ticket.id, sender_id: uid, sender_role: 'user', body: text })
            .select('id,ticket_id,sender_role,body,created_at').single()
            .then(function (res) {
              btn.disabled = false;
              if (res.error) { err.textContent = res.error.message; return; }
              msgs.set(res.data.id, res.data); ta.value = ''; paint();
            });
        };
        btn.addEventListener('click', doSend);
        ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) doSend(); });
        bottom = h('div', {}, h('div', { class: 'sup-composer' }, ta, btn), err);
      }

      root.replaceChildren(
        h('div', { class: 'sup-head' },
          h('button', { class: 'sup-ghost', type: 'button', onclick: showList }, '← Back'),
          h('span', { class: 'sup-title' }, ticket.subject),
          h('span', { class: 'sup-item-sub' }, STATUS[ticket.status])),
        threadEl, bottom);
      paint();
      c.rpc('dating_support_mark_read', { p_ticket: ticket.id }).then(refreshBadge);
    });
  }

  /* ---------- badge + realtime ---------- */
  function refreshBadge() {
    var b = document.getElementById('supportBadge');
    if (!b || !uid || !client()) return;
    client().from('dating_support_tickets').select('id', { count: 'exact', head: true })
      .eq('user_id', uid).eq('user_unread', true)
      .then(function (res) {
        var n = res.count ? String(res.count) : '';
        b.textContent = n;
        var mb = document.getElementById('supportMoreBadge'); if (mb) mb.textContent = n;
      });
  }

  function onInsert(payload) {
    var m = payload.new;
    if (!m) return;
    if (ticket && m.ticket_id === ticket.id && view === 'chat') {
      if (!msgs.has(m.id)) {
        msgs.set(m.id, m); paint();
        if (m.sender_role === 'admin') client().rpc('dating_support_mark_read', { p_ticket: ticket.id }).then(refreshBadge);
      }
      return;
    }
    if (m.sender_role === 'admin') {
      refreshBadge();
      if (active && view === 'list') showList();
    }
  }

  function start(userId) {
    stop();
    uid = userId;
    channel = client().channel('support-user-' + uid)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dating_support_messages' }, onInsert)
      .subscribe();
    refreshBadge();
  }
  function stop() {
    if (channel && client()) client().removeChannel(channel);
    channel = null; uid = null;
    var b = document.getElementById('supportBadge'); if (b) b.textContent = '';
  }

  /* ---------- public entry points ---------- */
  function open() {
    var c = client();
    if (!c) { alert('Support is not available right now.'); return; }
    c.auth.getSession().then(function (res) {
      var s = res.data && res.data.session;
      if (!s) { if (typeof openAuthModal === 'function') openAuthModal('signin'); return; }
      if (uid !== s.user.id) start(s.user.id);
      activate();
      showList();
    });
  }
  function openNew() {
    var c = client();
    if (!c) return;
    c.auth.getSession().then(function (res) {
      var s = res.data && res.data.session;
      if (!s) { if (typeof openAuthModal === 'function') openAuthModal('signin'); return; }
      if (uid !== s.user.id) start(s.user.id);
      activate(); showNew();
    });
  }
  window.WanaSupport = { open: open, openNew: openNew };

  /* ---------- boot ---------- */
  function boot(tries) {
    var c = client();
    if (!c) { if (tries < 20) setTimeout(function () { boot(tries + 1); }, 250); return; }
    c.auth.getSession().then(function (res) {
      if (res.data && res.data.session) start(res.data.session.user.id);
    });
    c.auth.onAuthStateChange(function (event, session) {
      // defer: don't call supabase methods synchronously inside this callback
      setTimeout(function () {
        if (session && session.user) { if (session.user.id !== uid) start(session.user.id); }
        else { stop(); leave(); }
      }, 0);
    });
  }

  function init() { mount(); hookTabs(); boot(0); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
