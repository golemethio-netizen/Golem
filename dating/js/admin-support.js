/* Support inbox for admin-dating.html
 *
 * Install: save next to admin-dating.html and add this line AFTER the last
 * </script> of the page (just before </body>):
 *     <script src="admin-support.js"></script>
 *
 * Adds a "Support" tab (with unread badge) and a section to the existing admin
 * navigation. Reuses the page's _supabase client, logAction() and
 * openMember360(). All message text is rendered with textContent.
 */
(function () {
  'use strict';

  var STATUS = { open: 'Needs reply', answered: 'Answered', closed: 'Closed' };
  var filter = 'open', tickets = [], cur = null, msgs = new Map(), subscribed = false, listTimer = null;

  function db() { return typeof _supabase !== 'undefined' ? _supabase : null; }

  function h(tag, attrs) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (k === 'class') e.className = v;
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) [].concat(arguments[i]).forEach(function (c) { e.append(c == null ? '' : c); });
    return e;
  }
  function fmt(iso) { return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  function who(t) { return t.user_name || t.user_email || t.user_phone || String(t.user_id).slice(0, 8); }
  function $(id) { return document.getElementById(id); }

  function injectStyles() {
    if ($('saStyles')) return;
    document.head.appendChild(h('style', { id: 'saStyles' }, [
      '.sa-grid{display:grid;grid-template-columns:minmax(260px,.8fr) 1.4fr;gap:14px;align-items:start}',
      '@media(max-width:860px){.sa-grid{grid-template-columns:1fr}}',
      '.sa-list{max-height:560px;overflow:auto}',
      '.sa-item{display:block;width:100%;text-align:left;border:1px solid var(--admin-border,#e5e7eb);background:#fff;border-radius:10px;padding:10px 12px;margin-bottom:8px;cursor:pointer;font:inherit}',
      '.sa-item:hover,.sa-item.sel{border-color:#d6b0c2;background:#fdf6f9}',
      '.sa-item .top{display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:.78rem}',
      '.sa-item .sub{font-size:.68rem;color:#8b94a2;margin-top:3px}',
      '.sa-dot{width:9px;height:9px;border-radius:50%;background:#d92d20;flex-shrink:0}',
      '.sa-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;margin-bottom:10px}',
      '.sa-thread{background:#f6f3ee;border:1px solid var(--admin-border,#e5e7eb);border-radius:10px;padding:12px;height:380px;overflow-y:auto;display:flex;flex-direction:column;gap:8px}',
      '.sa-b{max-width:78%;padding:8px 12px;border-radius:13px;font-size:.8rem;line-height:1.4;white-space:pre-wrap;overflow-wrap:anywhere}',
      '.sa-b small{display:block;font-size:.65rem;opacity:.7;margin-top:3px}',
      '.sa-b.user{align-self:flex-start;background:#fff;border:1px solid var(--admin-border,#e5e7eb)}',
      '.sa-b.admin{align-self:flex-end;background:#c2185b;color:#fff}',
      '.sa-composer{display:flex;gap:8px;margin-top:10px;align-items:flex-end}',
      '.sa-composer textarea{flex:1;resize:none;min-height:44px;padding:9px 11px;border:1px solid #dfe3e8;border-radius:8px;font:inherit;font-size:.8rem}',
      '.sa-err{color:#d92d20;font-size:.75rem;min-height:1em;margin-top:6px}'
    ].join('\n')));
  }

  /* ---------- UI scaffold ---------- */
  function mount() {
    injectStyles();
    var main = document.querySelector('main');
    var scroller = document.querySelector('.admin-tab-scroll');
    if (!main || !scroller || $('supportAdminSection')) return;

    var statusSel = h('select', { id: 'saStatus', class: 'admin-select', onchange: function () { filter = this.value; loadList(true); } },
      h('option', { value: 'open' }, 'Needs reply'), h('option', { value: 'answered' }, 'Answered'),
      h('option', { value: 'closed' }, 'Closed'), h('option', { value: 'all' }, 'All'));

    main.appendChild(h('section', { id: 'supportAdminSection', class: 'admin-section', style: 'display:none;padding:20px;' },
      h('div', { class: 'sa-head' },
        h('div', {},
          h('h3', { style: 'margin:0 0 4px;' }, h('i', { class: 'fas fa-life-ring', style: 'color:#c2185b;' }), ' Member Support Inbox'),
          h('p', { class: 'admin-card-sub', style: 'margin:0;' }, 'Messages members send from the Support tab on the dating site.'))),
      h('div', { class: 'admin-toolbar' }, statusSel,
        h('input', { id: 'saSearch', class: 'admin-input', placeholder: 'Search subject, name, email or phone…', oninput: renderList }),
        h('button', { class: 'admin-btn admin-btn-secondary', type: 'button', onclick: function () { loadList(true); } }, '↻ Refresh')),
      h('div', { class: 'sa-grid' },
        h('div', { class: 'admin-card' }, h('div', { id: 'saList', class: 'sa-list' }, h('div', { class: 'admin-empty' }, 'Loading…'))),
        h('div', { class: 'admin-card', id: 'saChat' }, h('div', { class: 'admin-empty' }, 'Select a conversation.')))));

    var btn = h('button', { class: 'tab-btn', type: 'button', id: 'supportTabBtn' },
      h('i', { class: 'fas fa-life-ring' }), ' Support ',
      h('span', { id: 'supportAdminBadge', class: 'admin-badge', style: 'display:none;' }, '0'));
    btn.setAttribute('onclick', "switchDatingTab('support', this)");   // keeps the page's tab lookups working
    var audit = Array.prototype.find.call(scroller.children, function (b) { return (b.getAttribute('onclick') || '').indexOf("'audit'") > -1; });
    if (audit) scroller.insertBefore(btn, audit); else scroller.appendChild(btn);

    if (typeof DATING_SECTIONS !== 'undefined') DATING_SECTIONS.support = 'supportAdminSection';
  }

  /* ---------- list ---------- */
  function loadList(force) {
    var c = db(); if (!c) return;
    var q = c.from('dating_support_tickets').select('*').order('last_message_at', { ascending: false }).limit(200);
    if (filter !== 'all') q = q.eq('status', filter);
    q.then(function (res) {
      if (res.error) { $('saList').replaceChildren(h('div', { class: 'sa-err' }, res.error.message)); return; }
      tickets = res.data || [];
      renderList();
      refreshBadge();
    });
  }
  function renderList() {
    var box = $('saList'); if (!box) return;
    var term = (($('saSearch') || {}).value || '').trim().toLowerCase();
    var rows = tickets.filter(function (t) {
      return !term || [t.subject, t.user_name, t.user_email, t.user_phone, t.category].some(function (v) { return (v || '').toLowerCase().indexOf(term) > -1; });
    });
    if (!rows.length) { box.replaceChildren(h('div', { class: 'admin-empty' }, 'Nothing here.')); return; }
    box.replaceChildren.apply(box, rows.map(function (t) {
      return h('button', { class: 'sa-item' + (cur && cur.id === t.id ? ' sel' : ''), type: 'button', onclick: function () { openTicket(t.id); } },
        h('div', { class: 'top' }, h('strong', {}, t.subject), t.admin_unread ? h('span', { class: 'sa-dot' }) : ''),
        h('div', { class: 'sub' }, who(t) + ' · ' + t.category + ' · ' + fmt(t.last_message_at)));
    }));
  }

  /* ---------- conversation ---------- */
  function paint() {
    var th = $('saThread'); if (!th) return;
    var items = Array.from(msgs.values()).sort(function (a, b) { return a.created_at < b.created_at ? -1 : 1; });
    th.replaceChildren.apply(th, items.map(function (m) {
      return h('div', { class: 'sa-b ' + m.sender_role }, m.body, h('small', {}, fmt(m.created_at)));
    }));
    th.scrollTop = th.scrollHeight;
  }

  function renderChat() {
    var t = cur;
    var meta = [who(t), t.user_email, t.user_phone, t.category, STATUS[t.status]]
      .filter(function (v, i, a) { return v && a.indexOf(v) === i; }).join(' · ');
    var actions = h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;' });
    if (typeof openMember360 === 'function') {
      actions.append(h('button', { class: 'admin-btn admin-btn-secondary', type: 'button', onclick: function () { openMember360(t.user_id); } }, 'Member 360'));
    }
    actions.append(h('button', { class: 'admin-btn ' + (t.status === 'closed' ? 'admin-btn-success' : 'admin-btn-secondary'), type: 'button', onclick: toggleStatus },
      t.status === 'closed' ? 'Reopen' : 'Close request'));

    var parts = [
      h('div', { class: 'sa-head' }, h('div', {}, h('strong', {}, t.subject), h('div', { class: 'admin-card-sub', style: 'margin:3px 0 0;' }, meta)), actions),
      h('div', { id: 'saThread', class: 'sa-thread' })
    ];
    if (t.status !== 'closed') {
      var ta = h('textarea', { id: 'saReply', maxlength: '2000', rows: '2', placeholder: 'Reply to the member… (Ctrl+Enter to send)' });
      ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(); });
      parts.push(h('div', { class: 'sa-composer' }, ta,
        h('button', { class: 'admin-btn admin-btn-primary', id: 'saSend', type: 'button', onclick: send }, 'Send')));
    } else {
      parts.push(h('div', { class: 'admin-card-sub', style: 'margin-top:10px;' }, 'This request is closed. Reopen it to reply.'));
    }
    parts.push(h('div', { id: 'saErr', class: 'sa-err' }));
    $('saChat').replaceChildren.apply($('saChat'), parts);
    paint();
  }

  function openTicket(id) {
    var c = db(); if (!c) return;
    cur = tickets.filter(function (t) { return t.id === id; })[0] || null;
    if (!cur) return;
    msgs = new Map();
    renderChat(); renderList();
    c.from('dating_support_messages').select('id,ticket_id,sender_role,body,created_at')
      .eq('ticket_id', id).order('created_at').limit(500).then(function (res) {
        if (res.error) { $('saErr').textContent = res.error.message; return; }
        res.data.forEach(function (m) { msgs.set(m.id, m); });
        paint();
        c.rpc('dating_support_mark_read', { p_ticket: id }).then(function () { cur.admin_unread = false; renderList(); refreshBadge(); });
      });
  }

  function send() {
    var c = db(), ta = $('saReply'), btn = $('saSend');
    if (!c || !cur || !ta) return;
    var text = ta.value.trim(); if (!text) return;
    btn.disabled = true; $('saErr').textContent = '';
    var ticketId = cur.id;
    c.auth.getUser().then(function (u) {
      return c.from('dating_support_messages')
        .insert({ ticket_id: ticketId, sender_id: u.data.user.id, sender_role: 'admin', body: text })
        .select('id,ticket_id,sender_role,body,created_at').single();
    }).then(function (res) {
      btn.disabled = false;
      if (res.error) { $('saErr').textContent = res.error.message; return; }
      msgs.set(res.data.id, res.data); ta.value = ''; paint();
      if (cur && cur.status !== 'closed') cur.status = 'answered';
      if (typeof logAction === 'function') logAction('Support Reply', 'Ticket ID: ' + ticketId);
      loadList();
    });
  }

  function toggleStatus() {
    var c = db(); if (!c || !cur) return;
    var next = cur.status === 'closed' ? 'open' : 'closed';
    c.from('dating_support_tickets').update({ status: next }).eq('id', cur.id).select().single().then(function (res) {
      if (res.error) { $('saErr').textContent = res.error.message; return; }
      cur = res.data;
      if (typeof logAction === 'function') logAction(next === 'closed' ? 'Support Request Closed' : 'Support Request Reopened', 'Ticket ID: ' + cur.id);
      renderChat(); loadList();
    });
  }

  /* ---------- badge + realtime ---------- */
  function refreshBadge() {
    var c = db(), b = $('supportAdminBadge'); if (!c || !b) return;
    c.from('dating_support_tickets').select('id', { count: 'exact', head: true }).eq('admin_unread', true).then(function (res) {
      var n = res.count || 0;
      b.textContent = n; b.style.display = n > 0 ? 'inline-block' : 'none';
    });
  }
  function subscribe() {
    var c = db(); if (!c || subscribed) return;
    subscribed = true;
    c.channel('support-admin-inbox')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dating_support_messages' }, function (p) {
        var m = p.new; if (!m) return;
        if (cur && m.ticket_id === cur.id && !msgs.has(m.id)) {
          msgs.set(m.id, m); paint();
          if (m.sender_role === 'user') c.rpc('dating_support_mark_read', { p_ticket: cur.id });
        }
        clearTimeout(listTimer);
        listTimer = setTimeout(function () { loadList(); }, 400);
      }).subscribe();
  }

  /* ---------- hook into the page's existing admin functions ---------- */
  function wrap(name, after) {
    var orig = window[name];
    if (typeof orig !== 'function' || orig.__sa) return;
    window[name] = function () {
      var r = orig.apply(this, arguments);
      try { after.apply(this, arguments); } catch (e) { console.error('support inbox:', e); }
      return r;
    };
    window[name].__sa = true;
  }

  function init() {
    mount();
    wrap('switchDatingTab', function (tab) { if (tab === 'support') loadList(true); });
    wrap('refreshDatingBadges', function () { refreshBadge(); subscribe(); });
    wrap('refreshCurrentAdminView', function () {
      var a = document.querySelector('.tab-btn.active');
      if (a && a.id === 'supportTabBtn') loadList(true);
    });
  }
  // Run immediately when loaded at the end of <body> (so the wrappers are in place before
  // the page's own DOMContentLoaded handler starts refreshing badges); otherwise wait for the DOM.
  if (document.querySelector('.admin-tab-scroll') && document.querySelector('main')) init();
  else document.addEventListener('DOMContentLoaded', init);
})();

